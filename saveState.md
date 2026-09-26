# Interfaz de guardado F9 (save states) — guía de replicación

> Cómo replicar en otro proyecto la interfaz de guardado que se abre con F9:
> guardar en slots, cargar con continuar automático, eliminar estados, volumen
> y salida limpia — todo con el juego pausado en caliente, sin mostrar jamás
> la interfaz de RetroArch.
> Idioma de UI/mensajes: español.

---

## 1. Qué se replica

Un overlay que se abre con **F9** sobre el juego en ejecución con estas secciones:

- 💾 **Guardar partida**: elegir slot (1-5) + botón Guardar, con **aviso inline antes de pisar** un slot ocupado (Confirmar / Cancelar).
- 📂 **Cargar partida**: grilla de 5 slots con thumbnail + fecha; **Cargar reanuda el juego solo** (cierra el overlay y despausa, sin paso manual extra); ✕ elimina.
- 🔊 Volumen del juego (slider relativo + mute).
- ⏻ Salir del juego (salida limpia y automática).

---

## 2. Principio arquitectónico (lo más importante)

RetroArch trabaja siempre en **slot fijo**: con `savestate_auto_index = "false"`,
el `SAVE_STATE` manual escribe siempre `{rom}.state` en un directorio propio
(`data/ra_states/`). La app **nunca toca los slots numerados de RetroArch**:
copia ese archivo fijo a su biblioteca propia:

```
data/savestates/{game_id}/slot_1.state … slot_5.state (+ .png thumbnails)
```

- **Guardar** = pedirle a RetroArch que escriba su slot fijo → detectar el archivo
  fresco → copiarlo al slot elegido.
- **Cargar en caliente** = copiar el slot al path activo → mandar `LOAD_STATE`.
- **Cargar en frío** (juego parado) = copiar el slot como `{stem}.state.auto` →
  `savestate_auto_load` lo levanta al iniciar → lanzar el juego.

---

## 3. Backend — comandos Tauri a replicar

Todo vive en `src-tauri/src/main.rs`. Tabla de comandos (`invoke`):

| Comando | Firma | Qué hace |
|---|---|---|
| `save_slot` | `(slot_num: u8) -> SaveSlot` | Requiere juego en curso. Manda `SAVE_STATE` por UDP, espera hasta 6 s (polling c/200 ms) a que aparezca `{stem}.state` fresco (en plano o un nivel abajo), lo copia a `slot_N.state`, copia/limpia el thumbnail. Error si no se detecta el guardado. |
| `load_slot` | `(game_id, file) -> String` | Valida el nombre (`check_slot_filename`: solo `*.state`, sin rutas). En caliente: copia al path activo + `LOAD_STATE`, devuelve `"loaded"`. En frío: además copia como `{stem}.state.auto`, devuelve `"staged"` (el llamador debe lanzar el juego). |
| `list_slots` | `(game_id) -> SaveSlot[]` | Lee `data/savestates/{game_id}/`, filtra `*.state` (excluye `.auto` y `.png`), ordena por fecha. |
| `delete_slot` | `(game_id, file)` | Borra el `.state` y su `.png`. |
| `running_game` | `() -> RunningGameInfo \| null` | `{ rom_path, game_id, game_name }` del juego en curso (o `null`). |
| `ingame_continue` | `()` | Oculta el overlay + despausa (`PAUSE_TOGGLE` si estaba pausado). |
| `ingame_quit` | `() -> String` | Doble `QUIT` (ver §4) + fallback `taskkill` por PID (ver §5). |
| `is_game_running` | `() -> bool` | Si hay juego en curso. |

Tipos:

```rust
struct SaveSlot { file: String, thumbnail: Option<String>, modified: u64, size: u64 }
struct RunningGame { port: u16, rom_path: String, pid: u32 }
```

Estados globales y helpers (replicar tal cual):

- `RUNNING: Mutex<Option<RunningGame>>` — un solo juego a la vez; se fija en
  `launch_game` (con `child.id()` como `pid`) y se libera en el waiter thread al salir.
- `PAUSED: Mutex<bool>` — cuenta local de pausa (el UDP es unidireccional y
  `PAUSE_TOGGLE` es ciego). `set_paused(port, paused)` solo envía si cambia.
- `SlotGuard` (`SLOT_BUSY`) — impide operaciones de slots concurrentes.
- `slot_path_for_rom(rom)` — path del slot fijo `{stem}.state` (plano o un nivel
  abajo, sin recursión profunda).
- `find_fresh_slot(stem, before)` — detecta el `.state` más nuevo que `before`
  (usa `before = mtime` previo al `SAVE_STATE`).
