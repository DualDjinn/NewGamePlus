import { useState, useMemo, useEffect, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import {
  saveSettings,
  setKioskMode,
  createProfile,
  deleteProfile,
  switchProfile,
  exportLibrary,
  importLibrary,
  getErrorLogs,
  saveRACredentials,
  getRACredentials,
  clearRACredentials,
  setCheevosHardcore,
  saveSteamGridDBKey,
  getSteamGridDBKey,
  clearSteamGridDBKey,
  saveScreenscraperConfig,
  getScreenscraperConfig,
  clearScreenscraperConfig,
  saveBiosFolders,
  getBiosFolders,
  getGraphicsSettings,
  saveGraphicsSettings,
  getAudioOutputDevices,
  type GraphicsSettings,
  getMusicTracks,
  openMusicFolder,
  saveMusicVolume,
  getMusicVolume,
  saveMusicFolders,
  getMusicFolders,
  onEmulatorUpdates,
  saveVideoFolders,
  getVideoFolders,
  scanLocalVideos,
  scrapeLibraryVideos,
  cancelScrapeLibraryVideos,
  onScrapeBatchProgress,
  type LocalVideoStats,
  type BatchScrapeProgressEvent,
} from "../lib/tauri";
import type { SortKey, Game, SettingsTab, GraphicsConsole, LayoutStyle } from "../types";
import EmulatorsTab from "./EmulatorsTab";
import ConfirmModal from "./ConfirmModal";
import LibraryTab from "./settings/LibraryTab";
import AppearanceTab from "./settings/AppearanceTab";
import GraphicsTab from "./settings/GraphicsTab";
import SoundTab from "./settings/SoundTab";
import EmulationTab from "./settings/EmulationTab";
import IntegrationsTab from "./settings/IntegrationsTab";
import ProfilesTab from "./settings/ProfilesTab";
import SystemTab from "./settings/SystemTab";
import "./Settings.css";

interface Props {
  onScan: (folders: string[]) => void;
  scanning: boolean;
  folders: string[];
  setFolders: (f: string[]) => void;
  kioskMode: boolean;
  setKioskMode: (v: boolean) => void;
  scanMessage?: string;
  scanCores?: { installed: string[]; needed: string[] } | null;
  scanProgress: number;
  sortBy: SortKey;
  setSortBy: (v: SortKey) => void;
  profiles: string[];
  currentProfile: string;
  onProfilesChange: (profiles: string[], current: string) => void;
  platformCores: Record<string, string>;
  onPlatformCoreChange: (platform: string, core: string) => void;
  games: Game[];
  theme?: string;
  onThemeChange?: (theme: string) => void;
  layoutStyle?: LayoutStyle;
  onLayoutStyleChange?: (style: LayoutStyle) => void;
  activeTab?: SettingsTab;
  onActiveTabChange?: (tab: SettingsTab) => void;
  activeGraphicsConsole?: GraphicsConsole;
  onActiveGraphicsConsoleChange?: (c: GraphicsConsole) => void;
  splashEnabled?: boolean;
  onSplashEnabledChange?: (v: boolean) => void;
  splashSoundEnabled?: boolean;
  onSplashSoundEnabledChange?: (v: boolean) => void;
  onPreviewSplash?: () => void;
  onOpenOnboarding?: () => void;
}

export default function Settings({
  onScan,
  scanning,
  folders,
  setFolders,
  kioskMode,
  setKioskMode: setKiosk,
  scanMessage,
  scanCores,
  scanProgress,
  sortBy,
  setSortBy,
  profiles,
  currentProfile,
  onProfilesChange,
  platformCores,
  onPlatformCoreChange,
  games,
  theme = "gold",
  onThemeChange,
  layoutStyle = "classic",
  onLayoutStyleChange,
  activeTab: propActiveTab,
  onActiveTabChange,
  activeGraphicsConsole: propActiveGraphicsConsole,
  onActiveGraphicsConsoleChange,
  splashEnabled = true,
  onSplashEnabledChange,
  splashSoundEnabled = true,
  onSplashSoundEnabledChange,
  onPreviewSplash,
  onOpenOnboarding,
}: Props) {
  const { t } = useTranslation();
  const [internalTab, setInternalTab] = useState<SettingsTab>("library");
  const activeTab = propActiveTab ?? internalTab;
  const setActiveTab = (tab: SettingsTab) => {
    setInternalTab(tab);
    onActiveTabChange?.(tab);
  };

  const [internalGraphicsConsole, setInternalGraphicsConsole] = useState<GraphicsConsole>("citra");
  const activeGraphicsConsole = propActiveGraphicsConsole ?? internalGraphicsConsole;
  const setActiveGraphicsConsole = (c: GraphicsConsole) => {
    setInternalGraphicsConsole(c);
    onActiveGraphicsConsoleChange?.(c);
  };

  const [newProfileName, setNewProfileName] = useState("");
  const [errorLogs, setErrorLogs] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: "rom-folder" | "bios-folder" | "music-folder" | "video-folder" | "profile" | null;
    target: string;
    title: string;
    message: string;
    variant?: "danger" | "warning";
  }>({
    isOpen: false,
    type: null,
    target: "",
    title: "",
    message: "",
    variant: "danger",
  });

  // Video folders and stats state
  const [videoFolders, setVideoFolders] = useState<string[]>([]);
  const [videoStats, setVideoStats] = useState<LocalVideoStats | null>(null);
  const [scanningLocalVideos, setScanningLocalVideos] = useState(false);

  // ScreenScraper batch scraping state
  const [isBatchScraping, setIsBatchScraping] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchScrapeProgressEvent | null>(null);

  // Graphics state
  const [graphics, setGraphics] = useState<GraphicsSettings>({
    video_smooth: false,
    video_scale_integer: false,
    aspect_ratio: "auto",
    core_options: {},
  });

  // RetroAchievements state
  const [raUsername, setRaUsername] = useState("");
  const [raPassword, setRaPassword] = useState("");
  const [raApiKey, setRaApiKey] = useState("");
  const [raLinkedUser, setRaLinkedUser] = useState<string | null>(null);
  const [raHardcore, setRaHardcore] = useState(false);
  const [raFeedback, setRaFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  // SteamGridDB state
  const [sgdbApiKey, setSgdbApiKey] = useState("");
  const [sgdbLinked, setSgdbLinked] = useState(false);
  const [sgdbFeedback, setSgdbFeedback] = useState<{ msg: string; isError: boolean } | null>(null);
  const [sgdbLoading, setSgdbLoading] = useState(false);

  // ScreenScraper state
  const [ssDevId, setSsDevId] = useState("");
  const [ssDevPass, setSsDevPass] = useState("");
  const [ssUser, setSsUser] = useState("");
  const [ssPass, setSsPass] = useState("");
  const [ssLinked, setSsLinked] = useState(false);
  const [ssDevIdSaved, setSsDevIdSaved] = useState<string | null>(null);
  const [ssUserSaved, setSsUserSaved] = useState<string | null>(null);
  const [ssFeedback, setSsFeedback] = useState<{ msg: string; isError: boolean } | null>(null);
  const [ssLoading, setSsLoading] = useState(false);

  // BIOS folders state
  const [biosFolders, setBiosFolders] = useState<string[]>([]);

  // Badge de actualizaciones de emuladores
  const [emulatorUpdatesCount, setEmulatorUpdatesCount] = useState(0);
  useEffect(() => {
    const unlisten = onEmulatorUpdates((infos) => {
      setEmulatorUpdatesCount(infos.filter((i) => i.update_available).length);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Music folders state
  const [musicFolders, setMusicFolders] = useState<string[]>([]);

  // Music & SFX volume state
  const [musicVolume, setMusicVolume] = useState<number>(() => {
    const saved = localStorage.getItem("gameflix_music_volume");
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
    }
    return 0.15;
  });
  const [sfxVolume, setSfxVolume] = useState<number>(() => {
    const saved = localStorage.getItem("gameflix_sfx_volume");
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
    }
    return 0.8;
  });

  // Video preview audio state (Arcade / Showcase)
  const [previewVideoMuted, setPreviewVideoMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem("gameflix_preview_video_muted");
    return saved === "true";
  });
  const [previewVideoVolume, setPreviewVideoVolume] = useState<number>(() => {
    const saved = localStorage.getItem("gameflix_preview_video_volume");
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
    }
    return 0.7;
  });

  function handlePreviewVideoMutedChange(muted: boolean) {
    setPreviewVideoMuted(muted);
    localStorage.setItem("gameflix_preview_video_muted", muted.toString());
    window.dispatchEvent(
      new CustomEvent("preview-audio-settings-changed", {
        detail: { muted, volume: previewVideoVolume },
      })
    );
  }

  function handlePreviewVideoVolumeChange(val: number) {
    const clamped = Math.max(0, Math.min(1, val));
    setPreviewVideoVolume(clamped);
    localStorage.setItem("gameflix_preview_video_volume", clamped.toString());
    window.dispatchEvent(
      new CustomEvent("preview-audio-settings-changed", {
        detail: { muted: previewVideoMuted, volume: clamped },
      })
    );
  }

  // Region preference
  const [regionPref, setRegionPref] = useState<string>(
    () => localStorage.getItem("gameflix_region_pref") || "usa"
  );

  // Gamepad status
  const [connectedGamepads, setConnectedGamepads] = useState<string[]>([]);

  // Audio output devices
  const [audioDevices, setAudioDevices] = useState<string[]>([]);
  const [refreshingAudio, setRefreshingAudio] = useState(false);

  async function refreshAudioDevices() {
    setRefreshingAudio(true);
    try {
      const devs = await getAudioOutputDevices();
      setAudioDevices(devs);
    } catch (e) {
      console.error("Failed to load audio devices:", e);
    } finally {
      setRefreshingAudio(false);
    }
  }

  // Music scanner state
  const [musicTrackCount, setMusicTrackCount] = useState<number | null>(null);
  const [scanningMusic, setScanningMusic] = useState(false);
  const [musicFeedback, setMusicFeedback] = useState<string | null>(null);

  async function handleScanMusic() {
    setScanningMusic(true);
    setMusicFeedback(null);
    try {
      const tracks = await getMusicTracks();
      setMusicTrackCount(tracks.length);
      setMusicFeedback(`✓ ${tracks.length} temas detectados`);
      window.dispatchEvent(new CustomEvent("music-scanned"));
      setTimeout(() => setMusicFeedback(null), 4000);
    } catch (e) {
      console.error("Failed to scan music:", e);
      setMusicFeedback("Error al escanear música");
    } finally {
      setScanningMusic(false);
    }
  }

  async function handleOpenMusicFolder() {
    try {
      await openMusicFolder();
    } catch (e) {
      console.error("Failed to open music folder:", e);
    }
  }

  useEffect(() => {
    if (activeTab === "sound") {
      getMusicTracks().then((t) => setMusicTrackCount(t.length)).catch(() => {});
    }
  }, [activeTab]);

  useEffect(() => {
    getGraphicsSettings()
      .then((g) => {
        if (g) setGraphics(g);
      })
      .catch(console.error);

    getAudioOutputDevices()
      .then((devs) => {
        if (devs) setAudioDevices(devs);
      })
      .catch(console.error);

    getRACredentials().then((username) => {
      if (username) {
        setRaLinkedUser(username);
      }
    });
    getSteamGridDBKey().then((linked) => {
      if (linked) {
        setSgdbLinked(true);
      }
    });
    getScreenscraperConfig().then((cfg) => {
      if (cfg.has_dev_credentials) {
        setSsLinked(true);
        setSsDevIdSaved(cfg.dev_id);
        setSsUserSaved(cfg.username);
      }
    });
    getBiosFolders()
      .then((folders) => {
        if (folders && folders.length > 0) {
          setBiosFolders(folders);
        }
      })
      .catch(console.error);

    getMusicFolders()
      .then((folders) => {
        if (folders && folders.length > 0) {
          setMusicFolders(folders);
        }
      })
      .catch(console.error);

    getVideoFolders()
      .then((folders) => {
        if (folders && folders.length > 0) {
          setVideoFolders(folders);
        }
      })
      .catch(console.error);

    scanLocalVideos()
      .then((stats) => {
        if (stats) setVideoStats(stats);
      })
      .catch(console.error);

    getMusicVolume()
      .then((vol) => {
        if (typeof vol === "number" && !isNaN(vol)) {
          const clamped = Math.max(0, Math.min(1, vol));
          setMusicVolume(clamped);
          localStorage.setItem("gameflix_music_volume", clamped.toString());
        }
      })
      .catch(console.error);
  }, [currentProfile]);

  // Listener para progreso de descarga masiva de ScreenScraper
  useEffect(() => {
    const unlisten = onScrapeBatchProgress((payload) => {
      setBatchProgress(payload);
      if (payload.status === "completed" || payload.status === "cancelled") {
        setIsBatchScraping(false);
        scanLocalVideos().then((st) => setVideoStats(st)).catch(() => {});
      } else {
        setIsBatchScraping(true);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Sincronizar volumen si cambia desde el widget del vinilo
  useEffect(() => {
    function handleVolumeSync(e: Event) {
      const customEvent = e as CustomEvent<number>;
      if (typeof customEvent.detail === "number") {
        setMusicVolume(customEvent.detail);
      }
    }
    window.addEventListener("music-volume-changed", handleVolumeSync);
    return () => {
      window.removeEventListener("music-volume-changed", handleVolumeSync);
    };
  }, []);

  // Real-time gamepad listener
  useEffect(() => {
    function updateGamepads() {
      const gp = navigator.getGamepads ? navigator.getGamepads() : [];
      const names: string[] = [];
      for (let i = 0; i < gp.length; i++) {
        const item = gp[i];
        if (item) {
          names.push(item.id || `Mando #${item.index + 1}`);
        }
      }
      setConnectedGamepads(names);
    }

    updateGamepads();
    window.addEventListener("gamepadconnected", updateGamepads);
    window.addEventListener("gamepaddisconnected", updateGamepads);
    const interval = setInterval(updateGamepads, 2000);

    return () => {
      window.removeEventListener("gamepadconnected", updateGamepads);
      window.removeEventListener("gamepaddisconnected", updateGamepads);
      clearInterval(interval);
    };
  }, []);

  const uniquePlatforms = useMemo(() => {
    const seen = new Set<string>();
    return games
      .map((g) => g.platform)
      .filter((p) => {
        if (seen.has(p)) return false;
        seen.add(p);
        return true;
      })
      .sort();
  }, [games]);

  function getDefaultCore(platform: string): string {
    const defaults: Record<string, string> = {
      SNES: "snes9x",
      NES: "nestopia",
      N64: "mupen64plus_next",
      GBA: "mgba",
      GBC: "gambatte",
      GB: "gambatte",
      NDS: "melonds",
      "3DS": "citra",
      GAMECUBE: "dolphin",
      VB: "mednafen_vb",
      MEGA_DRIVE: "genesis_plus_gx",
      SMS: "smsplus",
      GAME_GEAR: "gearsystem",
      PCE: "mednafen_pce_fast",
      "32X": "picodrive",
      PS1: "pcsx_rearmed",
      PSP: "ppsspp",
      MAME: "fbneo",
      NEOGEO: "fbneo",
      NGP: "mednafen_ngp",
      LYNX: "mednafen_lynx",
      WSWAN: "mednafen_wswan",
      COLECOVISION: "gearcoleco",
    };
    return defaults[platform] || "";
  }

  function triggerSaveToast() {
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 1500);
  }

  function updateCoreOption(key: string, value: string) {
    const next: GraphicsSettings = {
      ...graphics,
      core_options: {
        ...graphics.core_options,
        [key]: value,
      },
    };
    setGraphics(next);
    saveGraphicsSettings(next).catch(console.error);
    triggerSaveToast();
  }

  function updateGlobalGraphic<K extends keyof GraphicsSettings>(key: K, value: GraphicsSettings[K]) {
    const next: GraphicsSettings = {
      ...graphics,
      [key]: value,
    };
    setGraphics(next);
    saveGraphicsSettings(next).catch(console.error);
    triggerSaveToast();
  }

  async function addFolder() {
    let path;
    try {
      path = await open({ directory: true, title: "Seleccionar carpeta de ROMs" });
    } catch (e) {
      console.error("Folder dialog failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al abrir selector de carpetas" }));
      return;
    }
    if (path && !folders.includes(path)) {
      const next = [...folders, path];
      setFolders(next);
      await saveSettings(next, kioskMode).catch(console.error);
    }
  }

  function requestRemoveFolder(path: string) {
    setConfirmDialog({
      isOpen: true,
      type: "rom-folder",
      target: path,
      title: t("settings.confirm.folderTitle"),
      message: t("settings.confirm.folderDesc"),
      variant: "danger",
    });
  }

  async function handleAddBiosFolder() {
    let path;
    try {
      path = await open({ directory: true, title: "Seleccionar carpeta de BIOS (PlayStation, Neo Geo, etc.)" });
    } catch (e) {
      console.error("BIOS folder dialog failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al abrir selector de carpeta BIOS" }));
      return;
    }
    if (path && !biosFolders.includes(path)) {
      const next = [...biosFolders, path];
      setBiosFolders(next);
      await saveBiosFolders(next).catch(console.error);
    }
  }

  function requestRemoveBiosFolder(path: string) {
    setConfirmDialog({
      isOpen: true,
      type: "bios-folder",
      target: path,
      title: t("settings.confirm.biosTitle"),
      message: t("settings.confirm.biosDesc"),
      variant: "danger",
    });
  }

  async function handleAddMusicFolder() {
    let path;
    try {
      path = await open({ directory: true, title: "Seleccionar carpeta de música (MP3, OGG, FLAC, WAV, etc.)" });
    } catch (e) {
      console.error("Music folder dialog failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al abrir selector de carpeta de música" }));
      return;
    }
    if (path && !musicFolders.includes(path)) {
      const next = [...musicFolders, path];
      setMusicFolders(next);
      await saveMusicFolders(next).catch(console.error);
      handleScanMusic();
    }
  }

  function requestRemoveMusicFolder(path: string) {
    setConfirmDialog({
      isOpen: true,
      type: "music-folder",
      target: path,
      title: t("settings.confirm.musicTitle"),
      message: t("settings.confirm.musicDesc"),
      variant: "danger",
    });
  }

  async function handleAddVideoFolder() {
    let path;
    try {
      path = await open({ directory: true, title: "Seleccionar carpeta de videos (.mp4) de juegos" });
    } catch (e) {
      console.error("Video folder dialog failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al abrir selector de carpeta de videos" }));
      return;
    }
    if (path && !videoFolders.includes(path)) {
      const next = [...videoFolders, path];
      setVideoFolders(next);
      await saveVideoFolders(next).catch(console.error);
      handleScanLocalVideos();
    }
  }

  function requestRemoveVideoFolder(path: string) {
    setConfirmDialog({
      isOpen: true,
      type: "video-folder",
      target: path,
      title: t("settings.confirm.videoTitle", "Quitar Carpeta de Videos"),
      message: t("settings.confirm.videoDesc", "¿Deseas quitar esta carpeta de videos?"),
      variant: "danger",
    });
  }

  async function handleScanLocalVideos() {
    setScanningLocalVideos(true);
    try {
      const stats = await scanLocalVideos();
      setVideoStats(stats);
    } catch (e) {
      console.error("Failed to scan local videos:", e);
    } finally {
      setScanningLocalVideos(false);
    }
  }

  async function handleStartBatchScrape(onlyMissing: boolean) {
    setIsBatchScraping(true);
    try {
      await scrapeLibraryVideos(onlyMissing);
    } catch (e) {
      setIsBatchScraping(false);
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al iniciar descarga masiva";
      window.dispatchEvent(new CustomEvent("app-error", { detail: msg }));
    }
  }

  async function handleCancelBatchScrape() {
    try {
      await cancelScrapeLibraryVideos();
    } catch (e) {
      console.error("Cancel batch scrape failed:", e);
    }
  }

  function requestDeleteProfile(name: string) {
    setConfirmDialog({
      isOpen: true,
      type: "profile",
      target: name,
      title: t("settings.confirm.profileTitle"),
      message: t("settings.confirm.profileDesc", { name }),
      variant: "danger",
    });
  }

  async function handleConfirmAction() {
    if (!confirmDialog.type) return;

    if (confirmDialog.type === "rom-folder") {
      const next = folders.filter((f) => f !== confirmDialog.target);
      setFolders(next);
      await saveSettings(next, kioskMode).catch(console.error);
    } else if (confirmDialog.type === "bios-folder") {
      const next = biosFolders.filter((f) => f !== confirmDialog.target);
      setBiosFolders(next);
      await saveBiosFolders(next).catch(console.error);
    } else if (confirmDialog.type === "music-folder") {
      const next = musicFolders.filter((f) => f !== confirmDialog.target);
      setMusicFolders(next);
      await saveMusicFolders(next).catch(console.error);
      handleScanMusic();
    } else if (confirmDialog.type === "video-folder") {
      const next = videoFolders.filter((f) => f !== confirmDialog.target);
      setVideoFolders(next);
      await saveVideoFolders(next).catch(console.error);
      handleScanLocalVideos();
    } else if (confirmDialog.type === "profile") {
      const name = confirmDialog.target;
      if (profiles.length > 1) {
        try {
          await deleteProfile(name);
          const newProfiles = profiles.filter((p) => p !== name);
          const newCurrent = currentProfile === name ? newProfiles[0] : currentProfile;
          await switchProfile(newCurrent);
          onProfilesChange(newProfiles, newCurrent);
        } catch (e) {
          console.error("Delete profile failed:", e);
          window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al eliminar perfil" }));
        }
      }
    }

    setConfirmDialog({ isOpen: false, type: null, target: "", title: "", message: "", variant: "danger" });
  }

  function handleCancelAction() {
    setConfirmDialog({ isOpen: false, type: null, target: "", title: "", message: "", variant: "danger" });
  }

  function handleMusicVolumeChange(val: number) {
    setMusicVolume(val);
    localStorage.setItem("gameflix_music_volume", val.toString());
    saveMusicVolume(val).catch(console.error);
    window.dispatchEvent(new CustomEvent("music-volume-changed", { detail: val }));
  }

  function handleSfxVolumeChange(val: number) {
    setSfxVolume(val);
    localStorage.setItem("gameflix_sfx_volume", val.toString());
  }

  async function handleKioskToggle() {
    const next = !kioskMode;
    setKiosk(next);
    try {
      await setKioskMode(next);
    } catch (e) {
      console.error("Kiosk toggle failed:", e);
    }
  }

  function handleRegionChange(r: string) {
    setRegionPref(r);
    localStorage.setItem("gameflix_region_pref", r);
  }

  async function handleCreateProfile() {
    const name = newProfileName.trim();
    if (!name || profiles.includes(name)) return;
    try {
      await createProfile(name);
      await switchProfile(name);
      onProfilesChange([...profiles, name], name);
      setNewProfileName("");
    } catch (e) {
      console.error("Create profile failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al crear perfil" }));
    }
  }

  async function handleSwitchProfile(name: string) {
    try {
      await switchProfile(name);
      onProfilesChange(profiles, name);
    } catch (e) {
      console.error("Switch profile failed:", e);
    }
  }

  async function handleExport() {
    try {
      const json = await exportLibrary();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gameflix-backup.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al exportar" }));
    }
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      await importLibrary(text);
      window.location.reload();
    } catch (err) {
      console.error("Import failed:", err);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al importar" }));
    }
  }

  async function handleToggleLogs() {
    if (errorLogs !== null) {
      setErrorLogs(null);
      return;
    }
    try {
      const logs = await getErrorLogs();
      setErrorLogs(logs || "Sin errores registrados");
    } catch (e) {
      setErrorLogs("Error al leer logs");
    }
  }

  function handleCopyLogs() {
    if (!errorLogs) return;
    navigator.clipboard.writeText(errorLogs);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  }

  async function handleLinkRA() {
    setRaFeedback(null);
    if (!raUsername || !raPassword || !raApiKey) {
      setRaFeedback({ msg: "Por favor completa usuario, contraseña y API Key", isError: true });
      return;
    }
    try {
      await saveRACredentials(raUsername, raPassword, raApiKey);
      setRaLinkedUser(raUsername);
      setRaPassword("");
      setRaFeedback({ msg: "¡Cuenta vinculada y sesión iniciada con éxito!", isError: false });
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al vincular";
      setRaFeedback({ msg, isError: true });
    }
  }

  async function handleUnlinkRA() {
    try {
      await clearRACredentials();
      setRaLinkedUser(null);
      setRaUsername("");
      setRaPassword("");
      setRaApiKey("");
      setRaFeedback({ msg: "Cuenta desvinculada", isError: false });
    } catch (e) {
      setRaFeedback({ msg: "Error al desvincular", isError: true });
    }
  }

  async function handleToggleRAHardcore() {
    const next = !raHardcore;
    setRaHardcore(next);
    try {
      await setCheevosHardcore(next);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleLinkSGDB() {
    setSgdbFeedback(null);
    if (!sgdbApiKey.trim()) {
      setSgdbFeedback({ msg: "Por favor ingresa tu API Key de SteamGridDB", isError: true });
      return;
    }
    setSgdbLoading(true);
    try {
      await saveSteamGridDBKey(sgdbApiKey.trim());
      setSgdbLinked(true);
      setSgdbFeedback({ msg: "¡API Key de SteamGridDB vinculada correctamente!", isError: false });
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al vincular API Key";
      setSgdbFeedback({ msg, isError: true });
    } finally {
      setSgdbLoading(false);
    }
  }

  async function handleUnlinkSGDB() {
    try {
      await clearSteamGridDBKey();
      setSgdbLinked(false);
      setSgdbApiKey("");
      setSgdbFeedback({ msg: "API Key de SteamGridDB desvinculada", isError: false });
    } catch (e) {
      setSgdbFeedback({ msg: "Error al desvincular", isError: true });
    }
  }

  async function handleLinkScreenScraper() {
    setSsFeedback(null);
    if (!ssDevId.trim() || !ssDevPass.trim()) {
      setSsFeedback({ msg: "Por favor ingresa usuario Dev y contraseña Dev", isError: true });
      return;
    }
    setSsLoading(true);
    try {
      await saveScreenscraperConfig(ssDevId.trim(), ssDevPass.trim(), ssUser.trim(), ssPass.trim());
      setSsLinked(true);
      setSsDevIdSaved(ssDevId.trim());
      setSsUserSaved(ssUser.trim() || null);
      setSsDevPass("");
      setSsPass("");
      setSsFeedback({ msg: "¡ScreenScraper vinculado y verificado correctamente!", isError: false });
    } catch (e) {
      const msg = typeof e === "string" ? e : e instanceof Error ? e.message : "Error al vincular ScreenScraper";
      setSsFeedback({ msg, isError: true });
    } finally {
      setSsLoading(false);
    }
  }

  async function handleUnlinkScreenScraper() {
    try {
      await clearScreenscraperConfig();
      setSsLinked(false);
      setSsDevIdSaved(null);
      setSsUserSaved(null);
      setSsDevId("");
      setSsDevPass("");
      setSsUser("");
      setSsPass("");
      setSsFeedback({ msg: "ScreenScraper desvinculado", isError: false });
    } catch (e) {
      setSsFeedback({ msg: "Error al desvincular ScreenScraper", isError: true });
    }
  }

  return (
    <div className="settings-container">
      {/* Sidebar Navigation */}
      <aside className="settings-sidebar">
        <div className="settings-sidebar-header">
          <h2>{t("settings.title")}</h2>
        </div>

        <nav className="settings-nav">
          <button
            type="button"
            className={`settings-nav-item ${activeTab === "library" ? "active" : ""}`}
            onClick={() => setActiveTab("library")}
          >
            <span className="settings-nav-icon">📂</span>
            <span className="settings-nav-text">{t("settings.tabs.library")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "appearance" ? "active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            <span className="settings-nav-icon">🎨</span>
            <span className="settings-nav-text">{t("settings.tabs.appearance")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "graphics" ? "active" : ""}`}
            onClick={() => setActiveTab("graphics")}
          >
            <span className="settings-nav-icon">🖼️</span>
            <span className="settings-nav-text">{t("settings.tabs.graphics")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "sound" ? "active" : ""}`}
            onClick={() => setActiveTab("sound")}
          >
            <span className="settings-nav-icon">🔊</span>
            <span className="settings-nav-text">{t("settings.tabs.sound")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "emulation" ? "active" : ""}`}
            onClick={() => setActiveTab("emulation")}
          >
            <span className="settings-nav-icon">🕹️</span>
            <span className="settings-nav-text">{t("settings.tabs.emulation")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "emulators" ? "active" : ""}`}
            onClick={() => setActiveTab("emulators")}
          >
            <span className="settings-nav-icon">🎮</span>
            <span className="settings-nav-text">{t("settings.tabs.emulators")}</span>
            {emulatorUpdatesCount > 0 && <span className="settings-pill-dot" />}
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "integrations" ? "active" : ""}`}
            onClick={() => setActiveTab("integrations")}
          >
            <span className="settings-nav-icon">🌐</span>
            <span className="settings-nav-text">{t("settings.tabs.integrations")}</span>
            {(raLinkedUser || sgdbLinked) && <span className="settings-pill-dot" />}
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "profiles" ? "active" : ""}`}
            onClick={() => setActiveTab("profiles")}
          >
            <span className="settings-nav-icon">👤</span>
            <span className="settings-nav-text">{t("settings.tabs.profiles")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "system" ? "active" : ""}`}
            onClick={() => setActiveTab("system")}
          >
            <span className="settings-nav-icon">🛠️</span>
            <span className="settings-nav-text">{t("settings.tabs.system")}</span>
          </button>
        </nav>
      </aside>

      {/* Main Settings Panel */}
      <main className="settings-main">
        {activeTab === "library" && (
          <LibraryTab
            folders={folders}
            scanning={scanning}
            scanProgress={scanProgress}
            scanMessage={scanMessage}
            scanCores={scanCores}
            onScan={onScan}
            onAddFolder={addFolder}
            onRequestRemoveFolder={requestRemoveFolder}
            biosFolders={biosFolders}
            onAddBiosFolder={handleAddBiosFolder}
            onRequestRemoveBiosFolder={requestRemoveBiosFolder}
            videoFolders={videoFolders}
            onAddVideoFolder={handleAddVideoFolder}
            onRequestRemoveVideoFolder={requestRemoveVideoFolder}
            videoStats={videoStats}
            onScanLocalVideos={handleScanLocalVideos}
            scanningLocalVideos={scanningLocalVideos}
            ssLinked={ssLinked}
            isBatchScraping={isBatchScraping}
            batchProgress={batchProgress}
            onStartBatchScrape={handleStartBatchScrape}
            onCancelBatchScrape={handleCancelBatchScrape}
            onNavigateToIntegrations={() => setActiveTab("integrations")}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            regionPref={regionPref}
            onRegionPrefChange={handleRegionChange}
            onExport={handleExport}
            onImport={handleImport}
          />
        )}

        {activeTab === "appearance" && (
          <AppearanceTab
            theme={theme}
            onThemeChange={onThemeChange}
            layoutStyle={layoutStyle}
            onLayoutStyleChange={onLayoutStyleChange}
            splashEnabled={splashEnabled}
            onSplashEnabledChange={onSplashEnabledChange}
            splashSoundEnabled={splashSoundEnabled}
            onSplashSoundEnabledChange={onSplashSoundEnabledChange}
            onPreviewSplash={onPreviewSplash}
            kioskMode={kioskMode}
            onToggleKiosk={handleKioskToggle}
          />
        )}

        {activeTab === "graphics" && (
          <GraphicsTab
            graphics={graphics}
            activeGraphicsConsole={activeGraphicsConsole}
            setActiveGraphicsConsole={setActiveGraphicsConsole}
            updateGlobalGraphic={updateGlobalGraphic}
            updateCoreOption={updateCoreOption}
            savedToast={savedToast}
          />
        )}

        {activeTab === "sound" && (
          <SoundTab
            graphics={graphics}
            audioDevices={audioDevices}
            refreshingAudio={refreshingAudio}
            refreshAudioDevices={refreshAudioDevices}
            updateGlobalGraphic={updateGlobalGraphic}
            musicVolume={musicVolume}
            handleMusicVolumeChange={handleMusicVolumeChange}
            sfxVolume={sfxVolume}
            handleSfxVolumeChange={handleSfxVolumeChange}
            musicFolders={musicFolders}
            handleAddMusicFolder={handleAddMusicFolder}
            requestRemoveMusicFolder={requestRemoveMusicFolder}
            musicTrackCount={musicTrackCount}
            scanningMusic={scanningMusic}
            musicFeedback={musicFeedback}
            handleScanMusic={handleScanMusic}
            handleOpenMusicFolder={handleOpenMusicFolder}
            savedToast={savedToast}
            previewVideoMuted={previewVideoMuted}
            handlePreviewVideoMutedChange={handlePreviewVideoMutedChange}
            previewVideoVolume={previewVideoVolume}
            handlePreviewVideoVolumeChange={handlePreviewVideoVolumeChange}
          />
        )}

        {activeTab === "emulation" && (
          <EmulationTab
            connectedGamepads={connectedGamepads}
            uniquePlatforms={uniquePlatforms}
            platformCores={platformCores}
            onPlatformCoreChange={onPlatformCoreChange}
            getDefaultCore={getDefaultCore}
          />
        )}

        {activeTab === "emulators" && <EmulatorsTab />}

        {activeTab === "integrations" && (
          <IntegrationsTab
            raUsername={raUsername}
            setRaUsername={setRaUsername}
            raPassword={raPassword}
            setRaPassword={setRaPassword}
            raApiKey={raApiKey}
            setRaApiKey={setRaApiKey}
            raLinkedUser={raLinkedUser}
            raHardcore={raHardcore}
            raFeedback={raFeedback}
            handleLinkRA={handleLinkRA}
            handleUnlinkRA={handleUnlinkRA}
            handleToggleRAHardcore={handleToggleRAHardcore}
            sgdbApiKey={sgdbApiKey}
            setSgdbApiKey={setSgdbApiKey}
            sgdbLinked={sgdbLinked}
            sgdbFeedback={sgdbFeedback}
            sgdbLoading={sgdbLoading}
            handleLinkSGDB={handleLinkSGDB}
            handleUnlinkSGDB={handleUnlinkSGDB}
            ssDevId={ssDevId}
            setSsDevId={setSsDevId}
            ssDevPass={ssDevPass}
            setSsDevPass={setSsDevPass}
            ssUser={ssUser}
            setSsUser={setSsUser}
            ssPass={ssPass}
            setSsPass={setSsPass}
            ssLinked={ssLinked}
            ssDevIdSaved={ssDevIdSaved}
            ssUserSaved={ssUserSaved}
            ssFeedback={ssFeedback}
            ssLoading={ssLoading}
            handleLinkScreenScraper={handleLinkScreenScraper}
            handleUnlinkScreenScraper={handleUnlinkScreenScraper}
            isBatchScraping={isBatchScraping}
            batchProgress={batchProgress}
            handleStartBatchScrape={handleStartBatchScrape}
            handleCancelBatchScrape={handleCancelBatchScrape}
          />
        )}

        {activeTab === "profiles" && (
          <ProfilesTab
            currentProfile={currentProfile}
            profiles={profiles}
            handleSwitchProfile={handleSwitchProfile}
            requestDeleteProfile={requestDeleteProfile}
            newProfileName={newProfileName}
            setNewProfileName={setNewProfileName}
            handleCreateProfile={handleCreateProfile}
            games={games}
            uniquePlatforms={uniquePlatforms}
            folders={folders}
          />
        )}

        {activeTab === "system" && (
          <SystemTab
            errorLogs={errorLogs}
            copiedLog={copiedLog}
            handleToggleLogs={handleToggleLogs}
            handleCopyLogs={handleCopyLogs}
            onOpenOnboarding={onOpenOnboarding}
          />
        )}
      </main>

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        detail={confirmDialog.target}
        confirmLabel={t("settings.confirm.delete")}
        cancelLabel={t("settings.confirm.cancel")}
        variant={confirmDialog.variant}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />
    </div>
  );
}
