import { useState, type ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import type { SortKey } from "../../types";
import type {
  LocalVideoStats,
  BatchScrapeProgressEvent,
  SteamGridBatchProgressEvent,
} from "../../lib/tauri";

export interface LibraryTabProps {
  folders: string[];
  scanning: boolean;
  scanProgress: number;
  scanMessage?: string;
  scanCores?: { installed: string[]; needed: string[] } | null;
  onScan: (folders: string[]) => void;
  onAddFolder: () => void;
  onRequestRemoveFolder: (folder: string) => void;
  biosFolders: string[];
  onAddBiosFolder: () => void;
  onRequestRemoveBiosFolder: (folder: string) => void;
  videoFolders?: string[];
  onAddVideoFolder?: () => void;
  onRequestRemoveVideoFolder?: (folder: string) => void;
  videoStats?: LocalVideoStats | null;
  onScanLocalVideos?: () => void;
  scanningLocalVideos?: boolean;
  ssLinked?: boolean;
  isBatchScraping?: boolean;
  batchProgress?: BatchScrapeProgressEvent | null;
  onStartBatchScrape?: (onlyMissing: boolean) => void;
  onCancelBatchScrape?: () => void;
  sgdbLinked?: boolean;
  isBatchSteamGridScraping?: boolean;
  batchSteamGridProgress?: SteamGridBatchProgressEvent | null;
  onStartBatchSteamGrid?: (
    scrapeHeroes: boolean,
    scrapeLogos: boolean,
    onlyMissing: boolean
  ) => void;
  onCancelBatchSteamGrid?: () => void;
  onNavigateToIntegrations?: () => void;
  sortBy: SortKey;
  onSortByChange: (sort: SortKey) => void;
  regionPref: string;
  onRegionPrefChange: (pref: string) => void;
  onExport: () => void;
  onImport: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function LibraryTab({
  folders,
  scanning,
  scanProgress,
  scanMessage,
  scanCores,
  onScan,
  onAddFolder,
  onRequestRemoveFolder,
  biosFolders,
  onAddBiosFolder,
  onRequestRemoveBiosFolder,
  videoFolders = [],
  onAddVideoFolder,
  onRequestRemoveVideoFolder,
  videoStats,
  onScanLocalVideos,
  scanningLocalVideos = false,
  ssLinked = false,
  isBatchScraping = false,
  batchProgress,
  onStartBatchScrape,
  onCancelBatchScrape,
  sgdbLinked = false,
  isBatchSteamGridScraping = false,
  batchSteamGridProgress,
  onStartBatchSteamGrid,
  onCancelBatchSteamGrid,
  onNavigateToIntegrations,
  sortBy,
  onSortByChange,
  regionPref,
  onRegionPrefChange,
  onExport,
  onImport,
}: LibraryTabProps) {
  const { t } = useTranslation();
  const [batchOnlyMissing, setBatchOnlyMissing] = useState(true);
  const [sgdbOnlyMissing, setSgdbOnlyMissing] = useState(true);
  const [sgdbHeroes, setSgdbHeroes] = useState(true);
  const [sgdbLogos, setSgdbLogos] = useState(true);
  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>{t("settings.librarySection.header")}</h2>
        <p>{t("settings.librarySection.headerDesc")}</p>
      </div>

      {/* Escaneo Principal */}
      <section className="settings-card highlight" id="settings-scan">
        <div className="settings-card-header">
          <div>
            <h3>{t("settings.librarySection.scanTitle")}</h3>
            <p>{t("settings.librarySection.scanDesc")}</p>
          </div>
          <button
            type="button"
            className="settings-btn-primary"
            onClick={() => onScan(folders)}
            disabled={scanning || folders.length === 0}
          >
            {scanning ? t("common.scanning") : t("settings.librarySection.scanNow")}
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
              <span className="settings-badge-ok">{t("settings.librarySection.coresReady", { cores: scanCores.installed.join(", ") })}</span>
            )}
            {scanCores.needed.length > 0 && (
              <span className="settings-badge-warn">{t("settings.librarySection.coresPending", { cores: scanCores.needed.join(", ") })}</span>
            )}
          </div>
        )}
      </section>

      {/* Carpetas de ROMs */}
      <section className="settings-card" id="settings-rom-folders">
        <div className="settings-card-header">
          <div>
            <h3>{t("settings.librarySection.romTitle")}</h3>
            <p>{t("settings.librarySection.romDesc")}</p>
          </div>
          <button type="button" onClick={onAddFolder} className="settings-btn-add">
            {t("settings.librarySection.addFolderBtn")}
          </button>
        </div>

        <ul className="settings-folders">
          {folders.map((f) => (
            <li key={f} className="settings-folder-item">
              <span className="settings-folder-path" title={f}>{f}</span>
              <button
                type="button"
                onClick={() => onRequestRemoveFolder(f)}
                className="settings-btn-delete"
                title={t("common.remove")}
              >
                ×
              </button>
            </li>
          ))}
          {folders.length === 0 && (
            <li className="settings-empty">{t("settings.librarySection.noFoldersYet")}</li>
          )}
        </ul>
      </section>

      {/* Carpetas de BIOS */}
      <section className="settings-card" id="settings-bios-folders">
        <div className="settings-card-header">
          <div>
            <h3>{t("settings.librarySection.biosTitle")}</h3>
            <p>{t("settings.librarySection.biosDesc")}</p>
          </div>
          <button type="button" onClick={onAddBiosFolder} className="settings-btn-add">
            {t("settings.librarySection.addBiosBtn")}
          </button>
        </div>

        <ul className="settings-folders">
          {biosFolders.map((bf) => (
            <li key={bf} className="settings-folder-item">
              <span className="settings-folder-path" title={bf}>{bf}</span>
              <button
                type="button"
                onClick={() => onRequestRemoveBiosFolder(bf)}
                className="settings-btn-delete"
                title={t("common.removeFolder")}
              >
                ×
              </button>
            </li>
          ))}
          {biosFolders.length === 0 && (
            <li className="settings-empty">
              {t("settings.librarySection.noBiosCustom")} <code>binaries/RetroArch/system</code>
            </li>
          )}
        </ul>
      </section>

      {/* Carpetas de Videos / Snaps Locales */}
      <section className="settings-card" id="settings-video-folders">
        <div className="settings-card-header">
          <div>
            <h3>{t("librarySection.videoFolders", "Carpetas de Videos / Snaps")}</h3>
            <p>{t("librarySection.videoFoldersSubtitle", "Directorios externos donde guardas videos de gameplay (.mp4) de tus juegos.")}</p>
          </div>
          <button type="button" onClick={onAddVideoFolder} className="settings-btn-add">
            + {t("librarySection.addVideoFolder", "Agregar Carpeta de Videos")}
          </button>
        </div>

        <ul className="settings-folders">
          {(videoFolders || []).map((vf) => (
            <li key={vf} className="settings-folder-item">
              <span className="settings-folder-path" title={vf}>{vf}</span>
              <button
                type="button"
                onClick={() => onRequestRemoveVideoFolder?.(vf)}
                className="settings-btn-delete"
                title={t("common.removeFolder")}
              >
                ×
              </button>
            </li>
          ))}
          {(!videoFolders || videoFolders.length === 0) && (
            <li className="settings-empty">
              {t("librarySection.noVideoFolders", "No has configurado carpetas de videos externas aún. (Buscando en carpetas de ROMs por defecto)")}
            </li>
          )}
        </ul>

        {/* Barra de verificación / estadísticas de videos locales */}
        <div style={{ marginTop: "14px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="settings-btn-secondary"
              onClick={onScanLocalVideos}
              disabled={scanningLocalVideos}
            >
              {scanningLocalVideos
                ? t("librarySection.scanningLocalVideos", "Verificando videos...")
                : `🔄 ${t("librarySection.scanLocalVideos", "Escanear Videos Locales")}`}
            </button>
            {videoStats && (
              <span className="settings-badge-ok" style={{ fontSize: "0.85rem", padding: "4px 10px" }}>
                {t("librarySection.videoStats", {
                  withVideo: videoStats.games_with_video,
                  total: videoStats.total_games,
                  percent: Math.round((videoStats.games_with_video / (videoStats.total_games || 1)) * 100),
                  defaultValue: `🎮 ${videoStats.games_with_video} de ${videoStats.total_games} juegos con video (${Math.round((videoStats.games_with_video / (videoStats.total_games || 1)) * 100)}%)`,
                })}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Descarga Masiva de Gameplays (ScreenScraper) */}
      <section className="settings-card" id="settings-batch-screenscraper">
        <div className="settings-card-header">
          <div>
            <h3>🎬 {t("librarySection.batchScrapeTitle", "Descarga Masiva de Gameplays (ScreenScraper)")}</h3>
            <p>{t("librarySection.batchScrapeSubtitle", "Descarga automáticamente los videos y logos de toda tu biblioteca en segundo plano.")}</p>
          </div>
          {ssLinked ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isBatchScraping ? (
                <button
                  type="button"
                  className="settings-btn-delete"
                  style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "0.85rem" }}
                  onClick={onCancelBatchScrape}
                >
                  {t("librarySection.batchScrapeCancel", "✕ Cancelar")}
                </button>
              ) : (
                <button
                  type="button"
                  className="settings-btn-primary"
                  onClick={() => onStartBatchScrape?.(batchOnlyMissing)}
                >
                  {t("librarySection.batchScrapeStart", "▶ Iniciar Descarga Masiva")}
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="settings-btn-secondary"
              onClick={onNavigateToIntegrations}
            >
              {t("settings.librarySection.configureSs")}
            </button>
          )}
        </div>

        {ssLinked && (
          <div style={{ marginTop: "10px" }}>
            {!isBatchScraping && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", cursor: "pointer", color: "var(--text-muted, #94a3b8)" }}>
                <input
                  type="checkbox"
                  checked={batchOnlyMissing}
                  onChange={(e) => setBatchOnlyMissing(e.target.checked)}
                />
                <span>{t("librarySection.batchScrapeOnlyMissing", "Solo juegos sin video")}</span>
              </label>
            )}

            {isBatchScraping && batchProgress && (
              <div className="settings-scan-progress-box" style={{ marginTop: "10px" }}>
                <div className="settings-progress">
                  <div className="settings-progress-bar" style={{ width: `${batchProgress.percent}%` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.84rem" }}>
                  <span style={{ fontWeight: 600, color: "var(--accent, #00f0ff)" }}>
                    {batchProgress.status === "downloading" ? t("settings.librarySection.statusDownloading") : t("settings.librarySection.statusProcessing")} {batchProgress.game_name} ({batchProgress.current_index}/{batchProgress.total})
                  </span>
                  <span>{batchProgress.percent}%</span>
                </div>
                <p className="settings-progress-msg" style={{ marginTop: "4px" }}>
                  {t("settings.librarySection.progressLine", { done: batchProgress.downloaded_count, skipped: batchProgress.skipped_count, failed: batchProgress.failed_count })}
                </p>
              </div>
            )}

            {!isBatchScraping && batchProgress && (batchProgress.status === "completed" || batchProgress.status === "cancelled") && (
              <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.85rem" }}>
                <span>
                  {batchProgress.status === "completed"
                    ? t("librarySection.batchScrapeCompleted", {
                        downloaded: batchProgress.downloaded_count,
                        skipped: batchProgress.skipped_count,
                        failed: batchProgress.failed_count,
                        defaultValue: `¡Descarga masiva completada! ${batchProgress.downloaded_count} descargados, ${batchProgress.skipped_count} omitidos, ${batchProgress.failed_count} fallidos.`,
                      })
                    : t("librarySection.batchScrapeCancelled", "Descarga cancelada")}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Descarga Masiva de Heroes y Logos (SteamGridDB) */}
      <section className="settings-card" id="settings-batch-steamgrid">
        <div className="settings-card-header">
          <div>
            <h3>🎨 {t("librarySection.batchSteamGridTitle", "Descarga Masiva de Heroes y Logos (SteamGridDB)")}</h3>
            <p>{t("librarySection.batchSteamGridSubtitle", "Descarga automáticamente los banners panorámicos HD y logos transparentes de toda tu biblioteca en segundo plano.")}</p>
          </div>
          {sgdbLinked ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isBatchSteamGridScraping ? (
                <button
                  type="button"
                  className="settings-btn-delete"
                  style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "0.85rem" }}
                  onClick={onCancelBatchSteamGrid}
                >
                  {t("settings.librarySection.cancelBtn")}
                </button>
              ) : (
                <button
                  type="button"
                  className="settings-btn-primary"
                  onClick={() => onStartBatchSteamGrid?.(sgdbHeroes, sgdbLogos, sgdbOnlyMissing)}
                  disabled={!sgdbHeroes && !sgdbLogos}
                >
                  {t("settings.librarySection.startBtn")}
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="settings-btn-secondary"
              onClick={onNavigateToIntegrations}
            >
              {t("settings.librarySection.configureSgdb")}
            </button>
          )}
        </div>

        {sgdbLinked && (
          <div style={{ marginTop: "10px" }}>
            {!isBatchSteamGridScraping && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "0.88rem", color: "var(--text-muted, #94a3b8)" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={sgdbHeroes}
                    onChange={(e) => setSgdbHeroes(e.target.checked)}
                  />
                  <span>{t("settings.librarySection.heroesOpt")}</span>
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={sgdbLogos}
                    onChange={(e) => setSgdbLogos(e.target.checked)}
                  />
                  <span>{t("settings.librarySection.logosOpt")}</span>
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={sgdbOnlyMissing}
                    onChange={(e) => setSgdbOnlyMissing(e.target.checked)}
                  />
                  <span>{t("settings.librarySection.missingOnlyArt")}</span>
                </label>
              </div>
            )}

            {isBatchSteamGridScraping && batchSteamGridProgress && (
              <div className="settings-scan-progress-box" style={{ marginTop: "10px" }}>
                <div className="settings-progress">
                  <div className="settings-progress-bar" style={{ width: `${batchSteamGridProgress.percent}%` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.84rem" }}>
                  <span style={{ fontWeight: 600, color: "var(--accent, #00f0ff)" }}>
                    {batchSteamGridProgress.status === "downloading" ? t("settings.librarySection.statusDownloading") : t("settings.librarySection.statusProcessing")} {batchSteamGridProgress.game_name} ({batchSteamGridProgress.current_index}/{batchSteamGridProgress.total})
                  </span>
                  <span>{batchSteamGridProgress.percent}%</span>
                </div>
                <p className="settings-progress-msg" style={{ marginTop: "4px" }}>
                  {t("settings.librarySection.sgdbProgressLine", { heroes: batchSteamGridProgress.downloaded_heroes, logos: batchSteamGridProgress.downloaded_logos, skipped: batchSteamGridProgress.skipped_count, failed: batchSteamGridProgress.failed_count })}
                </p>
              </div>
            )}

            {!isBatchSteamGridScraping && batchSteamGridProgress && (batchSteamGridProgress.status === "complete" || batchSteamGridProgress.status === "cancelled") && (
              <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.85rem" }}>
                <span>
                  {batchSteamGridProgress.status === "complete"
                    ? t("settings.librarySection.sgdbCompleted", { heroes: batchSteamGridProgress.downloaded_heroes, logos: batchSteamGridProgress.downloaded_logos, skipped: batchSteamGridProgress.skipped_count })
                    : t("settings.librarySection.sgdbCancelled")}
                </span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Preferencias de Biblioteca */}
      <section className="settings-card" id="settings-library-prefs">
        <h3>{t("settings.librarySection.prefsTitle")}</h3>

        <div className="settings-row-option">
          <div>
            <span className="settings-option-title">{t("settings.librarySection.sortDefault")}</span>
            <p className="settings-option-desc">{t("settings.librarySection.sortDefaultDesc")}</p>
          </div>
          <div className="settings-sort-group">
            {([["name", t("settings.librarySection.sortName")], ["platform", t("settings.librarySection.sortPlatform")], ["last_played", t("settings.librarySection.sortLast")]] as [SortKey, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`settings-sort-btn ${sortBy === key ? "active" : ""}`}
                onClick={() => onSortByChange(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-divider" />

        <div className="settings-row-option">
          <div>
            <span className="settings-option-title">{t("settings.librarySection.regionTitle")}</span>
            <p className="settings-option-desc">{t("settings.librarySection.regionDesc")}</p>
          </div>
          <div className="settings-sort-group">
            <button
              type="button"
              className={`settings-sort-btn ${regionPref === "usa" ? "active" : ""}`}
              onClick={() => onRegionPrefChange("usa")}
            >
              🇺🇸 USA
            </button>
            <button
              type="button"
              className={`settings-sort-btn ${regionPref === "eur" ? "active" : ""}`}
              onClick={() => onRegionPrefChange("eur")}
            >
              {t("settings.librarySection.regionEu")}
            </button>
            <button
              type="button"
              className={`settings-sort-btn ${regionPref === "jp" ? "active" : ""}`}
              onClick={() => onRegionPrefChange("jp")}
            >
              {t("settings.librarySection.regionJp")}
            </button>
          </div>
        </div>
      </section>

      {/* Copias de Seguridad */}
      <section className="settings-card" id="settings-backup">
        <h3>{t("settings.librarySection.backupTitle")}</h3>
        <p className="settings-hint">{t("settings.librarySection.backupDesc")}</p>
        <div className="settings-row" style={{ marginTop: '12px' }}>
          <button type="button" className="settings-btn-secondary" onClick={onExport}>
            {t("settings.librarySection.exportBtn")}
          </button>
          <label className="settings-btn-secondary" style={{ cursor: 'pointer' }}>
            {t("settings.librarySection.importBtn")}
            <input type="file" accept=".json" onChange={onImport} hidden />
          </label>
        </div>
      </section>
    </div>
  );
}
