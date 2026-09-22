# Próximos Pasos — gameFlix

## 1. Pre-release
- **Firmar el instalador NSIS** — certificate o self-sign para que Windows no bloquee la instalación
- **Icono propio** — reemplazar el icono placeholder de Tauri con uno de gameFlix
- **Animación de carga** — spinner real en vez del texto "Cargando..." del W10

## 2. UX polish
- **Edición de core por juego** — dropdown en el modal de detalle (lo que faltó del spec)
- **Progreso de descarga de cores** — barra real en vez de solo "Core downloading..."
- **Búsqueda** — barra de texto para filtrar juegos por nombre
- **Ordenar** — por nombre, plataforma, última vez jugado

## 3. Funcionalidad
- **Multi-cuenta / perfiles** — separar favoritos y recently played por usuario
- **Exportar/importar biblioteca** — backup del JSON
- **Update de RetroArch** — ✅ re-descargar si la versión es vieja (tab Emuladores + auto-check 4 días; cubre también RPCS3, Azahar, Sunshine y cores)
- ✅ **Log de errores** — `state::storage::log_error` → `data/logs/errors.log` (comando `get_error_logs`)

## 4. Infra
- ✅ **CI** — `.github/workflows/ci.yml` (build frontend + fmt + clippy + `cargo test` hermético)
- ✅ **Tests** — 23 unitarios herméticos en verde; integración con `#[ignore]` (`cargo test -- --ignored` manual)
- **CD + Auto-update** — pendientes: build NSIS en Actions, `tauri-plugin-updater`, firma (ver README)

## 5. Distribución
- ✅ **README** — instrucciones de build y uso + `NOTICE-THIRD-PARTY.md` (GPL) + `CHANGELOG.md`
- **Release en GitHub** — subir el `.exe` del NSIS (firmado, ver README)
