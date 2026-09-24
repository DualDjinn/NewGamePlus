---
name: NewGame+ (gameFlix V3)
description: Frontend cinematográfico de emulación retro con estética de streaming 10-foot UI
colors:
  accent-gold: "#f59e0b"
  accent-gold-hover: "#fbbf24"
  accent-arcade: "#00f0ff"
  accent-arcade-hover: "#38bdf8"
  accent-console: "#3b82f6"
  accent-console-hover: "#60a5fa"
  accent-snes: "#818cf8"
  accent-snes-hover: "#a5b4fc"
  accent-crimson: "#e50914"
  accent-crimson-hover: "#f87171"
  bg-main: "#0a0b10"
  bg-card: "#131622"
  bg-card-hover: "#1b1f30"
  bg-header: "rgba(10, 11, 16, 0.82)"
  bg-sidebar: "rgba(10, 11, 16, 0.88)"
  text-main: "#f8fafc"
  text-muted: "#94a3b8"
  border-subtle: "rgba(255, 255, 255, 0.08)"
  border-card: "rgba(255, 255, 255, 0.09)"
  status-success: "#10b981"
  status-error: "#e50914"
  status-warning: "#f59e0b"
  neutral-dim: "#64748b"
  neutral-light: "#cbd5e1"
typography:
  display:
    fontFamily: "'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontWeight: 400
    lineHeight: "1.5"
  mono:
    fontFamily: "ui-monospace, monospace"
    fontWeight: 400
rounded:
  xs: "2px"
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "20px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
components:
  game-card:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.lg}"
    padding: "0px"
    width: "293px"
    height: "193px"
  button-primary:
    backgroundColor: "{colors.accent-gold}"
    textColor: "#000000"
    rounded: "{rounded.sm}"
    padding: "10px 24px"
  hero-banner:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-main}"
    rounded: "{rounded.xl}"
    padding: "0px"
    height: "60vh"
---

# Design System: NewGame+ (gameFlix V3)

## Overview
NewGame+ es una interfaz de usuario cinematográfica para emulación retro ("10-foot UI"), diseñada para disfrutarse tanto en la sala de estar con un mando a distancia o en el escritorio con ratón y teclado. La estética evoca plataformas de streaming modernas (estilo Netflix/Disney+) combinada con la vibra arcade y retro-gaming, destacando por sus fondos oscuros de alto contraste, brillos de acento sutiles y transiciones fluidas a 60 FPS.

## Colors
La paleta se basa en fondos oscuros profundos para maximizar la visibilidad de las carátulas y capturas de juegos, acompañada de un sistema de temas personalizable:

- **Fondos principales:**
  - `bg-main`: `#0a0b10` (fondo global base).
  - `bg-card`: `#131622` (superficie de tarjetas y contenedores elevados).
  - `bg-card-hover`: `#1b1f30` (estado hover de tarjetas).
  - `bg-header` / `bg-sidebar`: Capas translúcidas oscuras con desenfoque de fondo (`backdrop-filter: blur(20px)`).

- **Temas de acento:**
  - **NewGame+ Gold (Por defecto):** `--accent: #f59e0b;`, `--accent-hover: #fbbf24;`, `--accent-glow: rgba(245, 158, 11, 0.35);`
  - **Arcade Neon:** `--accent: #00f0ff;`, `--accent-hover: #38bdf8;`, `--accent-glow: rgba(0, 240, 255, 0.35);`
  - **Console Blue:** `--accent: #3b82f6;`, `--accent-hover: #60a5fa;`, `--accent-glow: rgba(59, 130, 246, 0.35);`
  - **SNES Lavender:** `--accent: #818cf8;`, `--accent-hover: #a5b4fc;`, `--accent-glow: rgba(129, 140, 248, 0.35);`
  - **Crimson Streaming:** `--accent: #e50914;`, `--accent-hover: #f87171;`, `--accent-glow: rgba(229, 9, 20, 0.35);`

- **Textos y bordes:**
  - `text-main`: `#f8fafc` (blanco puro de lectura nítida).
  - `text-muted`: `#94a3b8` (gris intermedio para metadatos, subtítulos y consolas).
  - `border-subtle`: `rgba(255, 255, 255, 0.08)` (separadores sutiles que no compiten con el contenido).
  - `border-card`: `rgba(255, 255, 255, 0.09)`.

