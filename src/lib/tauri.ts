import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Game, ScanResult, AppSettings, GameMetadata, GameAchievementProgress, SGDBHero, SGDBLogo, SGDBGrid, FixMatchCandidate, MusicTrack, EmulatorInfo, ControllerMapping, SaveSlotInfo } from "../types";

export function getCoverUrl(path: string | null | undefined): string {
  if (!path) return "";
  try {
    return convertFileSrc(path);
  } catch {
    return "";
  }
}

// Cover cache: path -> data URI (fallback)
const coverCache = new Map<string, string>();

export async function getCoverDataUri(path: string | null): Promise<string> {
  if (!path) return "";
  const cached = coverCache.get(path);
  if (cached) return cached;
  try {
    const uri = await invoke<string | null>("get_cover_data_uri", { path });
    if (uri) {
      coverCache.set(path, uri);
      return uri;
    }
  } catch (e) {
    console.error("Cover load failed:", e);
  }
  return "";
}

export async function scanAndFetchCores(folders: string[]): Promise<ScanResult> {
  return invoke<ScanResult>("scan_and_fetch_cores", { folders });
}

const launchAudio = typeof Audio !== "undefined" ? new Audio("/sounds/game_launch.mp3") : null;
let activeLaunchedRomPath: string | null = null;
let isGameLaunching = false;

export function getActiveLaunchedRomPath(): string | null {
  return activeLaunchedRomPath;
}

// Global listener: whenever RetroArch or any emulator exits, reset running state and dispatch "game-closed"
if (typeof window !== "undefined") {
  try {
    listen<string>("retroarch-exited", (e) => {
      isGameLaunching = false;
      activeLaunchedRomPath = null;
      window.dispatchEvent(new CustomEvent("game-closed", { detail: { romPath: e.payload } }));
    }).catch(() => {});
  } catch {
    // Non-Tauri environment fallback
  }
}

export async function launchGame(romPath: string): Promise<string> {
  if (isGameLaunching || activeLaunchedRomPath !== null) {
    console.warn("Un juego ya se está ejecutando o iniciando.");
    return "Juego ya en ejecución";
  }
  isGameLaunching = true;
  activeLaunchedRomPath = romPath;
  if (launchAudio) {
    const sfxVol = parseFloat(localStorage.getItem("gameflix_sfx_volume") ?? "0.8");
    launchAudio.volume = isNaN(sfxVol) ? 0.8 : Math.max(0, Math.min(1, sfxVol));
    launchAudio.currentTime = 0;
    launchAudio.play().catch((err: unknown) => {
      console.warn("No se pudo reproducir el sonido de inicio:", err);
    });
  }
  window.dispatchEvent(new CustomEvent("game-launched", { detail: { romPath } }));
  try {
    const result = await invoke<string>("launch_game", { romPath });
    // Standalone emulator that exited synchronously:
    if (result === "Game exited cleanly") {
      isGameLaunching = false;
      activeLaunchedRomPath = null;
      window.dispatchEvent(new CustomEvent("game-closed", { detail: { romPath } }));
    }
    return result;
  } catch (err) {
    // Launch failed: reset state and dispatch game-closed so music and UI resume
    isGameLaunching = false;
    activeLaunchedRomPath = null;
    window.dispatchEvent(new CustomEvent("game-closed", { detail: { romPath } }));
    throw err;
  } finally {
    isGameLaunching = false;
  }
}

export async function checkCore(coreName: string): Promise<boolean> {
  return invoke<boolean>("check_core", { coreName });
}

export async function toggleFavorite(gameId: string): Promise<boolean> {
  return invoke<boolean>("toggle_favorite", { gameId });
}

export async function getGames(): Promise<Game[]> {
  return invoke<Game[]>("get_games");
}

export async function getFavoritesList(): Promise<string[]> {
  return invoke<string[]>("get_favorites_list");
}

export async function checkRetroarch(): Promise<boolean> {
  return invoke<boolean>("check_retroarch");
}

export async function checkRpcs3(): Promise<boolean> {
  return invoke<boolean>("check_rpcs3");
}

export async function checkAzahar(): Promise<boolean> {
  return invoke<boolean>("check_azahar");
}

export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>("get_settings");
}

