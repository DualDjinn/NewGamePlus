import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>{t("settings.integrations.panelTitle")}</h2>
        <p>{t("settings.integrations.panelDesc")}</p>
      </div>

      {/* RetroAchievements */}
      <section className="settings-card" id="settings-retroachievements">
        <div className="settings-card-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <TrophyIcon />
            <div>
              <h3>RetroAchievements</h3>
              <p>{t("settings.integrations.raDesc")}</p>
            </div>
          </div>
          {raLinkedUser && <span className="settings-badge-ok">{t("settings.integrations.linkedBadge")}</span>}
        </div>

        {raLinkedUser ? (
          <div className="settings-account-linked">
            <p className="settings-hint">
              {t("settings.integrations.activeSession")} <strong>{raLinkedUser}</strong>
            </p>
            <button type="button" className="settings-btn-secondary" onClick={handleUnlinkRA}>
              {t("settings.integrations.unlinkAccount")}
            </button>
          </div>
        ) : (
          <div className="settings-form-block">
            <div className="settings-input-group">
              <input
                className="settings-input"
                placeholder={t("settings.integrations.raUserPh")}
                value={raUsername}
                onChange={(e) => setRaUsername(e.target.value)}
              />
              <input
                className="settings-input"
                type="password"
                placeholder={t("settings.integrations.raPassPh")}
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
                {t("settings.integrations.getRaKey")}
              </a>
              <button type="button" className="settings-btn-primary" onClick={handleLinkRA}>
                {t("settings.integrations.linkAccount")}
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
            <span className="settings-option-title">{t("settings.integrations.hardcoreTitle")}</span>
            <p className="settings-option-desc">
              {t("settings.integrations.hardcoreDesc")}
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
            <h3>{t("settings.integrations.sgdbTitle")}</h3>
            <p>{t("settings.integrations.sgdbDesc")}</p>
          </div>
          {sgdbLinked && <span className="settings-badge-ok">{t("settings.integrations.activeBadge")}</span>}
        </div>

        {sgdbLinked ? (
          <div className="settings-account-linked">
            <p className="settings-hint">{t("settings.integrations.keyOk")}</p>
            <button type="button" className="settings-btn-secondary" onClick={handleUnlinkSGDB}>
              {t("settings.integrations.unlinkKey")}
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
                {t("settings.integrations.getSgdbKey")}
              </a>
              <button
                type="button"
                className="settings-btn-primary"
                onClick={handleLinkSGDB}
                disabled={sgdbLoading}
              >
                {sgdbLoading ? t("settings.integrations.verifying") : t("settings.integrations.saveKey")}
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
            <h3>{t("settings.integrations.ssTitle")}</h3>
            <p>{t("settings.integrations.ssDesc")}</p>
          </div>
          {ssLinked && <span className="settings-badge-ok">{t("settings.integrations.connectedBadge")}</span>}
        </div>

        {ssLinked ? (
          <div>
            <div className="settings-account-linked">
              <p className="settings-hint">
                {t("settings.integrations.connectedAs")} <strong>{ssDevIdSaved || t("settings.integrations.configured")}</strong>
                {ssUserSaved ? ` ${t("settings.integrations.userLabel")} ${ssUserSaved}` : ""}
              </p>
              <button
                type="button"
                className="settings-btn-secondary"
                onClick={handleUnlinkScreenScraper}
              >
                {t("settings.integrations.unlinkSs")}
              </button>
            </div>

            <div className="settings-divider" />

            {/* Descarga Masiva de Gameplays y Logos */}
            <div style={{ marginTop: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <span className="settings-option-title" style={{ fontSize: "1rem" }}>
                    {t("settings.integrations.batchTitle")}
                  </span>
                  <p className="settings-option-desc">
                    {t("settings.integrations.batchDesc")}
                  </p>
                </div>
                {isBatchScraping ? (
                  <button
                    type="button"
                    className="settings-btn-delete"
                    style={{ padding: "6px 14px", borderRadius: "6px", fontSize: "0.85rem" }}
                    onClick={handleCancelBatchScrape}
                  >
                    {t("settings.librarySection.cancelBtn")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="settings-btn-primary"
                    onClick={() => handleStartBatchScrape?.(batchOnlyMissing)}
                  >
                    {t("settings.librarySection.startBtn")}
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
                  <span>{t("settings.integrations.onlyNoVideo")}</span>
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
                      ? t("settings.librarySection.batchScrapeCompleted", { downloaded: batchProgress.downloaded_count, skipped: batchProgress.skipped_count, failed: batchProgress.failed_count })
                      : t("settings.librarySection.batchScrapeCancelled")}
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
                placeholder={t("settings.integrations.devIdPh")}
                value={ssDevId}
                onChange={(e) => setSsDevId(e.target.value)}
              />
              <input
                className="settings-input"
                type="password"
                placeholder={t("settings.integrations.devPassPh")}
                value={ssDevPass}
                onChange={(e) => setSsDevPass(e.target.value)}
              />
            </div>

            <div className="settings-form-row" style={{ marginTop: 8 }}>
              <input
                className="settings-input"
                type="text"
                placeholder={t("settings.integrations.ssUserPh")}
                value={ssUser}
                onChange={(e) => setSsUser(e.target.value)}
              />
              <input
                className="settings-input"
                type="password"
                placeholder={t("settings.integrations.ssPassPh")}
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
                {t("settings.integrations.getSsAccount")}
              </a>
              <button
                type="button"
                className="settings-btn-primary"
                onClick={handleLinkScreenScraper}
                disabled={ssLoading || !ssDevId.trim() || !ssDevPass.trim()}
              >
                {ssLoading ? t("settings.integrations.connecting") : t("settings.integrations.saveCreds")}
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

