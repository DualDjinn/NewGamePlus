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
          <h2>Sonido &amp; Salida de Audio</h2>
          <p>Selecciona el dispositivo de audio del sistema (auriculares, parlantes) y driver de sonido.</p>
        </div>
        {savedToast && <span className="settings-badge-ok">✓ Guardado</span>}
      </div>

      {/* Dispositivo de Salida */}
      <section className="settings-card highlight" id="settings-audio-device">
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
            style={{ minWidth: "320px" }}
          >
            <option value="">🌟 Predeterminado del Sistema (Auto-conmutar)</option>
            {audioDevices.map((dev) => {
              const devLower = dev.toLowerCase();
              const icon =
                devLower.includes("head") ||
                devLower.includes("auricul") ||
                devLower.includes("g733") ||
                devLower.includes("yeti") ||
                devLower.includes("corsair")
                  ? "🎧"
                  : devLower.includes("parlante") ||
                    devLower.includes("altavoz") ||
                    devLower.includes("speaker")
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
          💡 <strong>Modo Predeterminado:</strong> Con la opción <em>"Predeterminado del Sistema"</em> y el driver{" "}
          <em>WASAPI</em>, el juego conmuta automáticamente de los parlantes a los auriculares en el momento en que
          los conectes o los selecciones en la barra de tareas de Windows.
        </p>
      </section>

      {/* Volumen Master */}
      <section className="settings-card" id="settings-emulation-volume">
        <h3>Volumen de Emulación</h3>
        <div className="settings-row-option" style={{ marginTop: "12px" }}>
          <div>
            <span className="settings-option-title">Nivel de Volumen: {graphics.audio_volume ?? 100}%</span>
            <p className="settings-option-desc">
              Ganancia de salida del juego (100% = Ganancia Original 0 dB).
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
              style={{ width: "180px", accentColor: "var(--primary, #f59e0b)", cursor: "pointer" }}
            />
            <span style={{ minWidth: "45px", fontWeight: 600, fontSize: "0.95rem" }}>
              {graphics.audio_volume ?? 100}%
            </span>
          </div>
        </div>
      </section>

      {/* Controlador de Audio (Driver) */}
      <section className="settings-card" id="settings-audio-driver">
        <h3>Controlador de Audio (Driver de Emulación)</h3>

        <div className="settings-row-option" style={{ marginTop: "12px" }}>
          <div>
            <span className="settings-option-title">API de Sonido en Windows</span>
            <p className="settings-option-desc">
              XAudio2 proporciona la máxima compatibilidad y estabilidad con auriculares USB, Bluetooth, interfaces y
              parlantes.
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
      <section className="settings-card highlight" id="settings-sound-volume">
        <h3>Volumen de la Interfaz &amp; Música</h3>
        <p style={{ marginTop: "4px", fontSize: "0.9rem", color: "var(--text-muted, #9ca3af)" }}>
          Configura los niveles de sonido para la música de fondo y los efectos interactivos de la aplicación.
        </p>

        {/* Selector de Volumen de Música de Fondo */}
        <div className="settings-row-option" style={{ marginTop: "16px" }}>
          <div>
            <span className="settings-option-title">
              Música de Fondo: {Math.round(musicVolume * 100)}%
            </span>
            <p className="settings-option-desc">
              Volumen de los temas musicales y reproductor de vinilo (con fade in y fade out suave).
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
              style={{ width: "180px", accentColor: "var(--primary, #f59e0b)", cursor: "pointer" }}
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
              Efectos de Sonido (Lanzamiento de Juego): {Math.round(sfxVolume * 100)}%
            </span>
            <p className="settings-option-desc">
              Volumen del sonido que se reproduce al pulsar Play para arrancar una partida.
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
              style={{ width: "180px", accentColor: "var(--primary, #f59e0b)", cursor: "pointer" }}
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
                style={{ width: "180px", accentColor: "var(--primary, #f59e0b)", cursor: "pointer" }}
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
            <h3>Música de Fondo (Reproductor Vinilo)</h3>
            <p>
              Escanea tus temas musicales o abre la carpeta para agregar nuevas canciones en formatos OGG, MP3,
              OPUS, FLAC o WAV.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
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
            <span className="settings-badge-ok">{musicFeedback}</span>
          )}
        </div>
      </section>

      {/* Carpetas de Música Personalizadas */}
      <section className="settings-card" id="settings-music-folders">
        <div className="settings-card-header">
          <div>
            <h3>Carpetas de Música</h3>
            <p>
              Directorios adicionales con tus archivos de música (MP3, OGG, FLAC, WAV, OPUS). La colección integrada
              en <code>public/music</code> se incluye siempre como base.
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
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #9ca3af)", paddingRight: "8px" }}>
              Base
            </span>
          </li>
          {musicFolders.map((mf) => (
            <li key={mf} className="settings-folder-item">
              <span className="settings-folder-path" title={mf}>{mf}</span>
              <button
                type="button"
                onClick={() => requestRemoveMusicFolder(mf)}
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
  );
}