export async function saveSettings(folders: string[], kioskMode?: boolean): Promise<void> {
  return invoke<void>("save_settings", { folders, kioskMode });
}

export async function setKioskMode(enabled: boolean): Promise<void> {
  return invoke<void>("set_kiosk_mode", { enabled });
}

export async function setAutoUpdateCheck(enabled: boolean): Promise<void> {
  return invoke<void>("set_auto_update_check", { enabled });
}

export async function setTheme(theme: string): Promise<void> {
  return invoke<void>("set_theme", { theme });
}

export async function setLayoutStyle(style: string): Promise<void> {
  return invoke<void>("set_layout_style", { style });
}

export async function updateGameCore(gameId: string, coreName: string): Promise<void> {
  return invoke<void>("update_game_core", { gameId, coreName });
}

export async function createProfile(name: string): Promise<void> {
  return invoke<void>("create_profile", { name });
}

export async function deleteProfile(name: string): Promise<void> {
  return invoke<void>("delete_profile", { name });
}

export async function switchProfile(name: string): Promise<void> {
  return invoke<void>("switch_profile", { name });
}

export async function exportLibrary(): Promise<string> {
  return invoke<string>("export_library");
}

export async function importLibrary(json: string): Promise<void> {
  return invoke<void>("import_library", { json });
}

export async function getErrorLogs(): Promise<string> {
  return invoke<string>("get_error_logs");
}

export async function getGameMetadata(romPath: string): Promise<GameMetadata | null> {
  return invoke<GameMetadata | null>("get_game_metadata", { romPath });
}

export async function savePlatformCores(cores: Record<string, string>): Promise<void> {
  return invoke<void>("save_platform_cores", { cores });
}

export async function saveBiosFolder(folder: string | null): Promise<void> {
  return invoke<void>("save_bios_folder", { folder });
}

export async function getBiosFolder(): Promise<string | null> {
  return invoke<string | null>("get_bios_folder");
}

export async function saveBiosFolders(folders: string[]): Promise<void> {
  return invoke<void>("save_bios_folders", { folders });
}

export async function getBiosFolders(): Promise<string[]> {
  return invoke<string[]>("get_bios_folders");
}

export function onRetroarchExited(cb: (romPath: string) => void) {
  return listen<string>("retroarch-exited", (e) => cb(e.payload));
}

export interface ScanProgressEvent {
  phase: "scan" | "roms" | "cores";
  current: number;
  total: number;
  label?: string;
}

export function onScanProgress(cb: (data: ScanProgressEvent) => void) {
  return listen("scan-progress", (e) => cb(e.payload as ScanProgressEvent));
}

export function onSetupStatus(cb: (msg: string) => void) {
  return listen<string>("setup-status", (e) => cb(e.payload));
}

export function onCoversUpdated(cb: () => void) {
  return listen("covers-updated", () => cb());
}

export async function saveRACredentials(username: string, password: string, apiKey: string): Promise<void> {
  return invoke<void>("save_ra_credentials", { username, password, apiKey });
}

export async function getRACredentials(): Promise<string | null> {
  return invoke<string | null>("get_ra_credentials");
}

export async function clearRACredentials(): Promise<void> {
  return invoke<void>("clear_ra_credentials");
}

export async function getGameAchievements(romPath: string): Promise<GameAchievementProgress | null> {
  return invoke<GameAchievementProgress | null>("get_game_achievements", { romPath });
}

export async function refreshGameAchievements(romPath: string): Promise<GameAchievementProgress | null> {
  return invoke<GameAchievementProgress | null>("refresh_game_achievements", { romPath });
}

export async function setCheevosHardcore(enabled: boolean): Promise<void> {
  return invoke<void>("set_cheevos_hardcore", { enabled });
}

export async function saveSteamGridDBKey(apiKey: string): Promise<void> {
  return invoke<void>("save_steamgriddb_key", { apiKey });
}

export async function getSteamGridDBKey(): Promise<boolean> {
  return invoke<boolean>("get_steamgriddb_key");
}

export async function clearSteamGridDBKey(): Promise<void> {
  return invoke<void>("clear_steamgriddb_key");
}

export async function searchSteamGridDBHeroes(gameName: string): Promise<SGDBHero[]> {
  return invoke<SGDBHero[]>("search_steamgriddb_heroes", { gameName });
}

