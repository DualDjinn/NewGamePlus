import { useState, useMemo, useEffect } from "react";
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
} from "../lib/tauri";
import { PLATFORM_CORES } from "../lib/cores";
import type { SortKey, Game } from "../types";
import { TrophyIcon } from "./icons";
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
  layoutStyle?: "classic" | "immersive";
  onLayoutStyleChange?: (style: "classic" | "immersive") => void;
}

type SettingsTab = "library" | "appearance" | "graphics" | "sound" | "emulation" | "integrations" | "profiles" | "system";
type GraphicsConsole = "global" | "citra" | "pcsx2" | "dolphin" | "ppsspp" | "ps1" | "n64" | "nds";

const THEMES = [
  {
    id: "gold",
    name: "NewGame+ Gold",
    description: "Oro cálido, obsidiana y grafito mate",
    primary: "#f59e0b",
    bg: "#0a0b10",
    card: "#131622",
  },
  {
    id: "arcade",
    name: "Arcade Synthwave",
    description: "Cyan neón, magenta y azul medianoche",
    primary: "#00f0ff",
    bg: "#060812",
    card: "#0f1428",
  },
  {
    id: "console",
    name: "Midnight Blue",
    description: "Azul cobalto y pizarra profunda estilo consola",
    primary: "#3b82f6",
    bg: "#070c18",
    card: "#10192e",
  },
  {
    id: "snes",
    name: "SNES Classic",
    description: "Violeta índigo y lavanda 16-bit",
    primary: "#818cf8",
    bg: "#0c0d14",
    card: "#161724",
  },
  {
    id: "crimson",
    name: "Crimson Red",
    description: "Rojo carmesí y negro cinemático",
    primary: "#e50914",
    bg: "#0e0a0c",
    card: "#191114",
  },
];

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
}: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("library");
  const [activeGraphicsConsole, setActiveGraphicsConsole] = useState<GraphicsConsole>("citra");
  const [newProfileName, setNewProfileName] = useState("");
  const [errorLogs, setErrorLogs] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

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

  // BIOS folders state (múltiples carpetas)
  const [biosFolders, setBiosFolders] = useState<string[]>([]);

  // Music folders state (carpetas adicionales de música)
  const [musicFolders, setMusicFolders] = useState<string[]>([]);

  // Music & SFX volume state (con valor por defecto 15% para música)
  const [musicVolume, setMusicVolume] = useState<number>(() => {
    const saved = localStorage.getItem("gameflix_music_volume");
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
    }
    return 0.15; // 15% por defecto
  });
  const [sfxVolume, setSfxVolume] = useState<number>(() => {
    const saved = localStorage.getItem("gameflix_sfx_volume");
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed)) return Math.max(0, Math.min(1, parsed));
    }
    return 0.8;
  });

  // Region preference
  const [regionPref, setRegionPref] = useState<string>(() => localStorage.getItem("gameflix_region_pref") || "usa");

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
    getGraphicsSettings().then((g) => {
      if (g) setGraphics(g);
    }).catch(console.error);

    getAudioOutputDevices().then((devs) => {
      if (devs) setAudioDevices(devs);
    }).catch(console.error);

    getRACredentials().then((creds) => {
      if (creds) {
        setRaLinkedUser(creds[0]);
      }
    });
    getSteamGridDBKey().then((key) => {
      if (key) {
        setSgdbLinked(true);
        setSgdbApiKey(key);
      }
    });
    getBiosFolders().then((folders) => {
      if (folders && folders.length > 0) {
        setBiosFolders(folders);
      }
    }).catch(console.error);

    getMusicFolders().then((folders) => {
      if (folders && folders.length > 0) {
        setMusicFolders(folders);
      }
    }).catch(console.error);

    getMusicVolume().then((vol) => {
      if (typeof vol === "number" && !isNaN(vol)) {
        const clamped = Math.max(0, Math.min(1, vol));
        setMusicVolume(clamped);
        localStorage.setItem("gameflix_music_volume", clamped.toString());
      }
    }).catch(console.error);
  }, [currentProfile]);

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
      NDS: "melonDS",
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

  async function removeFolder(path: string) {
    const next = folders.filter((f) => f !== path);
    setFolders(next);
    await saveSettings(next, kioskMode).catch(console.error);
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

  async function handleRemoveBiosFolder(path: string) {
    const next = biosFolders.filter((f) => f !== path);
    setBiosFolders(next);
    await saveBiosFolders(next).catch(console.error);
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

  async function handleRemoveMusicFolder(path: string) {
    const next = musicFolders.filter((f) => f !== path);
    setMusicFolders(next);
    await saveMusicFolders(next).catch(console.error);
    handleScanMusic();
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

  async function handleDeleteProfile(name: string) {
    if (profiles.length <= 1) return;
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

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
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

  return (
    <div className="settings-container">
      {/* Sidebar Navigation */}
      <aside className="settings-sidebar">
        <div className="settings-sidebar-header">
          <h2>Configuración</h2>
          <span className="settings-badge">Ajustes</span>
        </div>

        <nav className="settings-nav">
          <button
            type="button"
            className={`settings-nav-item ${activeTab === "library" ? "active" : ""}`}
            onClick={() => setActiveTab("library")}
          >
            <span className="settings-nav-icon">📂</span>
            <span className="settings-nav-text">Biblioteca</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "appearance" ? "active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            <span className="settings-nav-icon">🎨</span>
            <span className="settings-nav-text">Apariencia</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "graphics" ? "active" : ""}`}
            onClick={() => setActiveTab("graphics")}
          >
            <span className="settings-nav-icon">🖼️</span>
            <span className="settings-nav-text">Gráficos HD</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "sound" ? "active" : ""}`}
            onClick={() => setActiveTab("sound")}
          >
            <span className="settings-nav-icon">🔊</span>
            <span className="settings-nav-text">Sonido</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "emulation" ? "active" : ""}`}
            onClick={() => setActiveTab("emulation")}
          >
            <span className="settings-nav-icon">🕹️</span>
            <span className="settings-nav-text">Emulación</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "integrations" ? "active" : ""}`}
            onClick={() => setActiveTab("integrations")}
          >
            <span className="settings-nav-icon">🌐</span>
            <span className="settings-nav-text">Cuentas</span>
            {(raLinkedUser || sgdbLinked) && <span className="settings-pill-dot" />}
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "profiles" ? "active" : ""}`}
            onClick={() => setActiveTab("profiles")}
          >
            <span className="settings-nav-icon">👤</span>
            <span className="settings-nav-text">Perfiles</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "system" ? "active" : ""}`}
            onClick={() => setActiveTab("system")}
          >
            <span className="settings-nav-icon">🛠️</span>
            <span className="settings-nav-text">Sistema</span>
          </button>
        </nav>
      </aside>

      {/* Main Settings Panel */}
      <main className="settings-main">
        {/* ================= TAB 1: BIBLIOTECA ================= */}
        {activeTab === "library" && (
          <div className="settings-tab-panel">
            <div className="settings-panel-header">
              <h2>Biblioteca & Escaneo</h2>
              <p>Gestiona tus directorios de ROMs, archivos BIOS y copias de seguridad.</p>
            </div>

            {/* Escaneo Principal */}
            <section className="settings-card highlight">
              <div className="settings-card-header">
                <div>
                  <h3>Escanear Biblioteca</h3>
                  <p>Indexa nuevos juegos, busca carátulas y verifica compatibilidad.</p>
                </div>
                <button
                  type="button"
                  className="settings-btn-primary"
                  onClick={() => onScan(folders)}
                  disabled={scanning || folders.length === 0}
                >
                  {scanning ? "Escaneando..." : "▶ Escanear Ahora"}
                </button>
              </div>

              {scanning && (
                <div className="settings-scan-progress-box">
                  <div className="settings-progress">
                    <div className="settings-progress-bar" style={{ width: `${scanProgress}%` }} />
                  </div>
                  {scanMessage && <p className="settings-progress-msg">{scanMessage}</p>}
                </div>
              )}

              {scanCores && (scanCores.installed.length > 0 || scanCores.needed.length > 0) && (
                <div className="settings-scan-cores-box">
                  {scanCores.installed.length > 0 && (
                    <span className="settings-badge-ok">✓ Cores listos: {scanCores.installed.join(", ")}</span>
                  )}
                  {scanCores.needed.length > 0 && (
                    <span className="settings-badge-warn">⚠ Cores pendientes: {scanCores.needed.join(", ")}</span>
                  )}
                </div>
              )}
            </section>

            {/* Carpetas de ROMs */}
            <section className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h3>Carpetas de ROMs</h3>
                  <p>Directorios donde se encuentran los archivos de tus juegos.</p>
                </div>
                <button type="button" onClick={addFolder} className="settings-btn-add">
                  + Agregar Carpeta
                </button>
              </div>

              <ul className="settings-folders">
                {folders.map((f) => (
                  <li key={f} className="settings-folder-item">
                    <span className="settings-folder-path" title={f}>{f}</span>
                    <button type="button" onClick={() => removeFolder(f)} className="settings-btn-delete" title="Quitar">
                      ×
                    </button>
                  </li>
                ))}
                {folders.length === 0 && (
                  <li className="settings-empty">No hay carpetas configuradas aún.</li>
                )}
              </ul>
            </section>

            {/* Carpetas de BIOS */}
            <section className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h3>Carpetas de BIOS / System</h3>
                  <p>Directorios con archivos BIOS (PlayStation, PS2, Sega CD, Neo Geo, Saturn, etc.).</p>
                </div>
                <button type="button" onClick={handleAddBiosFolder} className="settings-btn-add">
                  + Agregar Carpeta de BIOS
                </button>
              </div>

              <ul className="settings-folders">
                {biosFolders.map((bf) => (
                  <li key={bf} className="settings-folder-item">
                    <span className="settings-folder-path" title={bf}>{bf}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBiosFolder(bf)}
                      className="settings-btn-delete"
                      title="Quitar carpeta"
                    >
                      ×
                    </button>
                  </li>
                ))}
                {biosFolders.length === 0 && (
                  <li className="settings-empty">
                    Sin carpetas personalizadas. Usando ubicación por defecto: <code>binaries/RetroArch/system</code>
                  </li>
                )}
              </ul>
            </section>

            {/* Preferencias de Biblioteca */}
            <section className="settings-card">
              <h3>Preferencias de Biblioteca</h3>
              
              <div className="settings-row-option">
                <div>
                  <span className="settings-option-title">Orden Predeterminado</span>
                  <p className="settings-option-desc">Criterio de ordenación al entrar a tu biblioteca.</p>
                </div>
                <div className="settings-sort-group">
                  {([["name", "Nombre"], ["platform", "Plataforma"], ["last_played", "Última vez"]] as [SortKey, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`settings-sort-btn ${sortBy === key ? "active" : ""}`}
                      onClick={() => setSortBy(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="settings-divider" />

              <div className="settings-row-option">
                <div>
                  <span className="settings-option-title">Prioridad de Región de Carátulas</span>
                  <p className="settings-option-desc">Región preferida al buscar portadas retro.</p>
                </div>
                <div className="settings-sort-group">
                  <button
                    type="button"
                    className={`settings-sort-btn ${regionPref === "usa" ? "active" : ""}`}
                    onClick={() => handleRegionChange("usa")}
                  >
                    🇺🇸 USA
                  </button>
                  <button
                    type="button"
                    className={`settings-sort-btn ${regionPref === "eur" ? "active" : ""}`}
                    onClick={() => handleRegionChange("eur")}
                  >
                    🇪🇺 Europa
                  </button>
                  <button
                    type="button"
                    className={`settings-sort-btn ${regionPref === "jp" ? "active" : ""}`}
                    onClick={() => handleRegionChange("jp")}
                  >
                    🇯🇵 Japón
                  </button>
                </div>
              </div>
            </section>

            {/* Copias de Seguridad */}
            <section className="settings-card">
              <h3>Respaldo y Copias de Seguridad</h3>
              <p className="settings-hint">Exporta o importa el registro de tus juegos, favoritos e historial.</p>
              <div className="settings-row" style={{ marginTop: '12px' }}>
                <button type="button" className="settings-btn-secondary" onClick={handleExport}>
                  📥 Exportar Respaldo JSON
                </button>
                <label className="settings-btn-secondary" style={{ cursor: 'pointer' }}>
                  📤 Importar Respaldo JSON
                  <input type="file" accept=".json" onChange={handleImport} hidden />
                </label>
              </div>
            </section>
          </div>
        )}

        {/* ================= TAB 2: APARIENCIA ================= */}
        {activeTab === "appearance" && (
          <div className="settings-tab-panel">
            <div className="settings-panel-header">
              <h2>Apariencia & Interfaz</h2>
              <p>Personaliza el estilo visual, temas cromáticos y comportamiento de pantalla.</p>
            </div>

            {/* Selector de Estilos de Diseño */}
            <section className="settings-card">
              <h3>Estilo de Diseño (Layout)</h3>
              <p className="settings-hint" style={{ marginBottom: '16px' }}>
                Elige la estructura y disposición visual de la pantalla principal.
              </p>
              <div className="settings-themes-grid">
                <button
                  type="button"
                  className={`settings-theme-card ${layoutStyle === "classic" ? "active" : ""}`}
                  onClick={() => onLayoutStyleChange?.("classic")}
                >
                  <div className="settings-theme-preview" style={{ background: "#0a0b10", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                    📑
                  </div>
                  <div className="settings-theme-info">
                    <span className="settings-theme-name">Estilo Clásico (Cards)</span>
                    <span className="settings-theme-desc">Hero flotante tipo tarjeta, barra lateral expandible y buscador en la cabecera.</span>
                  </div>
                </button>

                <button
                  type="button"
                  className={`settings-theme-card ${layoutStyle === "immersive" ? "active" : ""}`}
                  onClick={() => onLayoutStyleChange?.("immersive")}
                >
                  <div className="settings-theme-preview" style={{ background: "linear-gradient(135deg, #071526, #00f0ff22)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                    🌌
                  </div>
                  <div className="settings-theme-info">
                    <span className="settings-theme-name">Estilo Inmersivo (Edge-to-Edge)</span>
                    <span className="settings-theme-desc">Hero panorámico sin bordes, buscador embebido, barra fija y reproductor flotante en navbar.</span>
                  </div>
                </button>
              </div>
            </section>

            {/* Selector de Temas */}
            <section className="settings-card">
              <h3>Temas Visuales</h3>
              <p className="settings-hint" style={{ marginBottom: '16px' }}>
                Selecciona la paleta de iluminación y acento para toda la interfaz.
              </p>
              <div className="settings-themes-grid">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`settings-theme-card ${theme === t.id ? "active" : ""}`}
                    onClick={() => onThemeChange?.(t.id)}
                  >
                    <div className="settings-theme-preview" style={{ background: t.bg }}>
                      <div className="settings-theme-swatch" style={{ background: t.primary }} />
                      <div className="settings-theme-card-preview" style={{ background: t.card }} />
                    </div>
                    <div className="settings-theme-info">
                      <span className="settings-theme-name">{t.name}</span>
                      <span className="settings-theme-desc">{t.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Modo Kiosko */}
            <section className="settings-card">
              <div className="settings-row-option">
                <div>
                  <span className="settings-option-title">Modo Kiosko / Consola</span>
                  <p className="settings-option-desc">Inicia GameFlix en pantalla completa sin bordes de ventana.</p>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={kioskMode}
                    onChange={handleKioskToggle}
                  />
                  <span className="settings-toggle-slider" />
                </label>
              </div>
            </section>
          </div>
        )}

        {/* ================= TAB 3: GRÁFICOS HD ================= */}
        {activeTab === "graphics" && (
          <div className="settings-tab-panel">
            <div className="settings-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Opciones Gráficas & Renderizado HD</h2>
                <p>Configura resolución interna, filtros de texturas, shaders y escalado por consola.</p>
              </div>
              {savedToast && <span className="settings-badge-ok">✓ Guardado</span>}
            </div>

            {/* Sub-selector de consolas */}
            <div className="settings-console-tabs">
              <button
                type="button"
                className={`settings-console-pill ${activeGraphicsConsole === "citra" ? "active" : ""}`}
                onClick={() => setActiveGraphicsConsole("citra")}
              >
                🎮 3DS (Citra)
              </button>
              <button
                type="button"
                className={`settings-console-pill ${activeGraphicsConsole === "pcsx2" ? "active" : ""}`}
                onClick={() => setActiveGraphicsConsole("pcsx2")}
              >
                🎮 PS2 (PCSX2)
              </button>
              <button
                type="button"
                className={`settings-console-pill ${activeGraphicsConsole === "dolphin" ? "active" : ""}`}
                onClick={() => setActiveGraphicsConsole("dolphin")}
              >
                🎮 GameCube / Wii
              </button>
              <button
                type="button"
                className={`settings-console-pill ${activeGraphicsConsole === "ppsspp" ? "active" : ""}`}
                onClick={() => setActiveGraphicsConsole("ppsspp")}
              >
                🎮 PSP (PPSSPP)
              </button>
              <button
                type="button"
                className={`settings-console-pill ${activeGraphicsConsole === "ps1" ? "active" : ""}`}
                onClick={() => setActiveGraphicsConsole("ps1")}
              >
                🎮 PS1
              </button>
              <button
                type="button"
                className={`settings-console-pill ${activeGraphicsConsole === "n64" ? "active" : ""}`}
                onClick={() => setActiveGraphicsConsole("n64")}
              >
                🎮 N64
              </button>
              <button
                type="button"
                className={`settings-console-pill ${activeGraphicsConsole === "nds" ? "active" : ""}`}
                onClick={() => setActiveGraphicsConsole("nds")}
              >
                🎮 NDS (MelonDS)
              </button>
              <button
                type="button"
                className={`settings-console-pill ${activeGraphicsConsole === "global" ? "active" : ""}`}
                onClick={() => setActiveGraphicsConsole("global")}
              >
                🌟 Globales
              </button>
            </div>

            {/* --- CITRA (3DS) --- */}
            {activeGraphicsConsole === "citra" && (
              <section className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h3>Nintendo 3DS (Core Citra)</h3>
                    <p>Opciones de renderizado 3D y distribución de pantallas.</p>
                  </div>
                </div>

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Resolución Interna (Upscaling)</span>
                    <p className="settings-option-desc">Multiplica la resolución nativa de 3DS para gráficos nítidos en HD.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["citra_resolution_factor"] || "1x (Native)"}
                    onChange={(e) => updateCoreOption("citra_resolution_factor", e.target.value)}
                  >
                    <option value="1x (Native)">1x (Nativa - 400x240)</option>
                    <option value="2x">2x (800x480 - HD)</option>
                    <option value="3x">3x (1200x720 - 720p HD)</option>
                    <option value="4x">4x (1600x960 - 1080p Full HD)</option>
                    <option value="5x">5x (2000x1200 - 1440p 2K)</option>
                  </select>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Disposición de Pantallas</span>
                    <p className="settings-option-desc">Cómo se organizan la pantalla superior y táctil en tu monitor.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["citra_layout_option"] || "Default Top-Bottom Screen"}
                    onChange={(e) => updateCoreOption("citra_layout_option", e.target.value)}
                  >
                    <option value="Default Top-Bottom Screen">Arriba / Abajo (Estándar)</option>
                    <option value="Side by Side">Lado a Lado (Horizontal)</option>
                    <option value="Single Screen Only">Solo Pantalla Principal</option>
                    <option value="Large Screen, Small Screen">Pantalla Principal Grande</option>
                  </select>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Filtro de Texturas (Texture Filter)</span>
                    <p className="settings-option-desc">Algoritmo de mejora y escalado de texturas 3D.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["citra_texture_filter"] || "none"}
                    onChange={(e) => updateCoreOption("citra_texture_filter", e.target.value)}
                  >
                    <option value="none">Desactivado (Original)</option>
                    <option value="Anime4K Ultrafast">Anime4K Ultrafast</option>
                    <option value="Bicubic">Bicúbico</option>
                    <option value="ScaleForce">ScaleForce</option>
                    <option value="xBRZ">xBRZ HD</option>
                  </select>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Post-Processing Shader (Anti-Aliasing)</span>
                    <p className="settings-option-desc">Suavizado de bordes y dientes de sierra en polígonos.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["citra_post_processing_shader"] || "none"}
                    onChange={(e) => updateCoreOption("citra_post_processing_shader", e.target.value)}
                  >
                    <option value="none">Ninguno</option>
                    <option value="fxaa">FXAA (Anti-Aliasing Suave)</option>
                    <option value="hq4x">HQ4x</option>
                  </select>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Filtro Lineal de Pantalla</span>
                    <p className="settings-option-desc">Suavizado de visualización entre pantallas.</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={graphics.core_options["citra_linear_filter"] !== "disabled"}
                      onChange={(e) => updateCoreOption("citra_linear_filter", e.target.checked ? "enabled" : "disabled")}
                    />
                    <span className="settings-toggle-slider" />
                  </label>
                </div>
              </section>
            )}

            {/* --- PCSX2 (PS2) --- */}
            {activeGraphicsConsole === "pcsx2" && (
              <section className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h3>PlayStation 2 (Core PCSX2 / LRPS2)</h3>
                    <p>Mejoras de renderizado y escalado 3D de alta fidelidad.</p>
                  </div>
                </div>

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Resolución Interna (Upscaling)</span>
                    <p className="settings-option-desc">Multiplicador de resolución para gráficos de PS2 en Full HD o 4K.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["pcsx2_upscale_multiplier"] || "1"}
                    onChange={(e) => updateCoreOption("pcsx2_upscale_multiplier", e.target.value)}
                  >
                    <option value="1">1x (Nativo PS2 480i/p)</option>
                    <option value="2">2x (720p HD)</option>
                    <option value="3">3x (1080p Full HD)</option>
                    <option value="4">4x (1440p 2K)</option>
                    <option value="6">6x (4K Ultra HD)</option>
                  </select>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Filtrado Anisótropo (Anisotropic Filtering)</span>
                    <p className="settings-option-desc">Aumenta la claridad de las texturas en ángulos oblicuos.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["pcsx2_anisotropic_filtering"] || "0"}
                    onChange={(e) => updateCoreOption("pcsx2_anisotropic_filtering", e.target.value)}
                  >
                    <option value="0">Desactivado (Off)</option>
                    <option value="2">2x</option>
                    <option value="4">4x</option>
                    <option value="8">8x</option>
                    <option value="16">16x (Máxima calidad)</option>
                  </select>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Parches Widescreen 16:9</span>
                    <p className="settings-option-desc">Aplica parches automáticos para expandir juegos 4:3 a pantalla ancha 16:9.</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={graphics.core_options["pcsx2_widescreen_patches"] === "enabled"}
                      onChange={(e) => updateCoreOption("pcsx2_widescreen_patches", e.target.checked ? "enabled" : "disabled")}
                    />
                    <span className="settings-toggle-slider" />
                  </label>
                </div>
              </section>
            )}

            {/* --- DOLPHIN (GameCube / Wii) --- */}
            {activeGraphicsConsole === "dolphin" && (
              <section className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h3>Nintendo GameCube / Wii (Core Dolphin)</h3>
                    <p>Opciones de renderizado EFB, antialiasing y resolución.</p>
                  </div>
                </div>

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Resolución Interna EFB</span>
                    <p className="settings-option-desc">Escalado de renderizado 3D.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["dolphin_efb_scale"] || "x1 (640x528)"}
                    onChange={(e) => updateCoreOption("dolphin_efb_scale", e.target.value)}
                  >
                    <option value="x1 (640x528)">1x (640x528 - Nativa 480p)</option>
                    <option value="x2 (1280x1056)">2x (1280x1056 - 720p HD)</option>
                    <option value="x3 (1920x1584)">3x (1920x1584 - 1080p FHD)</option>
                    <option value="x4 (2560x2112)">4x (2560x2112 - 1440p 2K)</option>
                  </select>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Anti-Aliasing (MSAA)</span>
                    <p className="settings-option-desc">Suavizado de polígonos.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["dolphin_anti_aliasing"] || "None"}
                    onChange={(e) => updateCoreOption("dolphin_anti_aliasing", e.target.value)}
                  >
                    <option value="None">Ninguno</option>
                    <option value="2x MSAA">2x MSAA</option>
                    <option value="4x MSAA">4x MSAA</option>
                    <option value="8x MSAA">8x MSAA</option>
                  </select>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Widescreen Hack 16:9</span>
                    <p className="settings-option-desc">Fuerza renderizado panorámico 16:9 en juegos de GameCube.</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={graphics.core_options["dolphin_widescreen_hack"] === "enabled"}
                      onChange={(e) => updateCoreOption("dolphin_widescreen_hack", e.target.checked ? "enabled" : "disabled")}
                    />
                    <span className="settings-toggle-slider" />
                  </label>
                </div>
              </section>
            )}

            {/* --- PPSSPP (PSP) --- */}
            {activeGraphicsConsole === "ppsspp" && (
              <section className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h3>PlayStation Portable (Core PPSSPP)</h3>
                    <p>Resolución y filtros de texturas HD para PSP.</p>
                  </div>
                </div>

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Resolución de Renderizado</span>
                    <p className="settings-option-desc">Multiplica la resolución nativa de PSP (480x272).</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["ppsspp_internal_resolution"] || "480x272"}
                    onChange={(e) => updateCoreOption("ppsspp_internal_resolution", e.target.value)}
                  >
                    <option value="480x272">1x (480x272 - Nativa)</option>
                    <option value="960x544">2x (960x544 - 2x PSP / PS Vita)</option>
                    <option value="1440x816">3x (1440x816 - 720p HD)</option>
                    <option value="1920x1088">4x (1920x1088 - 1080p Full HD)</option>
                    <option value="2400x1360">5x (2400x1360 - 2K)</option>
                  </select>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Escalado de Texturas HD</span>
                    <p className="settings-option-desc">Algoritmo para reescalar texturas 2D y 3D en alta definición.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["ppsspp_texture_scaling_type"] || "off"}
                    onChange={(e) => updateCoreOption("ppsspp_texture_scaling_type", e.target.value)}
                  >
                    <option value="off">Desactivado (Off)</option>
                    <option value="xbrz">xBRZ HD</option>
                    <option value="hybrid">Híbrido</option>
                    <option value="bicubic">Bicúbico</option>
                  </select>
                </div>
              </section>
            )}

            {/* --- PS1 --- */}
            {activeGraphicsConsole === "ps1" && (
              <section className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h3>PlayStation 1 (Core PCSX-ReARMed / Beetle PSX)</h3>
                    <p>Mejoras de alta resolución y tramado para PS1.</p>
                  </div>
                </div>

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Modo Alta Resolución HD (Neon Enhanced)</span>
                    <p className="settings-option-desc">Duplica la resolución de renderizado 3D de PS1 a 480p.</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={graphics.core_options["pcsx_rearmed_neon_enhancement_enable"] === "enabled"}
                      onChange={(e) => updateCoreOption("pcsx_rearmed_neon_enhancement_enable", e.target.checked ? "enabled" : "disabled")}
                    />
                    <span className="settings-toggle-slider" />
                  </label>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Suavizado de Texturas HD</span>
                    <p className="settings-option-desc">Aplica filtrado suave a las texturas 3D en modo de alta resolución.</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={graphics.core_options["pcsx_rearmed_neon_enhancement_no_main"] === "enabled"}
                      onChange={(e) => updateCoreOption("pcsx_rearmed_neon_enhancement_no_main", e.target.checked ? "enabled" : "disabled")}
                    />
                    <span className="settings-toggle-slider" />
                  </label>
                </div>
              </section>
            )}

            {/* --- N64 --- */}
            {activeGraphicsConsole === "n64" && (
              <section className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h3>Nintendo 64 (Core Mupen64Plus-Next)</h3>
                    <p>Resolución 3D y escalado de texturas.</p>
                  </div>
                </div>

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Resolución de Renderizado</span>
                    <p className="settings-option-desc">Resolución del plugin gráfico GLideN64.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["mupen64plus-next-43screensize"] || "640x480"}
                    onChange={(e) => updateCoreOption("mupen64plus-next-43screensize", e.target.value)}
                  >
                    <option value="640x480">640x480 (Nativa N64)</option>
                    <option value="960x720">960x720 (HD)</option>
                    <option value="1440x1080">1440x1080 (Full HD)</option>
                    <option value="1920x1440">1920x1440 (2K)</option>
                  </select>
                </div>
              </section>
            )}

            {/* --- NDS --- */}
            {activeGraphicsConsole === "nds" && (
              <section className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h3>Nintendo DS (Core MelonDS)</h3>
                    <p>Disposición y modo táctil de pantallas.</p>
                  </div>
                </div>

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Distribución de Pantallas</span>
                    <p className="settings-option-desc">Orientación de las dos pantallas de Nintendo DS.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.core_options["melonds_screen_layout"] || "Top/Bottom"}
                    onChange={(e) => updateCoreOption("melonds_screen_layout", e.target.value)}
                  >
                    <option value="Top/Bottom">Arriba / Abajo (Vertical)</option>
                    <option value="Left/Right">Izquierda / Derecha (Horizontal)</option>
                    <option value="Top Only">Solo Pantalla Superior</option>
                    <option value="Bottom Only">Solo Pantalla Táctil</option>
                  </select>
                </div>
              </section>
            )}

            {/* --- GLOBALES --- */}
            {activeGraphicsConsole === "global" && (
              <section className="settings-card">
                <div className="settings-card-header">
                  <div>
                    <h3>Opciones Gráficas Globales</h3>
                    <p>Filtros aplicables a todas las consolas y juegos 2D/3D.</p>
                  </div>
                </div>

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Filtro de Suavizado Bilineal (Linear Filter)</span>
                    <p className="settings-option-desc">Suaviza los bordes de la imagen para pantallas grandes.</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={graphics.video_smooth}
                      onChange={(e) => updateGlobalGraphic("video_smooth", e.target.checked)}
                    />
                    <span className="settings-toggle-slider" />
                  </label>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Escalado por Enteros (Pixel-Perfect)</span>
                    <p className="settings-option-desc">Garantiza que los píxeles 2D de consolas retro no se distorsionen.</p>
                  </div>
                  <label className="settings-toggle">
                    <input
                      type="checkbox"
                      checked={graphics.video_scale_integer}
                      onChange={(e) => updateGlobalGraphic("video_scale_integer", e.target.checked)}
                    />
                    <span className="settings-toggle-slider" />
                  </label>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Relación de Aspecto Global</span>
                    <p className="settings-option-desc">Proporción de pantalla al reproducir juegos.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.aspect_ratio || "auto"}
                    onChange={(e) => updateGlobalGraphic("aspect_ratio", e.target.value)}
                  >
                    <option value="auto">Automática (Provista por el Core)</option>
                    <option value="4:3">4:3 (Televisor Clásico)</option>
                    <option value="16:9">16:9 (Pantalla Ancha)</option>
                    <option value="16:10">16:10 (Monitor PC / Steam Deck)</option>
                  </select>
                </div>

                <div className="settings-divider" />

                <div className="settings-row-option">
                  <div>
                    <span className="settings-option-title">Relación de Aspecto Global</span>
                    <p className="settings-option-desc">Proporción de pantalla al reproducir juegos.</p>
                  </div>
                  <select
                    className="settings-select"
                    value={graphics.aspect_ratio || "auto"}
                    onChange={(e) => updateGlobalGraphic("aspect_ratio", e.target.value)}
                  >
                    <option value="auto">Automática (Provista por el Core)</option>
                    <option value="4:3">4:3 (Televisor Clásico)</option>
                    <option value="16:9">16:9 (Pantalla Ancha)</option>
                    <option value="16:10">16:10 (Monitor PC / Steam Deck)</option>
                  </select>
                </div>
              </section>
            )}
          </div>
        )}

        {/* ================= TAB: SONIDO ================= */}
        {activeTab === "sound" && (
          <div className="settings-tab-panel">
            <div className="settings-panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>Sonido & Salida de Audio</h2>
                <p>Selecciona el dispositivo de audio del sistema (auriculares, parlantes) y driver de sonido.</p>
              </div>
              {savedToast && <span className="settings-badge-ok">✓ Guardado</span>}
            </div>

            {/* Dispositivo de Salida */}
            <section className="settings-card highlight">
              <div className="settings-card-header">
                <div>
                  <h3>Dispositivo de Salida de Audio</h3>
                  <p>Selecciona por qué parlantes o auriculares deseas escuchar los juegos.</p>
                </div>
                <button
                  type="button"
                  className="settings-btn-secondary"
                  onClick={refreshAudioDevices}
                  disabled={refreshingAudio}
                >
                  {refreshingAudio ? "Buscando..." : "🔄 Actualizar Dispositivos"}
                </button>
              </div>

              <div className="settings-row-option">
                <div>
                  <span className="settings-option-title">Dispositivo Activo</span>
                  <p className="settings-option-desc">
                    Elige el dispositivo de salida específico o déjalo en predeterminado para seguir a Windows.
                  </p>
                </div>
                <select
                  className="settings-select"
                  value={graphics.audio_device || ""}
                  onChange={(e) => updateGlobalGraphic("audio_device", e.target.value)}
                  style={{ minWidth: '320px' }}
                >
                  <option value="">🌟 Predeterminado del Sistema (Auto-conmutar)</option>
                  {audioDevices.map((dev) => {
                    const devLower = dev.toLowerCase();
                    const icon = devLower.includes("head") || devLower.includes("auricul") || devLower.includes("g733") || devLower.includes("yeti") || devLower.includes("corsair")
                      ? "🎧"
                      : devLower.includes("parlante") || devLower.includes("altavoz") || devLower.includes("speaker")
                      ? "🔊"
                      : "🖥️";
                    return (
                      <option key={dev} value={dev}>
                        {icon} {dev}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="settings-divider" />

              <p className="settings-hint">
                💡 <strong>Modo Predeterminado:</strong> Con la opción <em>"Predeterminado del Sistema"</em> y el driver <em>WASAPI</em>, el juego conmuta automáticamente de los parlantes a los auriculares en el momento en que los conectes o los selecciones en la barra de tareas de Windows.
              </p>
            </section>

            {/* Volumen Master */}
            <section className="settings-card">
              <h3>Volumen de Emulación</h3>
              <div className="settings-row-option" style={{ marginTop: '12px' }}>
                <div>
                  <span className="settings-option-title">Nivel de Volumen: {graphics.audio_volume ?? 100}%</span>
                  <p className="settings-option-desc">
                    Ganancia de salida del juego (100% = Ganancia Original 0 dB).
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="5"
                    value={graphics.audio_volume ?? 100}
                    onChange={(e) => updateGlobalGraphic("audio_volume", parseInt(e.target.value, 10))}
                    style={{ width: '180px', accentColor: 'var(--primary, #f59e0b)', cursor: 'pointer' }}
                  />
                  <span style={{ minWidth: '45px', fontWeight: 600, fontSize: '0.95rem' }}>
                    {graphics.audio_volume ?? 100}%
                  </span>
                </div>
              </div>
            </section>

            {/* Controlador de Audio (Driver) */}
            <section className="settings-card">
              <h3>Controlador de Audio (Driver de Emulación)</h3>
              
              <div className="settings-row-option" style={{ marginTop: '12px' }}>
                <div>
                  <span className="settings-option-title">API de Sonido en Windows</span>
                  <p className="settings-option-desc">
                    XAudio2 proporciona la máxima compatibilidad y estabilidad con auriculares USB, Bluetooth, interfaces y parlantes.
                  </p>
                </div>
                <select
                  className="settings-select"
                  value={graphics.audio_driver || "xaudio"}
                  onChange={(e) => updateGlobalGraphic("audio_driver", e.target.value)}
                >
                  <option value="xaudio">XAudio2 (Recomendado - Máxima compatibilidad)</option>
                  <option value="wasapi">WASAPI (Windows Audio Session API)</option>
                  <option value="dsound">DirectSound (Legado)</option>
                </select>
              </div>

              <div className="settings-divider" />

              <div className="settings-row-option">
                <div>
                  <span className="settings-option-title">Latencia de Audio</span>
                  <p className="settings-option-desc">Tamaño del búfer de sonido para evitar cortes o retrasos.</p>
                </div>
                <select
                  className="settings-select"
                  value={graphics.audio_latency || 64}
                  onChange={(e) => updateGlobalGraphic("audio_latency", parseInt(e.target.value, 10))}
                >
                  <option value={32}>32 ms (Mínima latencia / Respuesta ultra-rápida)</option>
                  <option value={64}>64 ms (Equilibrada / Recomendada)</option>
                  <option value={128}>128 ms (Alta estabilidad / PCs de bajos recursos)</option>
                </select>
              </div>
            </section>

            {/* Volumen de Interfaz, Música y Efectos */}
            <section className="settings-card highlight">
              <h3>Volumen de la Interfaz & Música</h3>
              <p style={{ marginTop: '4px', fontSize: '0.9rem', color: 'var(--text-muted, #9ca3af)' }}>
                Configura los niveles de sonido para la música de fondo y los efectos interactivos de la aplicación.
              </p>

              {/* Selector de Volumen de Música de Fondo */}
              <div className="settings-row-option" style={{ marginTop: '16px' }}>
                <div>
                  <span className="settings-option-title">
                    Música de Fondo: {Math.round(musicVolume * 100)}%
                  </span>
                  <p className="settings-option-desc">
                    Volumen de los temas musicales y reproductor de vinilo (con fade in y fade out suave).
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={musicVolume}
                    onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value))}
                    style={{ width: '180px', accentColor: 'var(--primary, #f59e0b)', cursor: 'pointer' }}
                  />
                  <span style={{ minWidth: '45px', fontWeight: 600, fontSize: '0.95rem' }}>
                    {Math.round(musicVolume * 100)}%
                  </span>
                </div>
              </div>

              <div className="settings-divider" />

              {/* Selector de Volumen de Efectos Sonoros */}
              <div className="settings-row-option">
                <div>
                  <span className="settings-option-title">
                    Efectos de Sonido (Lanzamiento de Juego): {Math.round(sfxVolume * 100)}%
                  </span>
                  <p className="settings-option-desc">
                    Volumen del sonido que se reproduce al pulsar Play para arrancar una partida.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={sfxVolume}
                    onChange={(e) => handleSfxVolumeChange(parseFloat(e.target.value))}
                    style={{ width: '180px', accentColor: 'var(--primary, #f59e0b)', cursor: 'pointer' }}
                  />
                  <span style={{ minWidth: '45px', fontWeight: 600, fontSize: '0.95rem' }}>
                    {Math.round(sfxVolume * 100)}%
                  </span>
                </div>
              </div>
            </section>

            {/* Música de Fondo & Reproductor Vinilo */}
            <section className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h3>Música de Fondo (Reproductor Vinilo)</h3>
                  <p>Escanea tus temas musicales o abre la carpeta para agregar nuevas canciones en formatos OGG, MP3, OPUS, FLAC o WAV.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="settings-btn-secondary"
                    onClick={handleOpenMusicFolder}
                  >
                    📂 Abrir Carpeta
                  </button>
                  <button
                    type="button"
                    className="settings-btn-primary"
                    onClick={handleScanMusic}
                    disabled={scanningMusic}
                  >
                    {scanningMusic ? "Escaneando..." : "🔄 Escanear Música"}
                  </button>
                </div>
              </div>

              <div className="settings-row-option">
                <div>
                  <span className="settings-option-title">Colección de Música</span>
                  <p className="settings-option-desc">
                    {musicTrackCount !== null
                      ? `${musicTrackCount} temas disponibles en la rotación del vinilo.`
                      : "Cargando temas musicales..."}
                  </p>
                </div>
                {musicFeedback && (
                  <span className="settings-badge-ok">
                    {musicFeedback}
                  </span>
                )}
              </div>
            </section>

            {/* Carpetas de Música Personalizadas */}
            <section className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h3>Carpetas de Música</h3>
                  <p>
                    Directorios adicionales con tus archivos de música (MP3, OGG, FLAC, WAV, OPUS). La colección integrada en <code>public/music</code> se incluye siempre como base.
                  </p>
                </div>
                <button type="button" onClick={handleAddMusicFolder} className="settings-btn-add">
                  + Agregar Carpeta de Música
                </button>
              </div>

              <ul className="settings-folders">
                <li className="settings-folder-item" style={{ opacity: 0.9 }}>
                  <span className="settings-folder-path" title="Colección integrada del sistema">
                    ⭐ public/music (Colección integrada de GameFlix)
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #9ca3af)', paddingRight: '8px' }}>
                    Base
                  </span>
                </li>
                {musicFolders.map((mf) => (
                  <li key={mf} className="settings-folder-item">
                    <span className="settings-folder-path" title={mf}>{mf}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMusicFolder(mf)}
                      className="settings-btn-delete"
                      title="Quitar carpeta"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* ================= TAB 5: EMULACIÓN ================= */}
        {activeTab === "emulation" && (
          <div className="settings-tab-panel">
            <div className="settings-panel-header">
              <h2>Emulación & Cores</h2>
              <p>Configuración de núcleos de RetroArch y detección de controles.</p>
            </div>

            {/* Detección de Gamepad */}
            <section className="settings-card">
              <h3>Mandos y Gamepads Conectados</h3>
              <div className="settings-gamepad-box">
                {connectedGamepads.length > 0 ? (
                  <div className="settings-gamepad-list">
                    {connectedGamepads.map((name, i) => (
                      <div key={i} className="settings-gamepad-item">
                        <span className="settings-gamepad-icon">🎮</span>
                        <div>
                          <span className="settings-gamepad-name">{name}</span>
                          <span className="settings-badge-ok">Conectado y Activo</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="settings-gamepad-empty">
                    <span className="settings-gamepad-icon-muted">🎮</span>
                    <p>Ningún gamepad detectado en este momento.</p>
                    <span className="settings-hint">Conecta un mando por USB o Bluetooth para navegar con gamepad.</span>
                  </div>
                )}
              </div>
            </section>

            {/* Asignación de Cores */}
            {uniquePlatforms.length > 0 ? (
              <section className="settings-card">
                <h3>Cores por Plataforma</h3>
                <p className="settings-hint" style={{ marginBottom: '16px' }}>
                  Core por defecto que se usará al lanzar juegos de cada consola.
                </p>
                <div className="settings-platform-cores">
                  {uniquePlatforms.map((platform) => {
                    const options = PLATFORM_CORES[platform] || [getDefaultCore(platform)];
                    return (
                      <div key={platform} className="settings-platform-row">
                        <span className="settings-platform-name">{platform}</span>
                        <select
                          className="settings-platform-select"
                          value={platformCores[platform] || getDefaultCore(platform)}
                          onChange={(e) => onPlatformCoreChange(platform, e.target.value)}
                        >
                          {options.map((core) => (
                            <option key={core} value={core}>{core}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <section className="settings-card">
                <h3>Cores por Plataforma</h3>
                <p className="settings-hint">Escanea tu biblioteca de juegos para configurar los cores de cada plataforma.</p>
              </section>
            )}
          </div>
        )}

        {/* ================= TAB 5: CUENTAS & INTEGRACIONES ================= */}
        {activeTab === "integrations" && (
          <div className="settings-tab-panel">
            <div className="settings-panel-header">
              <h2>Cuentas & Servicios Online</h2>
              <p>Vincula logros y scrapers de imágenes en alta resolución.</p>
            </div>

            {/* RetroAchievements */}
            <section className="settings-card">
              <div className="settings-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TrophyIcon />
                  <div>
                    <h3>RetroAchievements</h3>
                    <p>Desbloquea logros retro oficiales mientras juegas.</p>
                  </div>
                </div>
                {raLinkedUser && <span className="settings-badge-ok">✓ Vinculado</span>}
              </div>

              {raLinkedUser ? (
                <div className="settings-account-linked">
                  <p className="settings-hint">
                    Sesión activa con el usuario: <strong>{raLinkedUser}</strong>
                  </p>
                  <button type="button" className="settings-btn-secondary" onClick={handleUnlinkRA}>
                    Desvincular Cuenta
                  </button>
                </div>
              ) : (
                <div className="settings-form-block">
                  <div className="settings-input-group">
                    <input
                      className="settings-input"
                      placeholder="Usuario de RetroAchievements"
                      value={raUsername}
                      onChange={(e) => setRaUsername(e.target.value)}
                    />
                    <input
                      className="settings-input"
                      type="password"
                      placeholder="Contraseña"
                      value={raPassword}
                      onChange={(e) => setRaPassword(e.target.value)}
                    />
                    <input
                      className="settings-input"
                      type="password"
                      placeholder="Web API Key"
                      value={raApiKey}
                      onChange={(e) => setRaApiKey(e.target.value)}
                    />
                  </div>
                  <div className="settings-form-footer">
                    <a
                      href="https://retroachievements.org/controlpanel.php"
                      target="_blank"
                      rel="noreferrer"
                      className="settings-link"
                    >
                      🔗 Obtener mi API Key en RetroAchievements
                    </a>
                    <button type="button" className="settings-btn-primary" onClick={handleLinkRA}>
                      Vincular Cuenta
                    </button>
                  </div>
                </div>
              )}

              {raFeedback && (
                <p className={`settings-feedback ${raFeedback.isError ? "error" : "success"}`}>
                  {raFeedback.msg}
                </p>
              )}

              <div className="settings-divider" />

              <div className="settings-row-option">
                <div>
                  <span className="settings-option-title">Modo Hardcore</span>
                  <p className="settings-option-desc">
                    Deshabilita savestates y trucos para competir en tablas de clasificación oficiales.
                  </p>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={raHardcore}
                    onChange={handleToggleRAHardcore}
                  />
                  <span className="settings-toggle-slider" />
                </label>
              </div>
            </section>

            {/* SteamGridDB */}
            <section className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h3>🎨 SteamGridDB (Heroes & Banners)</h3>
                  <p>Descarga portadas y banners panorámicos en alta definición para el carrusel.</p>
                </div>
                {sgdbLinked && <span className="settings-badge-ok">✓ Activo</span>}
              </div>

              {sgdbLinked ? (
                <div className="settings-account-linked">
                  <p className="settings-hint">API Key configurada correctamente.</p>
                  <button type="button" className="settings-btn-secondary" onClick={handleUnlinkSGDB}>
                    Desvincular API Key
                  </button>
                </div>
              ) : (
                <div className="settings-form-block">
                  <input
                    className="settings-input"
                    type="password"
                    placeholder="SteamGridDB API Key (Bearer Token)"
                    value={sgdbApiKey}
                    onChange={(e) => setSgdbApiKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLinkSGDB();
                    }}
                  />
                  <div className="settings-form-footer">
                    <a
                      href="https://www.steamgriddb.com/profile/preferences/api"
                      target="_blank"
                      rel="noreferrer"
                      className="settings-link"
                    >
                      🔗 Obtener API Key en SteamGridDB (Perfil &gt; Preferencias &gt; API)
                    </a>
                    <button
                      type="button"
                      className="settings-btn-primary"
                      onClick={handleLinkSGDB}
                      disabled={sgdbLoading}
                    >
                      {sgdbLoading ? "Verificando..." : "Guardar API Key"}
                    </button>
                  </div>
                </div>
              )}

              {sgdbFeedback && (
                <p className={`settings-feedback ${sgdbFeedback.isError ? "error" : "success"}`}>
                  {sgdbFeedback.msg}
                </p>
              )}
            </section>
          </div>
        )}

        {/* ================= TAB 6: PERFILES ================= */}
        {activeTab === "profiles" && (
          <div className="settings-tab-panel">
            <div className="settings-panel-header">
              <h2>Perfiles & Usuarios</h2>
              <p>Administra perfiles independientes con sus propios favoritos e historial.</p>
            </div>

            {/* Perfil Actual y Switch */}
            <section className="settings-card">
              <h3>Perfil Activo</h3>
              <div className="settings-profile-row">
                <select
                  className="settings-profile-select"
                  value={currentProfile}
                  onChange={(e) => handleSwitchProfile(e.target.value)}
                >
                  {profiles.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {profiles.length > 1 && (
                  <button
                    type="button"
                    className="settings-btn-delete"
                    onClick={() => handleDeleteProfile(currentProfile)}
                    title="Eliminar perfil actual"
                  >
                    Eliminar Perfil
                  </button>
                )}
              </div>

              <div className="settings-divider" />

              <h3>Crear Nuevo Perfil</h3>
              <div className="settings-input-row" style={{ marginTop: '12px' }}>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateProfile();
                  }}
                  placeholder="Nombre del nuevo perfil..."
                  className="settings-input"
                />
                <button type="button" onClick={handleCreateProfile} className="settings-btn-add">
                  + Crear Perfil
                </button>
              </div>
            </section>

            {/* Estadísticas del Perfil */}
            <section className="settings-card">
              <h3>Estadísticas de este Perfil</h3>
              <div className="settings-stats-grid">
                <div className="settings-stat-item">
                  <span className="settings-stat-val">{games.length}</span>
                  <span className="settings-stat-label">Juegos en Biblioteca</span>
                </div>
                <div className="settings-stat-item">
                  <span className="settings-stat-val">{games.filter((g) => g.favorite).length}</span>
                  <span className="settings-stat-label">Juegos Favoritos</span>
                </div>
                <div className="settings-stat-item">
                  <span className="settings-stat-val">{uniquePlatforms.length}</span>
                  <span className="settings-stat-label">Consolas Disponibles</span>
                </div>
                <div className="settings-stat-item">
                  <span className="settings-stat-val">{folders.length}</span>
                  <span className="settings-stat-label">Directorios de ROMs</span>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================= TAB 7: SISTEMA ================= */}
        {activeTab === "system" && (
          <div className="settings-tab-panel">
            <div className="settings-panel-header">
              <h2>Sistema & Diagnóstico</h2>
              <p>Registro de errores, información de la aplicación y licencias.</p>
            </div>

            {/* Log de Errores */}
            <section className="settings-card">
              <div className="settings-card-header">
                <div>
                  <h3>Registro de Errores (Logs)</h3>
                  <p>Útil para diagnosticar problemas al lanzar emuladores o escanear.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {errorLogs !== null && (
                    <button type="button" className="settings-btn-secondary" onClick={handleCopyLogs}>
                      {copiedLog ? "✓ Copiado" : "📋 Copiar Log"}
                    </button>
                  )}
                  <button type="button" className="settings-btn-secondary" onClick={handleToggleLogs}>
                    {errorLogs !== null ? "Ocultar" : "Ver Logs"}
                  </button>
                </div>
              </div>

              {errorLogs !== null && (
                <pre className="settings-log-view">{errorLogs}</pre>
              )}
            </section>

            {/* Acerca de */}
            <section className="settings-card settings-about">
              <h3>Acerca de GameFlix</h3>
              <div className="settings-about-box">
                <div className="settings-about-header">
                  <span className="settings-about-logo">GameFlix</span>
                  <span className="settings-badge">v0.1.0</span>
                </div>
                <p className="settings-gpl">
                  GameFlix es un frontend retro impulsado por <strong>Tauri</strong>, <strong>React</strong> y <strong>Rust</strong>.
                </p>
                <p className="settings-gpl">
                  Utiliza <a href="https://www.retroarch.com/" target="_blank" rel="noreferrer">RetroArch</a> y{" "}
                  <a href="https://www.libretro.com/" target="_blank" rel="noreferrer">libretro</a> bajo la licencia GNU GPL v3.
                  Los cores de emulación son distribuidos bajo sus respectivas licencias.
                </p>
                <p className="settings-gpl">
                  Las carátulas se obtienen de{" "}
                  <a href="https://github.com/libretro/libretro-thumbnails" target="_blank" rel="noreferrer">libretro-thumbnails</a> y{" "}
                  <a href="https://www.steamgriddb.com/" target="_blank" rel="noreferrer">SteamGridDB</a>.
                </p>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
