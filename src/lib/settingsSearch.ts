import type { TFunction } from "i18next";
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

// Raw catalog: titles/categories/descriptions are translation keys resolved
// with t() at render/search time so the settings search follows the UI language.
// `title` is a language-neutral brand fallback used only when titleKey is absent.
interface RawSettingsSearchOption {
  id: string;
  tab: SettingsTab;
  titleKey?: string;
  title?: string;
  categoryKey: string;
  icon: string;
  descKey: string;
  keywords: string[];
  targetId?: string;
  graphicsConsole?: GraphicsConsole;
}

const RAW_OPTIONS: RawSettingsSearchOption[] = [
  // --- SONIDO ---
  {
    id: "sound-interface-volume",
    tab: "sound",
    titleKey: "settings.sound.ifaceVolume",
    categoryKey: "settings.tabs.sound",
    icon: "🔊",
    descKey: "settings.sound.ifaceVolumeDesc",
    keywords: ["volumen", "musica", "audio", "sfx", "sonido", "efectos", "fondo", "interfaz", "vinilo", "sound", "volume", "music"],
    targetId: "settings-sound-volume",
  },
  {
    id: "sound-emulation-volume",
    tab: "sound",
    titleKey: "settings.sound.emuVolume",
    categoryKey: "settings.tabs.sound",
    icon: "🔊",
    descKey: "settings.sound.emuVolumeDesc",
    keywords: ["volumen", "juego", "ganancia", "master", "audio", "sonido", "emulacion", "retroarch", "decibelios", "sound", "volume"],
    targetId: "settings-emulation-volume",
  },
  {
    id: "sound-output-device",
    tab: "sound",
    titleKey: "settings.sound.outTitle",
    categoryKey: "settings.tabs.sound",
    icon: "🎧",
    descKey: "settings.sound.outDesc",
    keywords: ["audio", "parlantes", "auriculares", "headset", "salida", "altavoces", "dispositivo", "speaker", "sound", "wasapi", "output", "bluetooth"],
    targetId: "settings-audio-device",
  },
  {
    id: "sound-driver",
    tab: "sound",
    titleKey: "settings.sound.driverTitle",
    categoryKey: "settings.tabs.sound",
    icon: "🎛️",
    descKey: "settings.sound.driverApiDesc",
    keywords: ["driver", "latencia", "audio", "xaudio", "wasapi", "directsound", "buffer", "ms", "sonido", "api"],
    targetId: "settings-audio-driver",
  },
  {
    id: "sound-music-player",
    tab: "sound",
    titleKey: "settings.sound.musicPlayerTitle",
    categoryKey: "settings.tabs.sound",
    icon: "🎵",
    descKey: "settings.sound.musicPlayerDesc",
    keywords: ["musica", "vinilo", "reproductor", "canciones", "temas", "escanear musica", "carpeta musica", "audio", "ost", "soundtrack", "music", "vinyl"],
    targetId: "settings-music-player",
  },
  {
    id: "sound-music-folders",
    tab: "sound",
    titleKey: "settings.sound.musicFoldersTitle",
    categoryKey: "settings.tabs.sound",
    icon: "📁",
    descKey: "settings.sound.musicFoldersDesc1",
    keywords: ["carpetas musica", "directorios musica", "musica", "mp3", "ogg", "flac", "wav", "agregar musica", "music folders"],
    targetId: "settings-music-folders",
  },

  // --- APARIENCIA ---
  {
    id: "appearance-language",
    tab: "appearance",
    titleKey: "settings.appearance.language",
    categoryKey: "settings.tabs.appearance",
    icon: "🌐",
    descKey: "settings.appearance.languageSubtitle",
    keywords: ["idioma", "lenguaje", "language", "ingles", "english", "español", "spanish", "traduccion", "i18n"],
    targetId: "settings-language",
  },
  {
    id: "appearance-themes",
    tab: "appearance",
    titleKey: "settings.appearance.themesTitle",
    categoryKey: "settings.tabs.appearance",
    icon: "🎨",
    descKey: "settings.appearance.themesDesc",
    keywords: ["tema", "temas", "color", "colores", "apariencia", "paleta", "interfaz", "gold", "arcade", "snes", "crimson", "midnight", "visual", "theme"],
    targetId: "settings-themes",
  },
  {
    id: "appearance-layout",
    tab: "appearance",
    titleKey: "settings.appearance.layoutStyle",
    categoryKey: "settings.tabs.appearance",
    icon: "📑",
    descKey: "settings.appearance.layoutDesc",
    keywords: ["layout", "diseño", "estilo", "clasico", "inmersivo", "cards", "panoramico", "edge to edge", "interfaz", "disposicion", "design"],
    targetId: "settings-layout",
  },
  {
    id: "appearance-kiosk",
    tab: "appearance",
    titleKey: "settings.appearance.kioskTitle",
    categoryKey: "settings.tabs.appearance",
    icon: "📺",
    descKey: "settings.appearance.kioskDesc",
    keywords: ["kiosko", "kiosk", "consola", "pantalla completa", "fullscreen", "sin bordes", "modo tv", "borderless"],
    targetId: "settings-kiosk",
  },
  {
    id: "appearance-splash",
    tab: "appearance",
    titleKey: "settings.appearance.splashSection",
    categoryKey: "settings.tabs.appearance",
    icon: "🎬",
    descKey: "settings.appearance.splashSubtitle",
    keywords: ["animacion", "splash", "intro", "inicio", "arranque", "boot", "sonido", "apertura", "bienvenida", "consola", "cinematica", "animation"],
    targetId: "settings-splash",
  },

  // --- BIBLIOTECA ---
  {
    id: "library-scan",
    tab: "library",
    titleKey: "settings.librarySection.scanTitle",
    categoryKey: "settings.tabs.library",
    icon: "▶",
    descKey: "settings.librarySection.scanDesc",
    keywords: ["escanear", "scan", "roms", "juegos", "actualizar", "indexar", "buscar juegos", "caratulas", "biblioteca", "games"],
    targetId: "settings-scan",
  },
  {
    id: "library-rom-folders",
    tab: "library",
    titleKey: "settings.librarySection.romTitle",
    categoryKey: "settings.tabs.library",
    icon: "📂",
    descKey: "settings.librarySection.romDesc",
    keywords: ["carpetas", "roms", "juegos", "directorios", "rutas", "agregar carpeta", "library", "folder"],
    targetId: "settings-rom-folders",
  },
  {
    id: "library-bios-folders",
    tab: "library",
    titleKey: "settings.librarySection.biosTitle",
    categoryKey: "settings.tabs.library",
    icon: "💾",
    descKey: "settings.librarySection.biosDesc",
    keywords: ["bios", "system", "firmware", "playstation", "ps1", "ps2", "scph", "archivos bios", "retroarch system"],
    targetId: "settings-bios-folders",
  },
  {
    id: "library-preferences",
    tab: "library",
    titleKey: "settings.librarySection.prefsTitle",
    categoryKey: "settings.tabs.library",
    icon: "🌐",
    descKey: "settings.librarySection.sortDefaultDesc",
    keywords: ["orden", "ordenar", "alfabetico", "region", "caratulas", "usa", "eur", "jp", "portadas", "prioridad", "sort"],
    targetId: "settings-library-prefs",
  },
  {
    id: "library-backup",
    tab: "library",
    titleKey: "settings.librarySection.backupTitle",
    categoryKey: "settings.tabs.library",
    icon: "📥",
    descKey: "settings.librarySection.backupDesc",
    keywords: ["respaldo", "backup", "exportar", "importar", "json", "guardar biblioteca", "copia de seguridad"],
    targetId: "settings-backup",
  },

  // --- GRÁFICOS HD ---
  {
    id: "graphics-global",
    tab: "graphics",
    titleKey: "settings.graphics.globalTitle",
    categoryKey: "settings.tabs.graphics",
    icon: "🌟",
    descKey: "settings.graphics.globalDesc",
    keywords: ["graficos", "filtros", "suavizado", "bilineal", "pixel perfect", "escalado", "aspect ratio", "relacion aspecto", "4:3", "16:9", "graphics"],
    targetId: "settings-graphics-global",
    graphicsConsole: "global",
  },
  {
    id: "graphics-citra",
    tab: "graphics",
    titleKey: "settings.graphics.citraTitle",
    categoryKey: "settings.tabs.graphics",
    icon: "🎮",
    descKey: "settings.graphics.citraDesc",
    keywords: ["3ds", "citra", "pantallas", "resolucion", "upscaling", "graficos 3ds", "texturas", "antialiasing", "nintendo 3ds"],
    targetId: "settings-graphics-citra",
    graphicsConsole: "citra",
  },
  {
    id: "graphics-pcsx2",
    tab: "graphics",
    titleKey: "settings.graphics.pcsx2Title",
    categoryKey: "settings.tabs.graphics",
    icon: "🎮",
    descKey: "settings.graphics.pcsx2Desc",
    keywords: ["ps2", "pcsx2", "playstation 2", "widescreen", "resolucion", "4k", "1080p", "anisotropico", "16:9"],
    targetId: "settings-graphics-pcsx2",
    graphicsConsole: "pcsx2",
  },
  {
    id: "graphics-dolphin",
    tab: "graphics",
    titleKey: "settings.graphics.dolphinTitle",
    categoryKey: "settings.tabs.graphics",
    icon: "🎮",
    descKey: "settings.graphics.dolphinDesc",
    keywords: ["dolphin", "gamecube", "wii", "anti-aliasing", "msaa", "resolucion", "widescreen hack"],
    targetId: "settings-graphics-dolphin",
    graphicsConsole: "dolphin",
  },
  {
    id: "graphics-ppsspp",
    tab: "graphics",
    titleKey: "settings.graphics.ppssppTitle",
    categoryKey: "settings.tabs.graphics",
    icon: "🎮",
    descKey: "settings.graphics.ppssppDesc",
    keywords: ["psp", "ppsspp", "playstation portable", "texturas", "resolucion", "xbrz"],
    targetId: "settings-graphics-ppsspp",
    graphicsConsole: "ppsspp",
  },
  {
    id: "graphics-ps1",
    tab: "graphics",
    titleKey: "settings.graphics.ps1Title",
    categoryKey: "settings.tabs.graphics",
    icon: "🎮",
    descKey: "settings.graphics.ps1Desc",
    keywords: ["ps1", "psx", "playstation 1", "alta resolucion", "neon enhanced", "suavizado texturas"],
    targetId: "settings-graphics-ps1",
    graphicsConsole: "ps1",
  },
  {
    id: "graphics-n64",
    tab: "graphics",
    titleKey: "settings.graphics.n64Title",
    categoryKey: "settings.tabs.graphics",
    icon: "🎮",
    descKey: "settings.graphics.n64Desc",
    keywords: ["n64", "nintendo 64", "mupen64plus", "resolucion", "gliden64"],
    targetId: "settings-graphics-n64",
    graphicsConsole: "n64",
  },
  {
    id: "graphics-nds",
    tab: "graphics",
    titleKey: "settings.graphics.ndsTitle",
    categoryKey: "settings.tabs.graphics",
    icon: "🎮",
    descKey: "settings.graphics.ndsDesc",
    keywords: ["nds", "nintendo ds", "melonds", "pantallas ds", "touch", "vertical", "horizontal"],
    targetId: "settings-graphics-nds",
    graphicsConsole: "nds",
  },

  // --- EMULACIÓN ---
  {
    id: "emulation-gamepads",
    tab: "emulation",
    titleKey: "settings.emulation.padsTitle",
    categoryKey: "settings.tabs.emulation",
    icon: "🎮",
    descKey: "settings.emulation.padHint",
    keywords: ["mando", "gamepad", "joystick", "control", "conectados", "xbox", "playstation", "bluetooth", "usb", "controller"],
    targetId: "settings-gamepads",
  },
  {
    id: "emulation-platform-cores",
    tab: "emulation",
    titleKey: "settings.emulation.coresTitle",
    categoryKey: "settings.tabs.emulation",
    icon: "🕹️",
    descKey: "settings.emulation.coresDesc",
    keywords: ["cores", "nucleos", "retroarch", "emulador", "plataforma", "snes9x", "mgba", "nestopia", "genesis"],
    targetId: "settings-platform-cores",
  },

  // --- CUENTAS & INTEGRACIONES ---
  {
    id: "integrations-ra",
    tab: "integrations",
    title: "RetroAchievements",
    categoryKey: "settings.tabs.integrations",
    icon: "🏆",
    descKey: "settings.integrations.raDesc",
    keywords: ["retroachievements", "logros", "cheevos", "usuario", "hardcore", "trofeos", "cuenta", "login", "api key", "achievements"],
    targetId: "settings-retroachievements",
  },
  {
    id: "integrations-sgdb",
    tab: "integrations",
    titleKey: "settings.integrations.sgdbTitle",
    categoryKey: "settings.tabs.integrations",
    icon: "🎨",
    descKey: "settings.integrations.sgdbDesc",
    keywords: ["steamgriddb", "caratulas", "posters", "heroes", "banners", "api key", "scrapear", "imagenes hd", "covers"],
    targetId: "settings-steamgriddb",
  },

  // --- PERFILES ---
  {
    id: "profiles-manage",
    tab: "profiles",
    titleKey: "settings.profiles.panelTitle",
    categoryKey: "settings.tabs.profiles",
    icon: "👤",
    descKey: "settings.profiles.panelDesc",
    keywords: ["perfil", "perfiles", "usuario", "crear perfil", "cambiar perfil", "eliminar perfil", "cuenta", "profile"],
    targetId: "settings-profiles",
  },
  {
    id: "profiles-stats",
    tab: "profiles",
    titleKey: "settings.profiles.statsTitle",
    categoryKey: "settings.tabs.profiles",
    icon: "📊",
    descKey: "settings.profiles.panelDesc",
    keywords: ["estadisticas", "total juegos", "favoritos", "consolas", "carpetas", "resumen", "stats"],
    targetId: "settings-stats",
  },

  // --- SISTEMA ---
  {
    id: "system-logs",
    tab: "system",
    titleKey: "settings.systemPanel.logsTitle",
    categoryKey: "settings.tabs.system",
    icon: "🛠️",
    descKey: "settings.systemPanel.logsDesc",
    keywords: ["logs", "errores", "registro", "consola", "diagnostico", "copiar log", "fallo", "errors"],
    targetId: "settings-logs",
  },
  {
    id: "system-about",
    tab: "system",
    titleKey: "settings.systemPanel.aboutTitle",
    categoryKey: "settings.tabs.system",
    icon: "ℹ️",
    descKey: "settings.systemPanel.panelDesc",
    keywords: ["acerca de", "version", "licencia", "gpl", "retroarch", "tauri", "react", "creditos", "about"],
    targetId: "settings-about",
  },

  // --- EMULADORES ---
  {
    id: "emulators-updates",
    tab: "emulators",
    titleKey: "settings.tabs.emulators",
    categoryKey: "settings.tabs.emulators",
    icon: "🎮",
    descKey: "settings.emulators.subtitle",
    keywords: ["actualizar", "update", "emuladores", "retroarch", "rpcs3", "azahar", "sunshine", "version", "nueva version"],
    targetId: "settings-emulators-list",
  },
  {
    id: "emulators-cores",
    tab: "emulators",
    titleKey: "settings.emulators.updateCores",
    categoryKey: "settings.tabs.emulators",
    icon: "🎮",
    descKey: "settings.emulators.subtitle",
    keywords: ["cores", "libretro", "actualizar cores", "nucleo", "nightly", "buildbot"],
    targetId: "settings-emulators-cores",
  },
];

