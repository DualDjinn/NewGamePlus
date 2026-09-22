export interface Game {
  id: string;
  name: string;
  display_name: string | null;
  platform: string;
  rom_path: string;
  core_name: string;
  cover_path: string | null;
  favorite: boolean;
  last_played: string | null;
  genre: string | null;
  play_time_secs?: number | null;
  hero_path?: string | null;
  logo_path?: string | null;
  custom_title?: boolean | null;
  developer?: string | null;
  publisher?: string | null;
  release_year?: number | null;
  region?: string | null;
}

export interface SGDBLogo {
  id: number;
  url: string;
  thumb: string;
  width: number;
  height: number;
  style?: string | null;
  language?: string | null;
  author?: {
    name?: string;
    avatar?: string;
  };
}

export interface SGDBHero {
  id: number;
  url: string;
  thumb: string;
  width: number;
  height: number;
  style?: string | null;
  author?: {
    name?: string;
    avatar?: string;
  };
}

export interface SGDBGrid {
  id: number;
  url: string;
  thumb: string;
  width: number;
  height: number;
  score?: number | null;
  author?: {
    name?: string;
    avatar?: string;
  };
}

export interface FixMatchCandidate {
  id: number;
  name: string;
  release_year: number | null;
  cover_thumb: string | null;
  cover_url: string | null;
  genre?: string | null;
  developer?: string | null;
  publisher?: string | null;
  platform?: string | null;
  region?: string | null;
}

export interface MusicTrack {
  id: string;
  file: string;
  file_path?: string;
  title: string;
  game: string;
  platform: string;
}

export interface ScanResult {
  games: Game[];
  cores_installed: string[];
  cores_needed: string[];
}

export type ThemeId = "gold" | "arcade" | "console" | "snes" | "crimson";
export type LayoutStyle = "classic" | "immersive";

export interface AppSettings {
  folders: string[];
  kiosk_mode: boolean;
  profiles: {
    name: string;
    favorites: string[];
    last_played?: Record<string, string>;
    play_time_secs?: Record<string, number>;
    theme?: string;
    layout_style?: LayoutStyle | string;
    steamgriddb_api_key?: string;
  }[];
  current_profile: string;
  platform_cores: Record<string, string>;
  theme?: ThemeId | string;
  layout_style?: LayoutStyle | string;
  bios_folder?: string | null;
  bios_folders?: string[];
  music_volume?: number;
  music_folders?: string[];
  last_emulator_check_secs?: number;
  auto_update_check?: boolean;
}

export type Section = "home" | "library" | "favorites" | "search" | "settings" | "genre" | "genres";

export type SettingsTab = "library" | "appearance" | "graphics" | "sound" | "emulation" | "emulators" | "integrations" | "profiles" | "system";
export type GraphicsConsole = "global" | "citra" | "pcsx2" | "dolphin" | "ppsspp" | "ps1" | "n64" | "nds";

export type SortKey = "name" | "platform" | "last_played";

export interface GameMetadata {
  display_name: string | null;
  release_year: number | null;
  release_month: number | null;
  developer: string | null;
  publisher: string | null;
  genre: string | null;
  franchise: string | null;
  region: string | null;
  rating: string | null;
}

export interface Achievement {
  id: number;
  title: string;
  description: string;
  points: number;
  badge_name: string;
  date_earned: string | null;
  date_earned_hardcore: string | null;
}

export interface GameAchievementProgress {
  ra_game_id: number;
  game_title: string;
  console_name: string;
  icon_url: string;
  total: number;
  unlocked: number;
  unlocked_hc: number;
  completion_pct: number;
  achievements: Achievement[];
}

export interface EmulatorInfo {
  id: string;
  display_name: string;
  installed: boolean;
  installed_version: string | null;
  latest_version: string | null;
  update_available: boolean;
  exe_path?: string | null;
}
