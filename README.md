# NewGame+ (gameFlix V3)

Launcher/frontend de emulación retro para Windows con experiencia tipo streaming.
100% local: biblioteca, metadatos y configuración en disco. Sin backend en la nube.

Stack: **Tauri 2 (Rust) + React 19 + TypeScript + Vite**.

## Requisitos

- Node 20+, npm 10+
- Rust estable (via `rustup`) + Tauri 2 requisitos de Windows (WebView2, build tools MSVC)
- Windows 10/11 (única plataforma soportada hoy)

## Uso

```powershell
npm install
npm run dev        # frontend + Tauri en desarrollo
npm run build      # tsc + vite build
.\build.ps1        # instalador NSIS completo
```

### Primer arranque

1. La app auto-descarga RetroArch portable en primer lanzamiento (`setup-retroarch.ps1` para hacerlo manual).
2. Configura tus carpetas de ROMs en Ajustes → Biblioteca → Escanear.
3. Opcional: claves de RetroAchievements y SteamGridDB en Ajustes (se guardan en local; ver nota de seguridad abajo).
4. Opcionales por plataforma: `setup-rpcs3.ps1` (PS3), `setup-azahar.ps1` (3DS), `setup-sunshine.ps1` (cast/Moonlight).

### Actualización de emuladores

Ajustes → **Emuladores**: muestra la versión instalada vs la última disponible de
RetroArch, RPCS3, Azahar y Sunshine, con botón de actualización por componente
(descarga → backup `.bak` → reemplazo con restauración automática si falla) y
botón aparte para re-descargar los cores libretro nightly.

- La app comprueba novedades **automáticamente cada 4 días** al iniciar (hilo en
  segundo plano, sin bloquear) y muestra un punto verde en Ajustes si hay algo.
  Se puede desactivar con el toggle de la misma tab o forzar con "Buscar ahora".
- Reglas: no actualiza con un juego en curso; preserva BIOS (`RetroArch/system`),
  saves (`data/`) y datos portables (RPCS3 `dev_hdd0`/`config`, Sunshine `*.conf`).
- Extraer `.7z` requiere 7-Zip instalado (la app avisa si falta).

## Estructura

- `src/` — frontend React (App, componentes, i18n es/en, hooks gamepad)
- `src-tauri/src/` — backend: `commands/`, `emulator/`, `scanner/`, `metadata/`, `platforms.rs`, `state/`, `achievements.rs`, `steamgriddb.rs`
- `src-tauri/binaries/` — **no versionado** (se obtiene con los `setup-*.ps1`): RetroArch, cores, RPCS3, `libretrodb.sqlite`
- `src-tauri/data/` — estado local del usuario (no versionado)

## Tests y calidad

```powershell
npm run build                 # typecheck + build frontend
cargo fmt --check             # formato Rust (desde src-tauri o raíz con --manifest-path)
cargo clippy --all-targets    # lints
cargo test                    # unit tests herméticos (los de red/disco están #[ignore])
cargo test -- --ignored       # integración (requiere ROMs locales y red)
```

CI (`.github/workflows/ci.yml`) corre build frontend + fmt + clippy + `cargo test` en cada push/PR.

## Distribución y firma

- `.\build.ps1` genera el NSIS en `src-tauri/target/release/bundle/nsis/`.
- **Firmar el instalador** antes de publicar (si no, SmartScreen lo bloquea):
  1. Certificado de firma de código (o self-sign solo para pruebas internas).
  2. `signtool sign /fd SHA256 /a /t http://timestamp.digicert.com <instalador>.exe`
- Auto-update con `tauri-plugin-updater` **pendiente** (ver `proximosPasos.md`): requiere clave de firma del updater + endpoint de releases.
- Publicar: tag `vX.Y.Z` → GitHub Release con el `.exe` NSIS + `CHANGELOG.md`.

## Notas legales (leer antes de distribuir)

La app **descarga/empaqueta** software de terceros con sus propias licencias:

- RetroArch + cores Libretro → **GPL** (ver `NOTICE-THIRD-PARTY.md`). Distribuir el binario exige atribución y ofrecer el código fuente correspondiente.
- RPCS3 → GPL-2.0, Azahar (Citra fork) → GPL-2.0+.
- Thumbnails Libretro, metadatos libretrodb, SteamGridDB, RetroAchievements: cada uno con sus términos.

La carpeta `src-tauri/binaries/` está excluida de git a propósito: cada usuario obtiene esos binarios vía los scripts de setup o la auto-descarga. Si vas a redistribuir un instalador que ya los incluya, cumple las obligaciones GPL (atribución + fuente disponible).

## Seguridad

- Las API keys de RetroAchievements y SteamGridDB se guardan **cifradas con
  DPAPI** (ámbito: usuario actual de Windows) en el JSON de estado local, y
  **nunca se exponen al frontend** (los comandos devuelven solo
  usuario vinculado / presencia). El login de RetroAchievements viaja por POST.
  Nota: el token de logros sí queda en `binaries/RetroArch/retroarch.cfg`
  porque RetroArch lo exige para funcionar (carpeta no versionada, disco local).
- Solo se ejecuta lo que está en la biblioteca escaneada (`launch_game`
  rechaza ROMs desconocidas); las carátulas se leen solo bajo `data/` o
  `binaries/`; el arte remoto aceptado es únicamente `https://`.
- No abras ROMs de orígenes no confiables: los parsers de headers/ISOs son
  superficie real de riesgo.

## Estado del proyecto

Ver `proximosPasos.md` (roadmap) y `pendientes2.md` (deuda de matching de metadatos).