export async function setGameHero(gameId: string, heroUrl: string): Promise<string> {
  return invoke<string>("set_game_hero", { gameId, heroUrl });
}

export async function removeGameHero(gameId: string): Promise<void> {
  return invoke<void>("remove_game_hero", { gameId });
}

export async function searchSteamGridDBLogos(gameName: string): Promise<SGDBLogo[]> {
  return invoke<SGDBLogo[]>("search_steamgriddb_logos", { gameName });
}

export async function setGameLogo(gameId: string, logoUrl: string): Promise<string> {
  return invoke<string>("set_game_logo", { gameId, logoUrl });
}

export async function removeGameLogo(gameId: string): Promise<void> {
  return invoke<void>("remove_game_logo", { gameId });
}

export interface GraphicsSettings {
  video_smooth: boolean;
  video_scale_integer: boolean;
  aspect_ratio: string;
  audio_driver?: string;
  audio_device?: string;
  audio_latency?: number;
  audio_volume?: number;
  core_options: Record<string, string>;
}

export async function getGraphicsSettings(): Promise<GraphicsSettings> {
  return invoke<GraphicsSettings>("get_graphics_settings");
}

export async function saveGraphicsSettings(graphics: GraphicsSettings): Promise<void> {
  return invoke<void>("save_graphics_settings", { graphics });
}

export async function getAudioOutputDevices(): Promise<string[]> {
  return invoke<string[]>("get_audio_output_devices");
}

export async function getMusicTracks(): Promise<MusicTrack[]> {
  return invoke<MusicTrack[]>("get_music_tracks");
}

export async function openMusicFolder(): Promise<void> {
  return invoke<void>("open_music_folder");
}

export async function saveMusicVolume(volume: number): Promise<void> {
  return invoke<void>("save_music_volume", { volume });
}

export async function getMusicVolume(): Promise<number> {
  return invoke<number>("get_music_volume");
}

export async function saveMusicFolders(folders: string[]): Promise<void> {
  return invoke<void>("save_music_folders", { folders });
}

export async function getMusicFolders(): Promise<string[]> {
  return invoke<string[]>("get_music_folders");
}

export async function fixMatchSearch(
  title: string,
  year?: number | null,
  agent?: string,
  platform?: string
): Promise<FixMatchCandidate[]> {
  return invoke<FixMatchCandidate[]>("fix_match_search", {
    title,
    year: year || null,
    agent: agent || "steamgriddb",
    platform: platform || null,
  });
}

export async function fixMatchGetCovers(gameId: number): Promise<SGDBGrid[]> {
  return invoke<SGDBGrid[]>("fix_match_get_covers", { gameId });
}

export async function applyFixMatch(
  gameId: string,
  newTitle?: string | null,
  coverUrl?: string | null,
  releaseYear?: number | null,
  genre?: string | null,
  developer?: string | null,
  publisher?: string | null,
  region?: string | null,
  applyMetadata: boolean = true,
  applyCover: boolean = true
): Promise<Game> {
  return invoke<Game>("apply_fix_match", {
    gameId,
    newTitle: newTitle || null,
    coverUrl: coverUrl || null,
    releaseYear: releaseYear || null,
    genre: genre || null,
    developer: developer || null,
    publisher: publisher || null,
    region: region || null,
    applyMetadata,
    applyCover,
  });
}

export async function updateGameTitle(
  gameId: string,
  newTitle: string
): Promise<Game> {
  return invoke<Game>("update_game_title", {
    gameId,
    newTitle,
  });
}

export interface CastNetworkInfo {
  ip: string;
  hostname: string;
  is_connected: boolean;
}

export interface LanDevice {
  id: string;
  name: string;
  ip: string;
  device_type: string;
  status: string;
  protocol: string;
}

export interface SunshineStatus {
  is_installed: boolean;
  is_running: boolean;
  web_ui_url: string;
  version: string | null;
  exe_path: string | null;
}

export async function getCastNetworkInfo(): Promise<CastNetworkInfo> {
  return invoke<CastNetworkInfo>("get_cast_network_info");
}

export async function openWirelessDisplay(): Promise<void> {
  return invoke<void>("open_wireless_display");
}