## Typography
- **Display / Títulos:** `'Space Grotesk', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`.
  - Peso 700 para títulos de Hero Banner, cabeceras de categorías, logotipo y nombres de juegos destacados.
  - Carácter geométrico, moderno y con fuerte personalidad retro-futurista.
- **UI / Lectura:** `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`.
  - Peso 400 y 600 para metadatos de juegos, botones, opciones de configuración y listas de logros.
  - Diseñada para alta legibilidad en pantallas tanto a corta como a larga distancia.

## Layout
- **Estructura:**
  - **Sidebar:** Barra lateral izquierda fija (220px expandida / 60px colapsada o en modo inmersivo) con acceso a Inicio, Biblioteca, Favoritos y Ajustes.
  - **Navbar / Header:** Barra superior sticky (64px) con buscador dinámico, reloj con estilo cápsula y reproductor de vinilo integrado.
  - **Hero Banner:** Sección superior dominante con 60vh de altura (440px min, 580px max) que rota títulos destacados y muestra carátulas en alta resolución, sinopsis, año, desarrollador y botón directo de "Jugar".
  - **Carruseles horizontales (Category Rows):** Filas de desplazamiento horizontal con scroll-snap o navegación por botones/gamepad para agrupar juegos por consola, favoritos o recientes.
  - **Modo Kiosko:** Modo de pantalla completa absoluta (`fixed inset: 0`), sin marco de ventana, que elimina cualquier distracción.

## Elevation & Depth
- **Capas de elevación:**
  - Nivel 0 (Fondo base): `var(--bg-main)` con gradientes ambientales radiales fijados (`radial-gradient`) que proyectan la luz del color de acento.
  - Nivel 1 (Tarjetas): `var(--bg-card)` con sombra suave `box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45)`.
  - Nivel 2 (Hover / Foco de mando): Elevación en el eje Y (`transform: translateY(-6px)`), borde coloreado con `var(--accent)` y resplandor perimetral `box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7), 0 0 20px var(--accent-glow)`.
  - Nivel 3 (Modales y Overlays): Superposiciones con `backdrop-filter: blur(20px)` y fondos semitransparentes `rgba(10, 12, 18, 0.85)` con bordes definidos.

## Shapes
- **Radios de esquina:**
  - `sm (4px)`: Insignias de consola, tags de metadatos, botones pequeños.
  - `md (8px)`: Botones primarios, inputs de texto y selects.
  - `lg (12px)`: Tarjetas de juegos (`.game-card-body`), tarjetas del reproductor de vinilo.
  - `xl (20px)`: Tarjeta principal del Hero Banner y barra de búsqueda flotante.
  - `full (9999px)`: Botones circulares de acción, controles de música y botones de reproducción.

## Components
- **GameCard (`293px x 193px`):** Tarjeta con relación de aspecto panorámica para boxarts. Muestra la imagen con `object-fit: cover`, botón flotante de favoritos en la esquina superior derecha (`28px x 28px`), e indicador de foco visual de alto contraste para gamepad.
- **HeroBanner (`60vh`):** Presentación cinematográfica con carrusel de 5 títulos aleatorios/favoritos. Incluye gradientes direccionales para asegurar la legibilidad del texto sin oscurecer los detalles del fondo.
- **VinylPlayer:** Reproductor flotante integrado estilo vinilo con animación de rotación, onda de ecualizador dinámico y controles de pistas.
- **GameDetailModal:** Modal a pantalla completa o centrado que despliega sinopsis, capturas adicionales, logros de RetroAchievements desbloqueados y selector de cores/emuladores.
- **Settings:** Panel modal tabulado para escaneo de carpetas, actualización de emuladores con backup, selección de temas visuales e integración de APIs.

## Do's and Don'ts
- **DO:**
  - Mantener siempre fondos oscuros profundos con contraste WCAG AAA para texto y botones.
  - Asegurar que todo elemento nuevo sea navegable con mando (gamepad) mediante clases de foco claras (`:focus-visible` o clases controladas por estado).
  - Emplear `Space Grotesk` para elementos de display/identidad y `Inter` para datos legibles.
  - Respetar los tiempos de animación fluidos (curvas `cubic-bezier(0.16, 1, 0.3, 1)` a ~250ms).
- **DON'T:**
  - No usar fondos claros ni "AI beige" o grises lavados.
  - No generar menús técnicos complejos al momento de jugar; el flujo principal debe permanecer inmediato y cinematográfico.
  - No romper la coherencia del sistema de temas inyectando colores hexadecimales arbitrarios sin enlazarlos a las variables CSS del proyecto.