- `ra_send(cmd, port)` — UDP a `127.0.0.1:55355` (`UdpSocket::bind("127.0.0.1:0")`).
- `archive_slot_on_exit(rom)` — al salir, archiva el slot fijo en el primer slot
  libre **sin pisar nunca** (compara bytes, no relojes).
- `is_process_alive(pid)` / `kill_process(pid)` — vía `tasklist` / `taskkill`
  (Windows, sin crates nuevos).
- `clear_stale_autos()` — barrido único de `*.auto` residuales al arrancar.

---

## 4. Control de RetroArch (UDP puerto fijo 55355)

Protocolo: [Network Control Interface](https://docs.libretro.com/development/retroarch/network-control-interface)
(paquetes UDP de texto plano). Comandos usados:

| Comando | Efecto | Nota |
|---|---|---|
| `SAVE_STATE` | Escribe el slot fijo | Con `auto_index=false` → `{stem}.state` |
| `LOAD_STATE` | Carga el slot fijo | No-op si aún no hay contenido cargado |
| `PAUSE_TOGGLE` | Pausa/reanuda (toggle ciego) | Llevar cuenta local (`PAUSED`) |
| `QUIT` | Cierra RetroArch | **Pide confirmación**: el 1º arma la salida, el 2º la confirma → mandar dos veces separadas ~800 ms |
| `VOLUME_UP` / `VOLUME_DOWN` | ±1 paso | Sin valor absoluto: N pasos = N envíos |
| `MUTE` | Silencia/alterna | Toggle ciego, llevar estado en frontend |

---

## 5. Salida limpia (`ingame_quit`) — secuencia exacta

1. Ocultar overlay (`win.hide()`).
2. `set_paused(port, false)` (despausar antes de salir).
3. `QUIT` → esperar 800 ms → si el PID sigue vivo, segundo `QUIT`.
4. Esperar hasta 3 s (polling c/200 ms con `is_process_alive`); si sigue vivo, `taskkill /PID /F`.
5. El waiter thread de `launch_game` ya se encarga del resto: archiva slot, limpia `RUNNING`, emite `retroarch-exited`, re-muestra la ventana principal.

Nunca matar el proceso sin intentar `QUIT` antes: se saltearía el archivado al salir.

---

## 6. `retroarch.cfg` mínima requerida

Generar un `retroarch.cfg` propio junto al ejecutable (con `config_save_on_exit = "false"`
para que RetroArch no lo pise). Claves obligatorias:

```
menu_driver = "ozone"
input_enable_hotkey = "escape"
input_menu_toggle = "f1"
input_exit_emulator = "escape"
video_fullscreen = "true"
savestate_auto_load = "true"    # solo para el Cargar en frío explícito (.auto staged)
savestate_auto_save = "false"   # en false: cada partida arranca de cero
network_cmd_enable = "true"
network_cmd_port = "55355"
savestate_auto_index = "false"  # slot fijo: base de todo el sistema
savestate_thumbnail_enable = "true"
savestate_directory = "{dir_propio}/ra_states"
config_save_on_exit = "false"
```

Qué rompe si falta cada una:

- Sin `auto_index=false` → los estados se numeran y `find_fresh_slot` no los encuentra.
- Sin `network_cmd_enable/port` → ningún comando en caliente funciona.
- Con `auto_save=true` → cada salida escribe `.auto` y la próxima partida **autocarga** donde quedó.
- Sin `savestate_directory` propio → los `.state` caen junto a las ROMs del usuario.

Además: **borrar `{stem}.state.auto` en cada lanzamiento** (y un barrido único al
arrancar) para garantizar arranque de cero; `load_slot` en frío lo re-escribe solo
cuando el usuario lo pide explícitamente.

---

## 7. Ventana overlay + F9

`src-tauri/tauri.conf.json` — segunda ventana:

```json
{
  "label": "ingame",
  "title": "gameFlix Menu",
  "fullscreen": true,
  "transparent": true,
  "decorations": false,
  "visible": false,
  "alwaysOnTop": true,
  "skipTaskbar": true
}
```

- Atajo global **F9** (`tauri-plugin-global-shortcut`, registrado en `setup`):
  solo actúa si `RUNNING.is_some()`. Si el overlay está visible → hide + despausar;
  si no → pausar + show + focus.
- `src/main.tsx`: `getCurrentWindow().label === "ingame" ? <IngameMenu/> : <App/>`
  (el mismo bundle sirve ambas ventanas).
- El menú recarga datos en cada `onFocusChanged` (F9 hace show+focus desde Rust)
  y con **Esc** continúa (equivale a Continuar).

---

## 8. Frontend — archivos y responsabilidades

| Archivo | Responsabilidad |
|---|---|
| `src/components/IngameMenu.tsx` | Overlay: pide `runningGame()` al ganar foco; secciones Guardar / Cargar / Volumen / Salir; `status` para mensajes; `busy` anti doble-click. |
| `src/components/SlotList.tsx` | Grilla de 5 slots (`MAX_SLOTS`), `slotFile(n) = slot_N.state`, `SlotThumb` (thumbnail o 💾), botones Cargar / ✕ con `stopPropagation`. |
| `src/lib/tauri.ts` | Wrappers `saveSlot`, `loadSlot`, `listSlots`, `deleteSlot`, `runningGame`, `ingameContinue`, `ingameQuit`, `ingameVolume`, `ingameMute` (un `invoke` cada uno). |
| `src/components/IngameMenu.css` | Backdrop fullscreen + panel. |
| `src/components/GameDetailModal.css` | Clases `save-list`, `save-cell`, `save-selected`, `save-cell-actions`, `save-thumb`, `save-date`, `save-empty`. |

Flujos exactos en `IngameMenu.tsx`:

- **Guardar** (`handleSave`): si no hay slot elegido → status. Si el slot está ocupado
  y no confirmado → estado `confirmOverwrite` + status de aviso (los botones cambian a
  "⚠ Pisar slot N" / "Cancelar"). Segundo click → `saveSlot` → `refresh` → status ✓.
  Cambiar de slot resetea la confirmación.
- **Cargar** (`handleLoad`): `await loadSlot(game_id, file)` → `await ingameContinue()`
  (cierra + despausa; si falla la carga, muestra el error y NO continúa).
- **Volumen**: slider 0-100 relativo por sesión (se recentra al cambiar de juego);
  cada 2 puntos = 1 paso UDP (`VOLUME_UP/DOWN`); RetroArch no informa su nivel real.
- **Salir**: `ingameQuit()` directo (el backend bloquea hasta ~4 s en el peor caso).

---

## 9. Orden de implementación sugerido

1. cfg de RetroArch (§6) + `savestate_directory` propio → lanzar un juego y verificar que `SAVE_STATE` (tecla F2 de RetroArch) escribe `{rom}.state` ahí.
2. `ra_send` + `GET_STATUS`/`VERSION` por UDP para validar el canal (puerto 55355).
3. Comandos backend en este orden: `save_slot` → `list_slots` → `load_slot` (caliente) → `delete_slot` → `running_game` → `ingame_continue` → `ingame_quit`.
4. Ventana `ingame` (§7) + F9 con pausa/reanudación (probar solo show/hide + `PAUSE_TOGGLE`).
5. Wrappers `invoke` en el frontend.
6. `SlotList` (grilla + thumbnails) con datos reales.
7. `IngameMenu` completo; probar la matriz: guardar→pisar con aviso→cargar→salir→reentrar (debe arrancar de cero).

Verificación por paso: `npx tsc --noEmit`, `npx vite build`, `cargo check` (en `src-tauri/`).

---

## 10. Trampas comunes (las que ya nos mordieron)

1. **No usar `window.confirm`** en el overlay: el diálogo nativo puede quedar oculto
   detrás del fullscreen de RetroArch y la app parece congelada. Confirmación inline.
2. **`LOAD_STATE` en frío no existe**: con el juego parado hay que preparar el `.auto`
   y lanzar (flujo "staged"), no mandar UDP a nadie.
3. **`QUIT` necesita confirmación**: un solo `QUIT` deja a RetroArch pidiendo el
   segundo (síntoma: "sale como si apretara Escape una vez"). Doble `QUIT` + `taskkill`.
4. **`PAUSE_TOGGLE` es ciego**: si se pierde la cuenta local, pausa y reanudación se
   invierten. `set_paused` solo envía cuando el estado deseado difiere.
5. **`auto_save=true` + `auto_load=true` = autocarga fantasma**: cada salida deja un
   `.auto` que la próxima partida restaura. Para arranque de cero: `auto_save=false`
   + borrar el `.auto` al lanzar.
6. **Los data-URI son caros**: thumbnails/covers en base64 completo; cachearlos en
   memoria (`Map`) y cargarlos lazy por slot visible.
7. **`noUnusedLocals`**: `tsconfig` lo tiene activado; cada import/función que deje de
   usarse (p. ej. quitar Cargar del modal) debe limpiarse o rompe el build.
