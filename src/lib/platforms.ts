export const PLATFORM_COLORS: Record<string, string> = {
  SNES: "#8b45a6",
  NES: "#d42b2b",
  N64: "#006bba",
  GBA: "#4a8c5c",
  GB: "#9bbc0f",
  GBC: "#00b4d8",
  NDS: "#c83232",
  "3DS": "#e63946",
  GAMECUBE: "#6a0dad",
  VB: "#d90429",
  MEGA_DRIVE: "#4a4a4a",
  PS1: "#003087",
  PS2: "#00439c",
  PS3: "#003791",
  PSP: "#003087",
  DREAMCAST: "#ff6600",
  SMS: "#1a5276",
  GAME_GEAR: "#117a65",
  PCE: "#7d3c98",
  "32X": "#2c3e50",
  NEOGEO: "#c0392b",
  MAME: "#d35400",
  NGP: "#b7950b",
  LYNX: "#d4ac0d",
  WSWAN: "#2e86c1",
  COLECOVISION: "#6c3483",
  PC: "#00a4ef",
};

export const PLATFORM_COMPANIES: Record<string, string> = {
  // PC / Windows
  PC: "PC",

  // Nintendo
  NES: "Nintendo",
  SNES: "Nintendo",
  N64: "Nintendo",
  GB: "Nintendo",
  GBC: "Nintendo",
  GBA: "Nintendo",
  NDS: "Nintendo",
  "3DS": "Nintendo",
  GAMECUBE: "Nintendo",
  VB: "Nintendo",

  // PlayStation / Sony
  PS1: "PlayStation",
  PSP: "PlayStation",
  PS2: "PlayStation",
  PS3: "PlayStation",

  // Sega
  MEGA_DRIVE: "Sega",
  SMS: "Sega",
  GAME_GEAR: "Sega",
  "32X": "Sega",
  DREAMCAST: "Sega",
  SATURN: "Sega",

  // Arcade / SNK
  NEOGEO: "Arcade",
  MAME: "Arcade",
  FBNEO: "Arcade",
  ARCADE: "Arcade",
  NGP: "SNK",

  // Otros
  PCE: "NEC",
  WSWAN: "Bandai",
  LYNX: "Atari",
  COLECOVISION: "Coleco",
};

export const PLATFORM_NAMES: Record<string, string> = {
  SNES: "Super Nintendo (SNES)",
  NES: "Nintendo Entertainment System (NES)",
  N64: "Nintendo 64 (N64)",
  GBA: "Game Boy Advance (GBA)",
  GB: "Game Boy (GB)",
  GBC: "Game Boy Color (GBC)",
  NDS: "Nintendo DS (NDS)",
  "3DS": "Nintendo 3DS (3DS)",
  GAMECUBE: "Nintendo GameCube",
  VB: "Virtual Boy",
  MEGA_DRIVE: "Sega Genesis / Mega Drive",
  PS1: "PlayStation (PS1)",
  PS2: "PlayStation 2 (PS2)",
  PS3: "PlayStation 3 (PS3)",
  PSP: "PlayStation Portable (PSP)",
  DREAMCAST: "Sega Dreamcast",
  SATURN: "Sega Saturn",
  SMS: "Sega Master System",
  GAME_GEAR: "Sega Game Gear",
  PCE: "PC Engine / TurboGrafx-16",
  "32X": "Sega 32X",
  NEOGEO: "Neo Geo",
  MAME: "Arcade (MAME)",
  FBNEO: "FinalBurn Neo",
  ARCADE: "Arcade Classics",
  NGP: "Neo Geo Pocket",
  LYNX: "Atari Lynx",
  WSWAN: "WonderSwan",
  COLECOVISION: "ColecoVision",
  PC: "Juegos de PC",
};

export function getPlatformDisplayName(platform: string): string {
  return PLATFORM_NAMES[platform.toUpperCase()] || platform.toUpperCase();
}

