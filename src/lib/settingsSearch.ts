import type { SettingsTab, GraphicsConsole } from "../types";

export interface SettingsSearchOption {
  id: string;
  tab: SettingsTab;
  title: string;
  category: string;
  icon: string;
  description: string;
  keywords: string[];
  targetId?: string;
  graphicsConsole?: GraphicsConsole;
}

export const SETTINGS_OPTIONS: SettingsSearchOption[] = [
  // --- SONIDO ---
  {
    id: "sound-interface-volume",
    tab: "sound",
    title: "Volumen de la Interfaz & Música",
    category: "Sonido",
    icon: "🔊",
    description: "Volumen de la música ambiental y efectos interactivos (SFX)",
    keywords: ["volumen", "musica", "audio", "sfx", "sonido", "efectos", "fondo", "interfaz", "vinilo", "sound", "volume", "music"],
    targetId: "settings-sound-volume",
  },
  {
    id: "sound-emulation-volume",
    tab: "sound",
    title: "Volumen de Emulación",
    category: "Sonido",
    icon: "🔊",
    description: "Nivel de ganancia y volumen de salida de los juegos",
    keywords: ["volumen", "juego", "ganancia", "master", "audio", "sonido", "emulacion", "retroarch", "decibelios", "sound", "volume"],
    targetId: "settings-emulation-volume",
  },
  {
    id: "sound-output-device",
    tab: "sound",
    title: "Dispositivo de Salida de Audio",
    category: "Sonido",
    icon: "🎧",
    description: "Selección de auriculares, altavoces o conmutador automático",
    keywords: ["audio", "parlantes", "auriculares", "headset", "salida", "altavoces", "dispositivo", "speaker", "sound", "wasapi", "output", "bluetooth"],
    targetId: "settings-audio-device",
  },
  {
    id: "sound-driver",
    tab: "sound",
    title: "Controlador de Audio & Latencia",
    category: "Sonido",
    icon: "🎛️",
    description: "API de sonido en Windows (XAudio2, WASAPI) y búfer de latencia",
    keywords: ["driver", "latencia", "audio", "xaudio", "wasapi", "directsound", "buffer", "ms", "sonido", "api"],
    targetId: "settings-audio-driver",
  },
  {
    id: "sound-music-player",
    tab: "sound",
    title: "Música de Fondo (Reproductor Vinilo)",
    category: "Sonido",
    icon: "🎵",
    description: "Colección de música retro, escanear temas y abrir carpeta de audio",
    keywords: ["musica", "vinilo", "reproductor", "canciones", "temas", "escanear musica", "carpeta musica", "audio", "ost", "soundtrack"],
    targetId: "settings-music-player",
  },
  {
    id: "sound-music-folders",
    tab: "sound",
    title: "Carpetas de Música Personalizadas",
    category: "Sonido",
    icon: "📁",
    description: "Añadir directorios con pistas en MP3, OGG, FLAC, WAV u OPUS",
    keywords: ["carpetas musica", "directorios musica", "musica", "mp3", "ogg", "flac", "wav", "agregar musica"],
    targetId: "settings-music-folders",
  },

  // --- APARIENCIA ---
  {
    id: "appearance-language",
    tab: "appearance",
    title: "Idioma / Language",
    category: "Apariencia",
    icon: "🌐",
    description: "Español o English para toda la interfaz / Interface language",
    keywords: ["idioma", "lenguaje", "language", "ingles", "english", "español", "spanish", "traduccion", "i18n"],
    targetId: "settings-language",
  },
  {
    id: "appearance-themes",
    tab: "appearance",
    title: "Temas Visuales",
    category: "Apariencia",
    icon: "🎨",
    description: "Paletas de iluminación y acento cromático para la interfaz",
    keywords: ["tema", "temas", "color", "colores", "apariencia", "paleta", "interfaz", "gold", "arcade", "snes", "crimson", "midnight", "visual", "theme"],
    targetId: "settings-themes",
  },
  {
    id: "appearance-layout",
    tab: "appearance",
    title: "Estilo de Diseño (Layout)",
    category: "Apariencia",
    icon: "📑",
    description: "Estructura principal: Estilo Clásico (Cards) o Inmersivo (Edge-to-Edge)",
    keywords: ["layout", "diseño", "estilo", "clasico", "inmersivo", "cards", "panoramico", "edge to edge", "interfaz", "disposicion"],
    targetId: "settings-layout",
  },
  {
    id: "appearance-kiosk",
    tab: "appearance",
    title: "Modo Kiosko / Consola",
    category: "Apariencia",
    icon: "📺",
    description: "Iniciar GameFlix en pantalla completa sin bordes de ventana",
    keywords: ["kiosko", "kiosk", "consola", "pantalla completa", "fullscreen", "sin bordes", "modo tv", "borderless"],
    targetId: "settings-kiosk",
  },

  // --- BIBLIOTECA ---
  {
    id: "library-scan",
    tab: "library",
    title: "Escanear Biblioteca",
    category: "Biblioteca",
    icon: "▶",
    description: "Indexar nuevos juegos, verificar cores y descargar carátulas",
    keywords: ["escanear", "scan", "roms", "juegos", "actualizar", "indexar", "buscar juegos", "caratulas", "biblioteca"],
    targetId: "settings-scan",
  },
  {
    id: "library-rom-folders",
    tab: "library",
    title: "Carpetas de ROMs",
    category: "Biblioteca",
    icon: "📂",
    description: "Directorios donde se encuentran los archivos y juegos de tu colección",
    keywords: ["carpetas", "roms", "juegos", "directorios", "rutas", "agregar carpeta", "library", "folder"],
    targetId: "settings-rom-folders",
  },
  {
    id: "library-bios-folders",
    tab: "library",
    title: "Carpetas de BIOS / System",
    category: "Biblioteca",
    icon: "💾",
    description: "Directorios con archivos de BIOS para PlayStation, PS2, Saturn, etc.",
    keywords: ["bios", "system", "firmware", "playstation", "ps1", "ps2", "scph", "archivos bios", "retroarch system"],
    targetId: "settings-bios-folders",
  },
  {
    id: "library-preferences",
    tab: "library",
    title: "Preferencias de Biblioteca (Orden & Región)",
    category: "Biblioteca",
    icon: "🌐",
    description: "Criterio de orden predeterminado y prioridad de región de portadas",
    keywords: ["orden", "ordenar", "alfabetico", "region", "caratulas", "usa", "eur", "jp", "portadas", "prioridad"],
    targetId: "settings-library-prefs",
  },
  {
    id: "library-backup",
    tab: "library",
    title: "Respaldo y Copias de Seguridad",
    category: "Biblioteca",
    icon: "📥",
    description: "Exportar o importar archivo JSON de respaldo de tu biblioteca",
    keywords: ["respaldo", "backup", "exportar", "importar", "json", "guardar biblioteca", "copia de seguridad"],
    targetId: "settings-backup",
  },

  // --- GRÁFICOS HD ---
  {
    id: "graphics-global",
    tab: "graphics",
    title: "Opciones Gráficas Globales",
    category: "Gráficos HD",
    icon: "🌟",
    description: "Filtro bilineal, escalado entero (pixel-perfect) y relación de aspecto",
    keywords: ["graficos", "filtros", "suavizado", "bilineal", "pixel perfect", "escalado", "aspect ratio", "relacion aspecto", "4:3", "16:9"],
    targetId: "settings-graphics-global",
    graphicsConsole: "global",
  },
  {
    id: "graphics-citra",
    tab: "graphics",
    title: "Gráficos Nintendo 3DS (Citra)",
    category: "Gráficos HD",
    icon: "🎮",
    description: "Resolución HD, disposición de pantallas superior/inferior y shaders",
    keywords: ["3ds", "citra", "pantallas", "resolucion", "upscaling", "graficos 3ds", "texturas", "antialiasing", "nintendo 3ds"],
    targetId: "settings-graphics-citra",
    graphicsConsole: "citra",
  },
  {
    id: "graphics-pcsx2",
    tab: "graphics",
    title: "Gráficos PlayStation 2 (PCSX2)",
    category: "Gráficos HD",
    icon: "🎮",
    description: "Resolución interna 1080p/4K, filtrado anisotrópico y parches 16:9",
    keywords: ["ps2", "pcsx2", "playstation 2", "widescreen", "resolucion", "4k", "1080p", "anisotropico", "16:9"],
    targetId: "settings-graphics-pcsx2",
    graphicsConsole: "pcsx2",
  },
  {
    id: "graphics-dolphin",
    tab: "graphics",
    title: "Gráficos GameCube / Wii (Dolphin)",
    category: "Gráficos HD",
    icon: "🎮",
    description: "Resolución EFB, Anti-Aliasing (MSAA) y hack panorámico 16:9",
    keywords: ["dolphin", "gamecube", "wii", "anti-aliasing", "msaa", "resolucion", "widescreen hack"],
    targetId: "settings-graphics-dolphin",
    graphicsConsole: "dolphin",
  },
  {
    id: "graphics-ppsspp",
    tab: "graphics",
    title: "Gráficos PSP (PPSSPP)",
    category: "Gráficos HD",
    icon: "🎮",
    description: "Resolución de renderizado hasta 2K y escalado de texturas xBRZ",
    keywords: ["psp", "ppsspp", "playstation portable", "texturas", "resolucion", "xbrz"],
    targetId: "settings-graphics-ppsspp",
    graphicsConsole: "ppsspp",
  },
  {
    id: "graphics-ps1",
    tab: "graphics",
    title: "Gráficos PS1 (PCSX-ReARMed)",
    category: "Gráficos HD",
    icon: "🎮",
    description: "Modo alta resolución HD (Neon Enhanced) y suavizado de texturas",
    keywords: ["ps1", "psx", "playstation 1", "alta resolucion", "neon enhanced", "suavizado texturas"],
    targetId: "settings-graphics-ps1",
    graphicsConsole: "ps1",
  },
  {
    id: "graphics-n64",
    tab: "graphics",
    title: "Gráficos Nintendo 64 (Mupen64Plus)",
    category: "Gráficos HD",
    icon: "🎮",
    description: "Resolución de renderizado GLideN64 (720p, 1080p, 2K)",
    keywords: ["n64", "nintendo 64", "mupen64plus", "resolucion", "gliden64"],
    targetId: "settings-graphics-n64",
    graphicsConsole: "n64",
  },
  {
    id: "graphics-nds",
    tab: "graphics",
    title: "Gráficos Nintendo DS (MelonDS)",
    category: "Gráficos HD",
    icon: "🎮",
    description: "Distribución de pantallas vertical, horizontal o individual",
    keywords: ["nds", "nintendo ds", "melonds", "pantallas ds", "touch", "vertical", "horizontal"],
    targetId: "settings-graphics-nds",
    graphicsConsole: "nds",
  },

  // --- EMULACIÓN ---
  {
    id: "emulation-gamepads",
    tab: "emulation",
    title: "Mandos y Gamepads Conectados",
    category: "Emulación",
    icon: "🎮",
    description: "Visualizar y verificar mandos y gamepads conectados por USB o Bluetooth",
    keywords: ["mando", "gamepad", "joystick", "control", "conectados", "xbox", "playstation", "bluetooth", "usb"],
    targetId: "settings-gamepads",
  },
  {
    id: "emulation-platform-cores",
    tab: "emulation",
    title: "Cores por Plataforma",
    category: "Emulación",
    icon: "🕹️",
    description: "Asignación de núcleos de RetroArch por consola o plataforma",
    keywords: ["cores", "nucleos", "retroarch", "emulador", "plataforma", "snes9x", "mgba", "nestopia", "genesis"],
    targetId: "settings-platform-cores",
  },

  // --- CUENTAS & INTEGRACIONES ---
  {
    id: "integrations-ra",
    tab: "integrations",
    title: "RetroAchievements (Logros Oficiales)",
    category: "Cuentas",
    icon: "🏆",
    description: "Vincular cuenta de RetroAchievements y activar Modo Hardcore",
    keywords: ["retroachievements", "logros", "cheevos", "usuario", "hardcore", "trofeos", "cuenta", "login", "api key"],
    targetId: "settings-retroachievements",
  },
  {
    id: "integrations-sgdb",
    tab: "integrations",
    title: "SteamGridDB (Carátulas & Posters HD)",
    category: "Cuentas",
    icon: "🎨",
    description: "API Key para descargar héroes panorámicos y portadas HD",
    keywords: ["steamgriddb", "caratulas", "posters", "heroes", "banners", "api key", "scrapear", "imagenes hd"],
    targetId: "settings-steamgriddb",
  },

  // --- PERFILES ---
  {
    id: "profiles-manage",
    tab: "profiles",
    title: "Perfiles & Usuarios",
    category: "Perfiles",
    icon: "👤",
    description: "Cambiar de usuario, crear nuevos perfiles o eliminar perfiles existentes",
    keywords: ["perfil", "perfiles", "usuario", "crear perfil", "cambiar perfil", "eliminar perfil", "cuenta"],
    targetId: "settings-profiles",
  },
  {
    id: "profiles-stats",
    tab: "profiles",
    title: "Estadísticas del Perfil",
    category: "Perfiles",
    icon: "📊",
    description: "Conteo de juegos, favoritos, consolas y carpetas del perfil",
    keywords: ["estadisticas", "total juegos", "favoritos", "consolas", "carpetas", "resumen"],
    targetId: "settings-stats",
  },

  // --- SISTEMA ---
  {
    id: "system-logs",
    tab: "system",
    title: "Registro de Errores (Logs)",
    category: "Sistema",
    icon: "🛠️",
    description: "Visualizar y copiar registros de error para diagnóstico de RetroArch",
    keywords: ["logs", "errores", "registro", "consola", "diagnostico", "copiar log", "fallo"],
    targetId: "settings-logs",
  },
  {
    id: "system-about",
    tab: "system",
    title: "Acerca de GameFlix",
    category: "Sistema",
    icon: "ℹ️",
    description: "Información de la versión, tecnologías y licencias",
    keywords: ["acerca de", "version", "licencia", "gpl", "retroarch", "tauri", "react", "creditos"],
    targetId: "settings-about",
  },

  // --- EMULADORES ---
  {
    id: "emulators-updates",
    tab: "emulators",
    title: "Actualizar Emuladores",
    category: "Emuladores",
    icon: "🎮",
    description: "Versiones instaladas y actualización de RetroArch, RPCS3, Azahar y Sunshine",
    keywords: ["actualizar", "update", "emuladores", "retroarch", "rpcs3", "azahar", "sunshine", "version", "nueva version"],
    targetId: "settings-emulators-list",
  },
  {
    id: "emulators-cores",
    tab: "emulators",
    title: "Actualizar Cores Libretro",
    category: "Emuladores",
    icon: "🎮",
    description: "Re-descargar los cores nightly de libretro usados por tu biblioteca",
    keywords: ["cores", "libretro", "actualizar cores", "nucleo", "nightly", "buildbot"],
    targetId: "settings-emulators-cores",
  },
];

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function searchSettingsOptions(query: string): SettingsSearchOption[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const results: { option: SettingsSearchOption; score: number }[] = [];

  for (const option of SETTINGS_OPTIONS) {
    const titleNorm = normalize(option.title);
    const catNorm = normalize(option.category);
    const descNorm = normalize(option.description);

    let score = 0;

    // Exact title match gets highest priority
    if (titleNorm === q) {
      score += 100;
    } else if (titleNorm.startsWith(q)) {
      score += 60;
    } else if (titleNorm.includes(q)) {
      score += 40;
    }

    // Category match
    if (catNorm.startsWith(q)) {
      score += 35;
    } else if (catNorm.includes(q)) {
      score += 25;
    }

    // Keywords match
    for (const kw of option.keywords) {
      const kwNorm = normalize(kw);
      if (kwNorm === q) {
        score += 50;
        break;
      } else if (kwNorm.startsWith(q)) {
        score += 30;
        break;
      } else if (kwNorm.includes(q)) {
        score += 15;
        break;
      }
    }

    // Description match
    if (descNorm.includes(q)) {
      score += 10;
    }

    if (score > 0) {
      results.push({ option, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.map((r) => r.option);
}