export async function discoverLanDevices(): Promise<LanDevice[]> {
  return invoke<LanDevice[]>("discover_lan_devices");
}

export async function checkSunshineStatus(): Promise<SunshineStatus> {
  return invoke<SunshineStatus>("check_sunshine_status");
}

export async function startSunshine(): Promise<string> {
  return invoke<string>("start_sunshine");
}

export async function stopSunshine(): Promise<string> {
  return invoke<string>("stop_sunshine");
}

export async function downloadSunshinePortable(): Promise<string> {
  return invoke<string>("download_sunshine_portable");
}

export async function pairMoonlightPin(pin: string): Promise<string> {
  return invoke<string>("pair_moonlight_pin", { pin });
}

export async function isWindowFullscreen(): Promise<boolean> {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    return await getCurrentWindow().isFullscreen();
  } catch {
    return false;
  }
}

export async function toggleWindowFullscreen(): Promise<boolean> {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    const isFull = await win.isFullscreen();
    await win.setFullscreen(!isFull);
    return !isFull;
  } catch {
    return false;
  }
}

export interface SaveSlot {
  file: string;
  thumbnail: string | null;
  modified: number;
  size: number;
}

export interface RunningGameInfo {
  rom_path: string;
  game_id: string;
  game_name: string;
}

export interface PauseOpenPayload {
  screenshot_path?: string | null;
  game_id?: string | null;
}

// In-Game Save State & Overlay Controls (saveState.md)
export async function saveSlot(slotNum: number): Promise<SaveSlot> {
  return invoke<SaveSlot>("save_slot", { slotNum });
}

export async function loadSlot(gameId: string, file: string): Promise<string> {
  return invoke<string>("load_slot", { gameId, file });
}

export async function listSlots(gameId: string): Promise<SaveSlot[]> {
  return invoke<SaveSlot[]>("list_slots", { gameId });
}

export async function deleteSlot(gameId: string, file: string): Promise<void> {
  return invoke<void>("delete_slot", { gameId, file });
}

export async function runningGame(): Promise<RunningGameInfo | null> {
  return invoke<RunningGameInfo | null>("running_game");
}

export async function isGameRunning(): Promise<boolean> {
  return invoke<boolean>("is_game_running");
}

export async function ingameContinue(): Promise<void> {
  return invoke<void>("ingame_continue");
}

export async function ingameQuit(): Promise<string> {
  return invoke<string>("ingame_quit");
}

export async function ingameVolume(steps: number): Promise<void> {
  return invoke<void>("ingame_volume", { steps });
}

export async function ingameMute(): Promise<void> {
  return invoke<void>("ingame_mute");
}

// Backward compatibility helpers
export async function inGameResume(): Promise<void> {
  return ingameContinue();
}

export async function inGameSaveState(_gameId?: string | null, slot?: number): Promise<string> {
  const s = await saveSlot(slot ?? 1);
  return `Estado guardado en ${s.file}`;
}

export async function inGameLoadState(slot?: number): Promise<string> {
  const game = await runningGame();
  if (!game) throw new Error("No hay juego en ejecución");
  return loadSlot(game.game_id, `slot_${slot ?? 1}.state`);
}