export function getPlatformCompany(platform: string): string {
  return PLATFORM_COMPANIES[platform.toUpperCase()] || "Otros";
}

export const PLATFORM_LOGOS: Record<string, string> = {
  // Nintendo
  "3DS": "/logos/Nintendo/3DS.png",
  N3DS: "/logos/Nintendo/3DS.png",
  GB: "/logos/Nintendo/GB.png",
  GAMEBOY: "/logos/Nintendo/GB.png",
  GBA: "/logos/Nintendo/GBA.png",
  GAMEBOYADVANCE: "/logos/Nintendo/GBA.png",
  GBC: "/logos/Nintendo/GBC.png",
  GAMEBOYCOLOR: "/logos/Nintendo/GBC.png",
  N64: "/logos/Nintendo/N64.png",
  NINTENDO64: "/logos/Nintendo/N64.png",
  NDS: "/logos/Nintendo/NDS.png",
  DS: "/logos/Nintendo/NDS.png",
  NES: "/logos/Nintendo/NES.png",
  GAMECUBE: "/logos/Nintendo/NGC.png",
  NGC: "/logos/Nintendo/NGC.png",
  GC: "/logos/Nintendo/NGC.png",
  SWITCH: "/logos/Nintendo/NintendoSwitch.png",
  NINTENDOSWITCH: "/logos/Nintendo/NintendoSwitch.png",
  SNES: "/logos/Nintendo/SNES.png",
  SFC: "/logos/Nintendo/SNES.png",
  WII: "/logos/Nintendo/WII.png",
  WIIU: "/logos/Nintendo/WIIU.png",

  // PlayStation
  PS1: "/logos/Playstation/PS1.png",
  PSX: "/logos/Playstation/PS1.png",
  PLAYSTATION: "/logos/Playstation/PS1.png",
  PS2: "/logos/Playstation/ps2.png",
  PLAYSTATION2: "/logos/Playstation/ps2.png",
  PS3: "/logos/Playstation/ps3.png",
  PLAYSTATION3: "/logos/Playstation/ps3.png",
  PSP: "/logos/Playstation/psp.png",
  PSVITA: "/logos/Playstation/psvita.png",
  VITA: "/logos/Playstation/psvita.png",

  // Sega
  MEGA_DRIVE: "/logos/Sega/SMD.png",
  MEGADRIVE: "/logos/Sega/SMD.png",
  GENESIS: "/logos/Sega/SMD.png",
  SMD: "/logos/Sega/SMD.png",
  SMS: "/logos/Sega/SMS.png",
  MASTERSYSTEM: "/logos/Sega/SMS.png",

  // Arcade / SNK
  MAME: "/logos/Mame/Mame.png",
  ARCADE: "/logos/Mame/Mame.png",
  FBNEO: "/logos/Mame/Mame.png",
  NEOGEO: "/logos/NeoGeo/NeoGeo.png",
  NEO_GEO: "/logos/NeoGeo/NeoGeo.png",
  NGP: "/logos/NeoGeo/NeoGeo.png",
  NEOGEOPOCKET: "/logos/NeoGeo/NeoGeo.png",

  // PC / Windows
  PC: "/logos/PC/PC.png",
  WINDOWS: "/logos/PC/PC.png",
  JUEGOSDEPC: "/logos/PC/PC.png",
  JUEGOS_DE_PC: "/logos/PC/PC.png",
};

export function getPlatformLogo(platform: string): string | null {
  if (!platform) return null;
  const upper = platform.toUpperCase().trim();
  if (PLATFORM_LOGOS[upper]) return PLATFORM_LOGOS[upper];
  const clean = upper.replace(/[\s\-_]+/g, "");
  if (PLATFORM_LOGOS[clean]) return PLATFORM_LOGOS[clean];
  const under = upper.replace(/\s+/g, "_");
  if (PLATFORM_LOGOS[under]) return PLATFORM_LOGOS[under];
  return null;
}

