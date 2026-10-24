import { useTranslation } from "react-i18next";
import type { GraphicsSettings } from "../../lib/tauri";

export interface SoundTabProps {
  graphics: GraphicsSettings;
  audioDevices: string[];
  refreshingAudio: boolean;
  refreshAudioDevices: () => void;
  updateGlobalGraphic: <K extends keyof GraphicsSettings>(key: K, value: GraphicsSettings[K]) => void;
  musicVolume: number;
  handleMusicVolumeChange: (val: number) => void;
  sfxVolume: number;
  handleSfxVolumeChange: (val: number) => void;
  musicFolders: string[];
  handleAddMusicFolder: () => void;
  requestRemoveMusicFolder: (f: string) => void;
  musicTrackCount: number | null;
  scanningMusic: boolean;
  musicFeedback: string | null;
  handleScanMusic: () => void;
  handleOpenMusicFolder: () => void;
  savedToast: boolean;
  previewVideoMuted: boolean;
  handlePreviewVideoMutedChange: (muted: boolean) => void;
  previewVideoVolume: number;
  handlePreviewVideoVolumeChange: (val: number) => void;
}

export default function SoundTab({
  graphics,
  audioDevices,
  refreshingAudio,
  refreshAudioDevices,
  updateGlobalGraphic,
  musicVolume,
  handleMusicVolumeChange,
  sfxVolume,
  handleSfxVolumeChange,
  musicFolders,
  handleAddMusicFolder,
  requestRemoveMusicFolder,
  musicTrackCount,
  scanningMusic,
  musicFeedback,
  handleScanMusic,
  handleOpenMusicFolder,
  savedToast,
  previewVideoMuted,
  handlePreviewVideoMutedChange,
  previewVideoVolume,
  handlePreviewVideoVolumeChange,
}: SoundTabProps) {
  const { t } = useTranslation();
  return (
    <div className="settings-tab-panel">
      <div
        className="settings-panel-header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h2>{t("settings.sound.panelTitle")}</h2>
          <p>{t("settings.sound.panelDesc")}</p>
        </div>
        {savedToast && <span className="settings-badge-ok">{t("settings.sound.saved")}</span>}
      </div>

      {/* Dispositivo de Salida */}
      <section className="settings-card highlight settings-card--wide" id="settings-audio-device">
        <div className="settings-card-header">
          <div>
            <h3>{t("settings.sound.outTitle")}</h3>
            <p>{t("settings.sound.outDesc")}</p>
          </div>
          <button
            type="button"
            className="settings-btn-secondary"
            onClick={refreshAudioDevices}
            disabled={refreshingAudio}
          >
            {refreshingAudio ? t("settings.sound.searchingDevices") : t("settings.sound.refreshDevices")}
          </button>
        </div>

        <div className="settings-row-option">
          <div>
            <span className="settings-option-title">{t("settings.sound.activeDevice")}</span>
            <p className="settings-option-desc">
              {t("settings.sound.activeDeviceDesc")}
            </p>
          </div>
          <select
            className="settings-select"
            value={graphics.audio_device || ""}
            onChange={(e) => updateGlobalGraphic("audio_device", e.target.value)}
            style={{ minWidth: "320px" }}
          >
            <option value="">{t("settings.sound.systemDefault")}</option>
            {audioDevices.map((dev) => {
              return (
                <option key={dev} value={dev}>
                  {dev}
                </option>
              );
            })}
          </select>
        </div>

        <div className="settings-divider" />

        <p className="settings-hint">
          <strong>{t("settings.sound.defaultModeTitle")}</strong> {t("settings.sound.defaultModeHint", { opt: t("settings.sound.systemDefaultShort"), driver: "WASAPI" })}
        </p>
      </section>

      {/* Volumen Master */}
      <section className="settings-card" id="settings-emulation-volume">
        <h3>{t("settings.sound.emuVolume")}</h3>
        <div className="settings-row-option" style={{ marginTop: "12px" }}>
          <div>
            <span className="settings-option-title">{t("settings.sound.emuVolumeLevel", { v: graphics.audio_volume ?? 100 })}</span>
            <p className="settings-option-desc">
              {t("settings.sound.emuVolumeDesc")}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              type="range"
              min="0"
              max="150"
              step="5"
              value={graphics.audio_volume ?? 100}
              onChange={(e) => updateGlobalGraphic("audio_volume", parseInt(e.target.value, 10))}
              style={{ width: "180px", accentColor: "var(--accent, #f59e0b)", cursor: "pointer" }}
            />
            <span style={{ minWidth: "45px", fontWeight: 600, fontSize: "0.95rem" }}>
              {graphics.audio_volume ?? 100}%
            </span>
          </div>
        </div>
      </section>

      {/* Controlador de Audio (Driver) */}
      <section className="settings-card" id="settings-audio-driver">
        <h3>{t("settings.sound.driverTitle")}</h3>

        <div className="settings-row-option" style={{ marginTop: "12px" }}>
          <div>
            <span className="settings-option-title">{t("settings.sound.driverApi")}</span>
            <p className="settings-option-desc">
              {t("settings.sound.driverApiDesc")}
            </p>
          </div>
          <select
            className="settings-select"
            value={graphics.audio_driver || "xaudio"}
            onChange={(e) => updateGlobalGraphic("audio_driver", e.target.value)}
          >
            <option value="xaudio">{t("settings.sound.driverXaudio")}</option>
            <option value="wasapi">{t("settings.sound.driverWasapi")}</option>
            <option value="dsound">{t("settings.sound.driverDsound")}</option>
          </select>
        </div>

        <div className="settings-divider" />

        <div className="settings-row-option">
          <div>
            <span className="settings-option-title">{t("settings.sound.latency")}</span>
            <p className="settings-option-desc">{t("settings.sound.latencyDesc")}</p>
          </div>
          <select
            className="settings-select"
            value={graphics.audio_latency || 64}
            onChange={(e) => updateGlobalGraphic("audio_latency", parseInt(e.target.value, 10))}
          >
            <option value={32}>{t("settings.sound.latency32")}</option>
            <option value={64}>{t("settings.sound.latency64")}</option>
            <option value={128}>{t("settings.sound.latency128")}</option>
          </select>
        </div>
      </section>

      {/* Volumen de Interfaz, Música y Efectos */}
      <section className="settings-card highlight settings-card--wide" id="settings-sound-volume">
        <h3>{t("settings.sound.ifaceVolume")}</h3>
        <p style={{ marginTop: "4px", fontSize: "0.9rem", color: "var(--text-muted, #9ca3af)" }}>
          {t("settings.sound.ifaceVolumeDesc")}
        </p>

        {/* Selector de Volumen de Música de Fondo */}
        <div className="settings-row-option" style={{ marginTop: "16px" }}>
          <div>
            <span className="settings-option-title">
              {t("settings.sound.bgMusic", { v: Math.round(musicVolume * 100) })}
            </span>
            <p className="settings-option-desc">
              {t("settings.sound.bgMusicDesc")}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={musicVolume}
              onChange={(e) => handleMusicVolumeChange(parseFloat(e.target.value))}
              style={{ width: "180px", accentColor: "var(--accent, #f59e0b)", cursor: "pointer" }}
            />
            <span style={{ minWidth: "45px", fontWeight: 600, fontSize: "0.95rem" }}>
              {Math.round(musicVolume * 100)}%
            </span>
          </div>
        </div>

        <div className="settings-divider" />

        {/* Selector de Volumen de Efectos Sonoros */}
        <div className="settings-row-option">
          <div>
            <span className="settings-option-title">
              {t("settings.sound.sfxTitle", { v: Math.round(sfxVolume * 100) })}
            </span>
            <p className="settings-option-desc">
              {t("settings.sound.sfxDesc")}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVolume}
              onChange={(e) => handleSfxVolumeChange(parseFloat(e.target.value))}
              style={{ width: "180px", accentColor: "var(--accent, #f59e0b)", cursor: "pointer" }}
            />
            <span style={{ minWidth: "45px", fontWeight: 600, fontSize: "0.95rem" }}>
              {Math.round(sfxVolume * 100)}%
            </span>
          </div>
        </div>

        <div className="settings-divider" />

        {/* Selector de Volumen y Silencio para Videos de Preview */}
        <div className="settings-row-option">
          <div>
            <span className="settings-option-title">
              {t("settings.sound.mutePreviewVideo", "Silenciar Videos de Preview / Gameplay")}
            </span>
            <p className="settings-option-desc">
              {t("settings.sound.mutePreviewVideoDesc", "Si está activado, los videos de snap y previews en la ruleta Arcade se reproducirán sin sonido.")}
            </p>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={previewVideoMuted}
              onChange={(e) => handlePreviewVideoMutedChange(e.target.checked)}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>

        {!previewVideoMuted && (
          <div className="settings-row-option" style={{ marginTop: "12px" }}>
            <div>
              <span className="settings-option-title">
                {t("settings.sound.previewVideoVolume", "Volumen de Videos Preview")}: {Math.round(previewVideoVolume * 100)}%
              </span>
              <p className="settings-option-desc">
                {t("settings.sound.previewVideoVolumeDesc", "Nivel de audio para los videos de gameplay en el monitor de la vista Arcade.")}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={previewVideoVolume}
                onChange={(e) => handlePreviewVideoVolumeChange(parseFloat(e.target.value))}
                style={{ width: "180px", accentColor: "var(--accent, #f59e0b)", cursor: "pointer" }}
              />
              <span style={{ minWidth: "45px", fontWeight: 600, fontSize: "0.95rem" }}>
                {Math.round(previewVideoVolume * 100)}%
              </span>
            </div>
          </div>
        )}
      </section>

      {/* Música de Fondo & Reproductor Vinilo */}
      <section className="settings-card" id="settings-music-player">
        <div className="settings-card-header">
          <div>
            <h3>{t("settings.sound.musicPlayerTitle")}</h3>
            <p>
              {t("settings.sound.musicPlayerDesc")}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="settings-btn-secondary"
              onClick={handleOpenMusicFolder}
            >
              {t("settings.sound.openFolder")}
            </button>
            <button
              type="button"
              className="settings-btn-primary"
              onClick={handleScanMusic}
              disabled={scanningMusic}
            >
              {scanningMusic ? t("settings.sound.scanningMusic") : t("settings.sound.scanMusic")}
            </button>
          </div>
        </div>

        <div className="settings-row-option">
          <div>
            <span className="settings-option-title">{t("settings.sound.collection")}</span>
            <p className="settings-option-desc">
              {musicTrackCount !== null
                ? t("settings.sound.tracksCount", { count: musicTrackCount })
                : t("settings.sound.loadingTracks")}
            </p>
          </div>
          {musicFeedback && (
            <span className="settings-badge-ok">{musicFeedback}</span>
          )}
        </div>
      </section>

      {/* Carpetas de Música Personalizadas */}
      <section className="settings-card" id="settings-music-folders">
        <div className="settings-card-header">
          <div>
            <h3>{t("settings.sound.musicFoldersTitle")}</h3>
            <p>
              {t("settings.sound.musicFoldersDesc1")} <code>public/music</code> {t("settings.sound.musicFoldersDesc2")}
            </p>
          </div>
          <button type="button" onClick={handleAddMusicFolder} className="settings-btn-add">
            {t("settings.sound.addMusicFolder")}
          </button>
        </div>

        <ul className="settings-folders">
          <li className="settings-folder-item" style={{ opacity: 0.9 }}>
            <span className="settings-folder-path" title={t("settings.sound.integratedTitle")}>
              {t("settings.sound.integratedName")}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #9ca3af)", paddingRight: "8px" }}>
              {t("settings.sound.integratedBase")}
            </span>
          </li>
          {musicFolders.map((mf) => (
            <li key={mf} className="settings-folder-item">
              <span className="settings-folder-path" title={mf}>{mf}</span>
              <button
                type="button"
                onClick={() => requestRemoveMusicFolder(mf)}
                className="settings-btn-delete"
                title={t("common.removeFolder")}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
