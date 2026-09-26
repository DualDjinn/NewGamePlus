import { useState } from "react";
import { TrophyIcon } from "../icons";
import type { BatchScrapeProgressEvent } from "../../lib/tauri";

export interface IntegrationsTabProps {
  raUsername: string;
  setRaUsername: (v: string) => void;
  raPassword: string;
  setRaPassword: (v: string) => void;
  raApiKey: string;
  setRaApiKey: (v: string) => void;
  raLinkedUser: string | null;
  raHardcore: boolean;
  raFeedback: { msg: string; isError: boolean } | null;
  handleLinkRA: () => void;
  handleUnlinkRA: () => void;
  handleToggleRAHardcore: () => void;

  sgdbApiKey: string;
  setSgdbApiKey: (v: string) => void;
  sgdbLinked: boolean;
  sgdbFeedback: { msg: string; isError: boolean } | null;
  sgdbLoading: boolean;
  handleLinkSGDB: () => void;
  handleUnlinkSGDB: () => void;

  ssDevId: string;
  setSsDevId: (v: string) => void;
  ssDevPass: string;
  setSsDevPass: (v: string) => void;
  ssUser: string;
  setSsUser: (v: string) => void;
  ssPass: string;
  setSsPass: (v: string) => void;
  ssLinked: boolean;
  ssDevIdSaved: string | null;
  ssUserSaved: string | null;
  ssFeedback: { msg: string; isError: boolean } | null;
  ssLoading: boolean;
  handleLinkScreenScraper: () => void;
  handleUnlinkScreenScraper: () => void;
  isBatchScraping?: boolean;
  batchProgress?: BatchScrapeProgressEvent | null;
  handleStartBatchScrape?: (onlyMissing: boolean) => void;
  handleCancelBatchScrape?: () => void;
}

