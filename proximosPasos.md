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
- **Update de RetroArch** — re-descargar si la versión es vieja
- **Log de errores** — persistir errores en archivo en vez de solo consola

## 4. Infra
- **CI/CD** — GitHub Actions para build automático del NSIS
- **Tests** — al menos un test de Rust para `detect_platform` con los casos edge (.bin+.cue, .bin solo)
- **Auto-update** — Tauri updater para nuevas versiones

## 5. Distribución
- **README** — instrucciones de build y uso
- **Release en GitHub** — subir el `.exe` del NSIS
