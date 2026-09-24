import type { ChangeEvent } from "react";
import type { SortKey } from "../../types";

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
  sortBy,
  onSortByChange,
  regionPref,
  onRegionPrefChange,
  onExport,
  onImport,
}: LibraryTabProps) {
  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>Biblioteca &amp; Escaneo</h2>
        <p>Gestiona tus directorios de ROMs, archivos BIOS y copias de seguridad.</p>
      </div>

      {/* Escaneo Principal */}
      <section className="settings-card highlight" id="settings-scan">
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
      <section className="settings-card" id="settings-rom-folders">
        <div className="settings-card-header">
          <div>
            <h3>Carpetas de ROMs</h3>
            <p>Directorios donde se encuentran los archivos de tus juegos.</p>
          </div>
          <button type="button" onClick={onAddFolder} className="settings-btn-add">
            + Agregar Carpeta
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
                title="Quitar"
              >
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
      <section className="settings-card" id="settings-bios-folders">
        <div className="settings-card-header">
          <div>
            <h3>Carpetas de BIOS / System</h3>
            <p>Directorios con archivos BIOS (PlayStation, PS2, Sega CD, Neo Geo, Saturn, etc.).</p>
          </div>
          <button type="button" onClick={onAddBiosFolder} className="settings-btn-add">
            + Agregar Carpeta de BIOS
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
      <section className="settings-card" id="settings-library-prefs">
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
            <span className="settings-option-title">Prioridad de Región de Carátulas</span>
            <p className="settings-option-desc">Región preferida al buscar portadas retro.</p>
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
              🇪🇺 Europa
            </button>
            <button
              type="button"
              className={`settings-sort-btn ${regionPref === "jp" ? "active" : ""}`}
              onClick={() => onRegionPrefChange("jp")}
            >
              🇯🇵 Japón
            </button>
          </div>
        </div>
      </section>

      {/* Copias de Seguridad */}
      <section className="settings-card" id="settings-backup">
        <h3>Respaldo y Copias de Seguridad</h3>
        <p className="settings-hint">Exporta o importa el registro de tus juegos, favoritos e historial.</p>
        <div className="settings-row" style={{ marginTop: '12px' }}>
          <button type="button" className="settings-btn-secondary" onClick={onExport}>
            📥 Exportar Respaldo JSON
          </button>
          <label className="settings-btn-secondary" style={{ cursor: 'pointer' }}>
            📤 Importar Respaldo JSON
            <input type="file" accept=".json" onChange={onImport} hidden />
          </label>
        </div>
      </section>
    </div>
  );
}