export async function getSavestateSlots(gameId: string): Promise<SaveSlotInfo[]> {
  const slots = await listSlots(gameId);
  return [1, 2, 3, 4, 5].map((slotNum) => {
    const found = slots.find((s) => s.file === `slot_${slotNum}.state`);
    return {
      slot: slotNum,
      has_save: !!found,
      screenshot_path: found?.thumbnail ?? null,
      timestamp_str: found ? new Date(found.modified * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
    };
  });
}

export async function getControllerMapping(): Promise<ControllerMapping> {
  return invoke<ControllerMapping>("get_controller_mapping");
}

export async function saveControllerMapping(mapping: ControllerMapping): Promise<void> {
  return invoke<void>("save_controller_mapping", { mapping });
}

export async function inGameSetVolume(volume: number): Promise<void> {
  return invoke<void>("in_game_volume", { steps: volume > 50 ? 1 : -1 });
}

export async function inGameQuit(): Promise<void> {
  await ingameQuit();
}

export function onInGamePauseOpen(cb: (payload: PauseOpenPayload) => void) {
  return listen<any>("in-game-pause-open", (event) => {
    if (typeof event.payload === "string" || event.payload === null) {
      cb({ screenshot_path: event.payload, game_id: null });
    } else {
      cb(event.payload);
    }
  });
}

export function onInGamePauseClose(cb: () => void) {
  return listen("in-game-pause-close", () => cb());
}

// Emuladores: versiones y actualizaciones
export async function getEmulatorVersions(): Promise<EmulatorInfo[]> {
  return invoke<EmulatorInfo[]>("get_emulator_versions");
}

export async function checkEmulatorUpdates(): Promise<EmulatorInfo[]> {
  return invoke<EmulatorInfo[]>("check_emulator_updates");
}

export async function updateEmulator(id: string): Promise<string> {
  return invoke<string>("update_emulator", { id });
}

export async function updateAllCores(): Promise<string[]> {
  return invoke<string[]>("update_all_cores");
}

export function onEmulatorUpdates(cb: (infos: EmulatorInfo[]) => void) {
  return listen<EmulatorInfo[]>("emulator-updates-available", (e) => cb(e.payload));
}

export async function findGameVideo(romPath: string, gameId: string): Promise<string | null> {
  try {
    return await invoke<string | null>("find_game_video", { romPath, gameId });
  } catch {
    return null;
  }
}

export interface ScreenScraperConfigStatus {
  has_dev_credentials: boolean;
  dev_id: string | null;
  has_user_credentials: boolean;
  username: string | null;
}

export interface ScrapeResult {
  success: boolean;
  video_path: string | null;
  logo_path: string | null;
  message: string;
}

export async function saveScreenscraperConfig(
  devId: string,
  devPass: string,
  user?: string | null,
  pass?: string | null
): Promise<void> {
  return await invoke("save_screenscraper_config", {
    devId,
    devPass,
    user: user || null,
    pass: pass || null,
  });
}

export async function getScreenscraperConfig(): Promise<ScreenScraperConfigStatus> {
  return await invoke<ScreenScraperConfigStatus>("get_screenscraper_config");
}

export async function clearScreenscraperConfig(): Promise<void> {
  return await invoke("clear_screenscraper_config");
}

export async function scrapeGameVideo(
  gameId: string,
  romPath: string,
  platform: string,
  gameName: string,
  downloadLogo?: boolean
): Promise<ScrapeResult> {
  return await invoke<ScrapeResult>("scrape_game_video", {
    gameId,
    romPath,
    platform,
    gameName,
    downloadLogo: downloadLogo ?? true,
  });
}

export interface ScrapeVideoProgressPayload {
  game_id: string;
  percent: number;
  stage: string;
}

export function onScrapeVideoProgress(cb: (payload: ScrapeVideoProgressPayload) => void) {
  return listen<ScrapeVideoProgressPayload>("scrape-video-progress", (e) => cb(e.payload));
}

export interface LocalVideoStats {
  total_games: number;
  games_with_video: number;
  games_missing_video: number;
}

export async function saveVideoFolders(folders: string[]): Promise<void> {
  return await invoke("save_video_folders", { folders });
}

export async function getVideoFolders(): Promise<string[]> {
  return await invoke<string[]>("get_video_folders");
}

export async function scanLocalVideos(): Promise<LocalVideoStats> {
  return await invoke<LocalVideoStats>("scan_local_videos");
}

export interface BatchScrapeProgressEvent {
  current_index: number;
  total: number;
  game_id: string;
  game_name: string;
  status: "downloading" | "success" | "skipped" | "failed" | "completed" | "cancelled";
  percent: number;
  downloaded_count: number;
  skipped_count: number;
  failed_count: number;
}

export async function scrapeLibraryVideos(onlyMissing: boolean): Promise<void> {
  return await invoke("scrape_library_videos", { onlyMissing });
}

export async function cancelScrapeLibraryVideos(): Promise<void> {
  return await invoke("cancel_scrape_library_videos");
}

export function onScrapeBatchProgress(cb: (payload: BatchScrapeProgressEvent) => void) {
  return listen<BatchScrapeProgressEvent>("scrape-batch-progress", (e) => cb(e.payload));
}





