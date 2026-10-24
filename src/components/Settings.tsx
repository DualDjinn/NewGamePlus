import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import {
  saveSettings,
  setKioskMode,
  createProfile,
  deleteProfile,
  switchProfile,
  renameProfile,
  saveBiosFolders,
  saveVideoFolders,
  saveMusicFolders,
  getGraphicsSettings,
  saveGraphicsSettings,
  onEmulatorUpdates,
  type GraphicsSettings,
} from "../lib/tauri";
import type { SortKey, Game, SettingsTab, GraphicsConsole, LayoutStyle } from "../types";
import EmulatorsTab from "./EmulatorsTab";
import PcExeTab from "./PcExeTab";
import ConfirmModal from "./ConfirmModal";
import LibraryTab from "./settings/LibraryTab";
import AppearanceTab from "./settings/AppearanceTab";
import GraphicsTab from "./settings/GraphicsTab";
import SoundTab from "./settings/SoundTab";
import EmulationTab from "./settings/EmulationTab";
import IntegrationsTab from "./settings/IntegrationsTab";
import ProfilesTab from "./settings/ProfilesTab";
import SystemTab from "./settings/SystemTab";
import { useIntegrationsSettings } from "./settings/useIntegrationsSettings";
import { useSoundSettings } from "./settings/useSoundSettings";
import { useLibraryTabSettings } from "./settings/useLibraryTabSettings";
import { useSystemSettings } from "./settings/useSystemSettings";
import { FolderIcon, PaletteIcon, ImageIcon, VolumeIcon, GamepadIcon, CpuIcon, GlobeIcon, UserIcon, WrenchIcon } from "./icons";
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

  const [graphics, setGraphics] = useState<GraphicsSettings>({
    video_smooth: false,
    video_scale_integer: false,
    aspect_ratio: "auto",
    core_options: {},
  });

  const [connectedGamepads, setConnectedGamepads] = useState<string[]>([]);
  const [emulatorUpdatesCount, setEmulatorUpdatesCount] = useState(0);

  const handleRemoveFolderRequest = useCallback(
    (target: string, type: "bios-folder" | "music-folder" | "video-folder") => {
      if (type === "bios-folder") {
        setConfirmDialog({
          isOpen: true,
          type: "bios-folder",
          target,
          title: t("settings.confirm.biosTitle"),
          message: t("settings.confirm.biosDesc"),
          variant: "danger",
        });
      } else if (type === "music-folder") {
        setConfirmDialog({
          isOpen: true,
          type: "music-folder",
          target,
          title: t("settings.confirm.musicTitle"),
          message: t("settings.confirm.musicDesc"),
          variant: "danger",
        });
      } else if (type === "video-folder") {
        setConfirmDialog({
          isOpen: true,
          type: "video-folder",
          target,
          title: t("settings.confirm.videoTitle", "Quitar Carpeta de Videos"),
          message: t("settings.confirm.videoDesc", "¿Deseas quitar esta carpeta de videos?"),
          variant: "danger",
        });
      }
    },
    [t]
  );

  // Modular custom hooks per settings domain
  const integrations = useIntegrationsSettings();
  const sound = useSoundSettings({ onRemoveFolderRequest: handleRemoveFolderRequest });
  const librarySettings = useLibraryTabSettings({ onRemoveFolderRequest: handleRemoveFolderRequest });
  const systemSettings = useSystemSettings();

  useEffect(() => {
    const unlisten = onEmulatorUpdates((infos) => {
      setEmulatorUpdatesCount(infos.filter((i) => i.update_available).length);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  useEffect(() => {
    getGraphicsSettings()
      .then((g) => {
        if (g) setGraphics(g);
      })
      .catch(console.error);
  }, []);

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
      const next = librarySettings.biosFolders.filter((f) => f !== confirmDialog.target);
      librarySettings.setBiosFolders(next);
      await saveBiosFolders(next).catch(console.error);
    } else if (confirmDialog.type === "music-folder") {
      const next = sound.musicFolders.filter((f) => f !== confirmDialog.target);
      sound.setMusicFolders(next);
      await saveMusicFolders(next).catch(console.error);
      sound.handleScanMusic();
    } else if (confirmDialog.type === "video-folder") {
      const next = librarySettings.videoFolders.filter((f) => f !== confirmDialog.target);
      librarySettings.setVideoFolders(next);
      await saveVideoFolders(next).catch(console.error);
      librarySettings.handleScanLocalVideos();
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

  async function handleKioskToggle() {
    const next = !kioskMode;
    setKiosk(next);
    try {
      await setKioskMode(next);
    } catch (e) {
      console.error("Kiosk toggle failed:", e);
    }
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

  async function handleRenameProfile(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (profiles.some((p) => p.toLowerCase() === trimmed.toLowerCase() && p !== oldName)) return;
    try {
      await renameProfile(oldName, trimmed);
      const nextProfiles = profiles.map((p) => (p === oldName ? trimmed : p));
      const nextCurrent = currentProfile === oldName ? trimmed : currentProfile;
      onProfilesChange(nextProfiles, nextCurrent);
    } catch (e) {
      console.error("Rename profile failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al renombrar perfil" }));
    }
  }

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
      WII: "dolphin",
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
            <span className="settings-nav-icon"><FolderIcon /></span>
            <span className="settings-nav-text">{t("settings.tabs.library")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "appearance" ? "active" : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            <span className="settings-nav-icon"><PaletteIcon /></span>
            <span className="settings-nav-text">{t("settings.tabs.appearance")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "graphics" ? "active" : ""}`}
            onClick={() => setActiveTab("graphics")}
          >
            <span className="settings-nav-icon"><ImageIcon /></span>
            <span className="settings-nav-text">{t("settings.tabs.graphics")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "sound" ? "active" : ""}`}
            onClick={() => setActiveTab("sound")}
          >
            <span className="settings-nav-icon"><VolumeIcon /></span>
            <span className="settings-nav-text">{t("settings.tabs.sound")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "emulation" ? "active" : ""}`}
            onClick={() => setActiveTab("emulation")}
          >
            <span className="settings-nav-icon"><GamepadIcon /></span>
            <span className="settings-nav-text">{t("settings.tabs.emulation")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "emulators" ? "active" : ""}`}
            onClick={() => setActiveTab("emulators")}
          >
            <span className="settings-nav-icon"><CpuIcon /></span>
            <span className="settings-nav-text">{t("settings.tabs.emulators")}</span>
            {emulatorUpdatesCount > 0 && <span className="settings-pill-dot" />}
          </button>

          <button
            className={`settings-nav-item ${activeTab === "pcexe" ? "active" : ""}`}
            onClick={() => setActiveTab("pcexe")}
          >
            <span className="settings-nav-text">{t("settings.tabs.pcexe")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "integrations" ? "active" : ""}`}
            onClick={() => setActiveTab("integrations")}
          >
            <span className="settings-nav-icon"><GlobeIcon /></span>
            <span className="settings-nav-text">{t("settings.tabs.integrations")}</span>
            {(integrations.raLinkedUser || integrations.sgdbLinked) && <span className="settings-pill-dot" />}
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "profiles" ? "active" : ""}`}
            onClick={() => setActiveTab("profiles")}
          >
            <span className="settings-nav-icon"><UserIcon /></span>
            <span className="settings-nav-text">{t("settings.tabs.profiles")}</span>
          </button>

          <button
            type="button"
            className={`settings-nav-item ${activeTab === "system" ? "active" : ""}`}
            onClick={() => setActiveTab("system")}
          >
            <span className="settings-nav-icon"><WrenchIcon /></span>
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
            biosFolders={librarySettings.biosFolders}
            onAddBiosFolder={librarySettings.handleAddBiosFolder}
            onRequestRemoveBiosFolder={librarySettings.requestRemoveBiosFolder}
            videoFolders={librarySettings.videoFolders}
            onAddVideoFolder={librarySettings.handleAddVideoFolder}
            onRequestRemoveVideoFolder={librarySettings.requestRemoveVideoFolder}
            videoStats={librarySettings.videoStats}
            onScanLocalVideos={librarySettings.handleScanLocalVideos}
            scanningLocalVideos={librarySettings.scanningLocalVideos}
            ssLinked={integrations.ssLinked}
            isBatchScraping={librarySettings.isBatchScraping}
            batchProgress={librarySettings.batchProgress}
            onStartBatchScrape={librarySettings.handleStartBatchScrape}
            onCancelBatchScrape={librarySettings.handleCancelBatchScrape}
            sgdbLinked={integrations.sgdbLinked}
            isBatchSteamGridScraping={librarySettings.isBatchSteamGridScraping}
            batchSteamGridProgress={librarySettings.batchSteamGridProgress}
            onStartBatchSteamGrid={librarySettings.handleStartBatchSteamGrid}
            onCancelBatchSteamGrid={librarySettings.handleCancelBatchSteamGrid}
            onNavigateToIntegrations={() => setActiveTab("integrations")}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            regionPref={librarySettings.regionPref}
            onRegionPrefChange={librarySettings.handleRegionChange}
            onExport={librarySettings.handleExport}
            onImport={librarySettings.handleImport}
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
            audioDevices={sound.audioDevices}
            refreshingAudio={sound.refreshingAudio}
            refreshAudioDevices={sound.refreshAudioDevices}
            updateGlobalGraphic={updateGlobalGraphic}
            musicVolume={sound.musicVolume}
            handleMusicVolumeChange={sound.handleMusicVolumeChange}
            sfxVolume={sound.sfxVolume}
            handleSfxVolumeChange={sound.handleSfxVolumeChange}
            musicFolders={sound.musicFolders}
            handleAddMusicFolder={sound.handleAddMusicFolder}
            requestRemoveMusicFolder={sound.requestRemoveMusicFolder}
            musicTrackCount={sound.musicTrackCount}
            scanningMusic={sound.scanningMusic}
            musicFeedback={sound.musicFeedback}
            handleScanMusic={sound.handleScanMusic}
            handleOpenMusicFolder={sound.handleOpenMusicFolder}
            savedToast={savedToast}
            previewVideoMuted={sound.previewVideoMuted}
            handlePreviewVideoMutedChange={sound.handlePreviewVideoMutedChange}
            previewVideoVolume={sound.previewVideoVolume}
            handlePreviewVideoVolumeChange={sound.handlePreviewVideoVolumeChange}
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

        {activeTab === "pcexe" && <PcExeTab />}

        {activeTab === "integrations" && <IntegrationsTab {...integrations} />}

        {activeTab === "profiles" && (
          <ProfilesTab
            currentProfile={currentProfile}
            profiles={profiles}
            handleSwitchProfile={handleSwitchProfile}
            requestDeleteProfile={requestDeleteProfile}
            handleRenameProfile={handleRenameProfile}
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
            errorLogs={systemSettings.errorLogs}
            copiedLog={systemSettings.copiedLog}
            handleToggleLogs={systemSettings.handleToggleLogs}
            handleCopyLogs={systemSettings.handleCopyLogs}
            onOpenOnboarding={onOpenOnboarding}
          />
        )}
      </main>

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant={confirmDialog.variant}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />

      {savedToast && <div className="settings-saved-toast">{t("settings.savedToast")}</div>}
    </div>
  );
}