type TFn = TFunction | ((key: string) => string);

function tr(t: TFn | undefined, key: string, fallback: string): string {
  if (!t) return fallback;
  if (typeof t === "function") return (t as (key: string) => string)(key);
  return (t as TFunction)(key);
}

/** Resolve the raw catalog into display strings for the active language. */
export function resolveSettingsOptions(t?: TFn): SettingsSearchOption[] {
  return RAW_OPTIONS.map((o) => ({
    id: o.id,
    tab: o.tab,
    title: o.titleKey ? tr(t, o.titleKey, o.title ?? o.titleKey) : (o.title ?? ""),
    category: tr(t, o.categoryKey, o.categoryKey),
    icon: o.icon,
    description: tr(t, o.descKey, o.descKey),
    keywords: o.keywords,
    targetId: o.targetId,
    graphicsConsole: o.graphicsConsole,
  }));
}

// Backward-compat: default (Spanish) catalog for callers without i18n.
export const SETTINGS_OPTIONS: SettingsSearchOption[] = resolveSettingsOptions(undefined);

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function searchSettingsOptions(query: string, t?: TFn): SettingsSearchOption[] {
  const q = normalize(query.trim());
  if (!q) return [];

  const options = t ? resolveSettingsOptions(t) : SETTINGS_OPTIONS;
  const results: { option: SettingsSearchOption; score: number }[] = [];

  for (const option of options) {
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
