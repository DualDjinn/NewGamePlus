# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Jugadores y entusiastas de la emulación retro en Windows 10/11 que buscan una experiencia de biblioteca organizada, pulida y visualmente cinematográfica. Se utiliza en dos escenarios clave:
1. **Modo Kiosko / Sala de estar (10-Foot UI):** Usuario en el sofá frente a un televisor o monitor grande, navegando exclusivamente con mando de videojuegos (gamepad: Xbox, PlayStation, 8BitDo).
2. **Modo Escritorio Tradicional:** Usuario frente a la pantalla de la PC interactuando con ratón y teclado, administrando carátulas, ajustando rutas y filtrando catálogos rápidamente.

## Product Purpose
NewGame+ (gameFlix V3) transforma una colección dispersa de ROMs, ISOs e imágenes de disco en una experiencia de juego tipo plataforma de streaming (Netflix/Disney+). Funciona 100% de manera local, sin requerir servidores en la nube ni telemetría obligatoria, gestionando de forma transparente los emuladores (RetroArch, RPCS3, Azahar, Sunshine), metadatos, logros (RetroAchievements) y carátulas (Libretro Thumbnails, SteamGridDB).

## Positioning
A diferencia de interfaces técnicas o cargadas de menús de configuración como RetroArch nativo, LaunchBox o frontends tradicionales:
- NewGame+ aísla por completo al usuario de la complejidad técnica de los emuladores: la emulación se ejecuta en modo kiosko limpio, a pantalla completa, y retorna sin interrupciones a la interfaz al salir.
- Diseño visual inmersivo con Hero banner cinematográfico, fondos dinámicos con desenfoque de ambiente, reproductor de música integrado y transiciones a 60 FPS con aceleración de hardware.

## Operating Context
- Entorno de escritorio local en Windows (Tauri 2 con backend en Rust y frontend en React 19 + TypeScript + Vite).
- Interacción híbrida fluida: gamepad navigation (con soporte para D-pad, sticks analógicos, botones A/B/X/Y, bumpers y disparadores) y puntero de ratón con scroll suave.
- Almacenamiento local de biblioteca y metadatos en SQLite y JSON (`src-tauri/data/`).
- Emuladores portables empaquetados o descargados en local sin alterar el sistema operativo del usuario.

## Capabilities and Constraints
- **Capacidades:**
  - Escaneo automático y detección inteligente de ROMs según extensiones y plataformas.
  - Lanzamiento automático con el core libretro o emulador correspondiente sin menús intermedios.
  - Descarga y almacenamiento en caché de boxarts y carátulas (Libretro Thumbnails y SteamGridDB).
  - Integración con RetroAchievements para seguimiento de logros locales.
  - Reproductor de vinilo integrado (música ambiental de chiptunes/OSTs de juegos).
  - Sistema de 5 temas de color (Gold, Arcade, Console, SNES, Crimson) con personalización inmediata.
  - Modo Kiosko a pantalla completa sin barras de título ni bordes de ventana.
- **Restricciones Técnicas:**
  - Solo compatible con Windows 10/11 x64.
  - Sin dependencias de servicios en la nube para funcionar (modo offline de primera clase).

## Brand Commitments
- **Nombre:** NewGame+ (gameFlix V3).
- **Identidad visual:** Estética oscura, premium, cinematográfica e inmersiva ("out-of-distribution craft").
- **Tipografía de marca:** `Space Grotesk` para display, títulos principales y marca; `Inter` para texto de cuerpo, metadatos y controles de interfaz.
- **Colores de identidad:** Fondo ultra-oscuro (`#0a0b10`), acento dorado de cabecera (`#f59e0b`) por defecto, con soporte para variantes de acento retro (Arcade Cyan, Console Blue, SNES Lavender, Crimson Red).

## Evidence on Hand
- Repositorio con arquitectura completa: `src/` (React 19 + TypeScript), `src-tauri/` (Rust Tauri 2).
- Documentación de requerimientos y diseño: `README.md`, `gameFlix.md`, `proximosPasos.md`, `pendientes2.md`.
- Scripts automatizados para setup de emuladores (`setup-retroarch.ps1`, `setup-rpcs3.ps1`, etc.).
- Sistema de estilos CSS completo en `src/App.css` y módulos de componentes.

## Product Principles
1. **Inmersión cinematográfica sobre complejidad técnica:** El usuario debe sentirse dentro de una consola de entretenimiento de última generación, nunca en un explorador de archivos.
2. **Un clic para jugar:** Seleccionar un título y pulsar Jugar debe llevar inmediatamente a la experiencia a pantalla completa con el core correcto configurado.
3. **Privacidad y autonomía 100% local:** Todos los metadatos, saves, BIOS y estados se mantienen en el equipo del usuario.
4. **Ergonomía de mando de primer nivel:** Cada pantalla, modal, menú y control debe poder operarse de manera natural desde un mando a 3 metros de distancia, respetando también la precisión del ratón.