export default function IntegrationsTab({
  raUsername,
  setRaUsername,
  raPassword,
  setRaPassword,
  raApiKey,
  setRaApiKey,
  raLinkedUser,
  raHardcore,
  raFeedback,
  handleLinkRA,
  handleUnlinkRA,
  handleToggleRAHardcore,

  sgdbApiKey,
  setSgdbApiKey,
  sgdbLinked,
  sgdbFeedback,
  sgdbLoading,
  handleLinkSGDB,
  handleUnlinkSGDB,

  ssDevId,
  setSsDevId,
  ssDevPass,
  setSsDevPass,
  ssUser,
  setSsUser,
  ssPass,
  setSsPass,
  ssLinked,
  ssDevIdSaved,
  ssUserSaved,
  ssFeedback,
  ssLoading,
  handleLinkScreenScraper,
  handleUnlinkScreenScraper,
  isBatchScraping = false,
  batchProgress,
  handleStartBatchScrape,
  handleCancelBatchScrape,
}: IntegrationsTabProps) {
  const [batchOnlyMissing, setBatchOnlyMissing] = useState(true);
  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>Cuentas &amp; Servicios Online</h2>
        <p>Vincula logros y scrapers de imágenes en alta resolución.</p>
      </div>

      {/* RetroAchievements */}
      <section className="settings-card" id="settings-retroachievements">
        <div className="settings-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
      <section className="settings-card" id="settings-steamgriddb">
        <div className="settings-card-header">
          <div>
            <h3>🎨 SteamGridDB (Heroes &amp; Banners)</h3>
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

      {/* ScreenScraper.fr (Gameplay Snaps & Wheel Logos) */}
      <section className="settings-card" id="settings-screenscraper">
        <div className="settings-card-header">
          <div>
            <h3>🎬 ScreenScraper.fr (Gameplay Snaps &amp; Logos)</h3>
            <p>Descarga videos de gameplay MP4 y logos transparentes de alta resolución para la ruleta Arcade.</p>
          </div>
          {ssLinked && <span className="settings-badge-ok">✓ Conectado</span>}
        </div>

        {ssLinked ? (
          <div>
            <div className="settings-account-linked">
              <p className="settings-hint">
                Conectado como Dev: <strong>{ssDevIdSaved || "Configurado"}</strong>
                {ssUserSaved ? ` | Usuario: ${ssUserSaved}` : ""}
              </p>
              <button
                type="button"
                className="settings-btn-secondary"
                onClick={handleUnlinkScreenScraper}
              >
                Desvincular ScreenScraper
              </button>
            </div>

            <div className="settings-divider" />

            {/* Descarga Masiva de Gameplays y Logos */}
            <div style={{ marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span className="settings-option-title" style={{ fontSize: "1rem" }}>
                    Descarga Masiva de Gameplays y Logos
                  </span>
                  <p className="settings-option-desc">
                    Descarga en segundo plano los videos y logos de toda tu colección automáticamente.
                  </p>
                </div>
                {isBatchScraping ? (
                  <button
                    type="button"
                    className="settings-btn-delete"
                    style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "0.85rem" }}
                    onClick={handleCancelBatchScrape}
                  >
                    ✕ Cancelar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="settings-btn-primary"
                    onClick={() => handleStartBatchScrape?.(batchOnlyMissing)}
                  >
                    ▶ Iniciar Descarga Masiva
                  </button>
                )}
              </div>

              {!isBatchScraping && (
                <label style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", cursor: "pointer", color: "var(--text-muted, #94a3b8)" }}>
                  <input
                    type="checkbox"
                    checked={batchOnlyMissing}
                    onChange={(e) => setBatchOnlyMissing(e.target.checked)}
                  />
                  <span>Solo para juegos que no tengan video</span>
                </label>
              )}

              {isBatchScraping && batchProgress && (
                <div className="settings-scan-progress-box" style={{ marginTop: "10px" }}>
                  <div className="settings-progress">
                    <div className="settings-progress-bar" style={{ width: `${batchProgress.percent}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "0.84rem" }}>
                    <span style={{ fontWeight: 600, color: "var(--accent, #00f0ff)" }}>
                      {batchProgress.status === "downloading" ? "Descargando:" : "Procesando:"} {batchProgress.game_name} ({batchProgress.current_index}/{batchProgress.total})
                    </span>
                    <span>{batchProgress.percent}%</span>
                  </div>
                  <p className="settings-progress-msg" style={{ marginTop: "4px" }}>
                    ✓ {batchProgress.downloaded_count} descargados • ⏭ {batchProgress.skipped_count} omitidos • ⚠ {batchProgress.failed_count} fallidos
                  </p>
                </div>
              )}

              {!isBatchScraping && batchProgress && (batchProgress.status === "completed" || batchProgress.status === "cancelled") && (
                <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", fontSize: "0.85rem" }}>
                  <span>
                    {batchProgress.status === "completed"
                      ? `¡Descarga masiva completada! ${batchProgress.downloaded_count} descargados, ${batchProgress.skipped_count} omitidos, ${batchProgress.failed_count} fallidos.`
                      : "Descarga cancelada"}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="settings-form-block">
            <div className="settings-form-row">
              <input
                className="settings-input"
                type="text"
                placeholder="Usuario Desarrollador (Dev ID)*"
                value={ssDevId}
                onChange={(e) => setSsDevId(e.target.value)}
              />
              <input
                className="settings-input"
                type="password"
                placeholder="Contraseña Desarrollador (Dev Password)*"
                value={ssDevPass}
                onChange={(e) => setSsDevPass(e.target.value)}
              />
            </div>

            <div className="settings-form-row" style={{ marginTop: 8 }}>
              <input
                className="settings-input"
                type="text"
                placeholder="Usuario ScreenScraper (Opcional)"
                value={ssUser}
                onChange={(e) => setSsUser(e.target.value)}
              />
              <input
                className="settings-input"
                type="password"
                placeholder="Contraseña ScreenScraper (Opcional)"
                value={ssPass}
                onChange={(e) => setSsPass(e.target.value)}
              />
            </div>

            <div className="settings-form-footer">
              <a
                href="https://www.screenscraper.fr/"
                target="_blank"
                rel="noreferrer"
                className="settings-link"
              >
                🔗 Obtener cuenta y clave API en ScreenScraper.fr
              </a>
              <button
                type="button"
                className="settings-btn-primary"
                onClick={handleLinkScreenScraper}
                disabled={ssLoading || !ssDevId.trim() || !ssDevPass.trim()}
              >
                {ssLoading ? "Conectando..." : "Guardar Credenciales"}
              </button>
            </div>
          </div>
        )}

        {ssFeedback && (
          <p className={`settings-feedback ${ssFeedback.isError ? "error" : "success"}`}>
            {ssFeedback.msg}
          </p>
        )}
      </section>
    </div>
  );
}

