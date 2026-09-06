# Prompt: Aplicación de escritorio para emulación de videojuegos (React + Tauri + RetroArch embebido)

Copia y pega todo el siguiente bloque en la IA que vayas a usar (Claude, GPT, etc.).

---

## CONTEXTO Y OBJETIVO

Quiero que actúes como un arquitecto de software senior especializado en Tauri, Rust y React. Vamos a diseñar y construir, paso a paso, una **aplicación de escritorio para Windows** que funcione como un "launcher/frontend" de emulación retro, con una experiencia visual similar a Netflix o Disney+.

La aplicación debe:

1. Estar construida con **Tauri** (backend en Rust) y **React** (frontend, TypeScript).
2. **Embeber el binario de RetroArch** dentro de la propia aplicación (como *sidecar* / recurso empaquetado), de modo que el usuario final **no tenga que descargar ni instalar RetroArch por separado**.
3. Usar RetroArch **en modo kiosko**: sin su menú XMB/RGUI visible, sin decoraciones de ventana, lanzado directamente a pantalla completa cargando el core y la ROM que el usuario eligió desde nuestra interfaz. El usuario nunca debe ver la interfaz nativa de RetroArch, solo la nuestra.
4. Tener una interfaz visual tipo streaming (Netflix/Disney+):
   - Un **Hero banner** superior con **5 juegos aleatorios** (recomendados/destacados), con imagen de fondo grande, título, plataforma y botón de "Jugar".
   - Filas horizontales tipo carrusel debajo, **agrupadas por categoría o plataforma** (ej: "SNES", "Mega Drive", "PlayStation", "Recientemente jugados", "Favoritos").
   - Tarjetas (cards) con el cover/carátula del juego, efecto hover, y navegación fluida (con mouse y también apta para mando/teclado, pensando en modo TV/living).
5. Funcionar **100% de forma local**, sin backend en la nube: biblioteca de juegos, metadatos y configuración se guardan en disco (JSON o SQLite local).
6. Descargar las **carátulas/covers de los juegos usando el sistema de miniaturas de Libretro** (el mismo repositorio `libretro-thumbnails` que usa RetroArch), respetando su convención de nombres y estructura de carpetas por sistema (Named_Boxarts, Named_Snaps, Named_Titles).

## REQUISITOS TÉCNICOS DETALLADOS

### 1. Empaquetado de RetroArch
- Explica cómo incluir el ejecutable de RetroArch (`retroarch.exe`) y los **cores de libretro** (`.dll`) como *recursos* o *sidecars* de Tauri (`tauri.conf.json` -> `bundle.resources` / `externalBin`), para que queden dentro del instalador final (NSIS/MSI).
- Indica cómo, desde Rust, lanzar `retroarch.exe` como proceso hijo con los argumentos correctos para:
  - Cargar un core específico (`-L ruta/al/core.dll`).
  - Cargar una ROM específica.
  - Forzar pantalla completa y ocultar el menú (`--fullscreen`, config de `menu_driver`, `input_menu_toggle`, etc., o usando un `retroarch.cfg` personalizado embebido en la app que deshabilite el menú y overlays).
  - Cerrar limpiamente RetroArch y devolver el foco a nuestra app cuando el usuario sale del juego (hotkey de salida configurada, por ejemplo F1 o combinación de mando).
- Menciona las licencias de RetroArch/Libretro (GPL) y qué implica distribuir el binario embebido (atribución, código fuente disponible, etc.), sin profundizar en asesoría legal, solo como nota técnica a tener en cuenta.

### 2. Detección y organización de la biblioteca de juegos
- El usuario selecciona una o varias carpetas donde tiene sus ROMs.
- La app debe escanear esas carpetas, identificar la plataforma según la extensión/carpeta (ej: `.sfc`/`.smc` = SNES, `.md`/`.gen` = Mega Drive, `.n64`/`.z64` = N64, `.chd`/`.bin/.cue` = PS1, etc.), y mapear automáticamente qué core de libretro corresponde a cada plataforma (core configurable/editable por el usuario).
- Guardar esta biblioteca en una base local (SQLite recomendado, o JSON si se prefiere simplicidad inicial) con: nombre del juego, plataforma, ruta de la ROM, core asignado, ruta del cover local descargado, favorito (sí/no), última vez jugado.

### 3. Descarga de carátulas vía Libretro Thumbnails
- Explica cómo consumir el repositorio público `libretro-thumbnails` (en GitHub, organizado por sistema/plataforma) para descargar las imágenes correspondientes a cada juego, replicando el algoritmo de coincidencia de nombres que usa RetroArch (normalización de nombres, reemplazo de caracteres especiales, etc.).
- Las imágenes descargadas deben guardarse en caché local para no volver a descargarlas en cada inicio.
- Debe haber manejo de fallback (imagen genérica) cuando no se encuentra cover.

### 4. Interfaz (React + TypeScript)
- Proponer estructura de componentes: `HeroBanner`, `CategoryRow`, `GameCard`, `Sidebar/TopNav`, `GameDetailModal`, `LibraryScanner`, `Settings`.
- El Hero debe seleccionar 5 juegos al azar (o con alguna lógica de "recomendado" simple, ej: mezcla de favoritos + recientes + aleatorios) al cargar la app o cada cierto tiempo.
- Diseño oscuro, tipografía grande, transiciones suaves, con foco en usabilidad tipo "10-foot UI" (pensado para verse bien también desde el sillón/TV), pero funcional también con mouse/teclado en PC.
- Navegación por teclado/mando (flechas, Enter, Esc) para que se sienta como un kiosko real.

### 5. Comunicación Frontend <-> Backend (Tauri commands)
- Definir los `#[tauri::command]` necesarios en Rust: `scan_library`, `get_games`, `launch_game(game_id)`, `download_thumbnail(game_id)`, `toggle_favorite(game_id)`, `get_settings`, `save_settings`.
- Explicar el uso de eventos de Tauri para notificar al frontend cuándo termina el escaneo, cuándo termina de descargar covers, y cuándo se cierra RetroArch (para volver del "modo juego" al launcher).

### 6. Modo kiosko de la app en sí
- La propia aplicación (no solo RetroArch) debe poder configurarse para iniciar en pantalla completa, sin bordes de ventana, ideal para un mini-PC conectado a TV.

## FORMATO DE RESPUESTA ESPERADO

Quiero que la IA responda con:
1. Un resumen de la arquitectura general (diagrama en texto/ASCII o descripción por capas).
2. Estructura de carpetas del proyecto (Tauri + React).
3. Fragmentos de código clave: configuración de `tauri.conf.json` para empaquetar RetroArch, comando Rust para lanzar el proceso, y un componente React de ejemplo (`HeroBanner` o `GameCard`).
4. Lista de pasos siguientes / roadmap sugerido para ir implementando esto de forma incremental (MVP primero: escaneo + lanzar juego; luego covers; luego UI pulida).

No es necesario que generes todo el proyecto completo de una sola vez: quiero avanzar de forma iterativa, así que al final pregúntame por cuál parte quiero empezar.

---
