import { useTranslation } from "react-i18next";

export interface SystemTabProps {
  errorLogs: string | null;
  copiedLog: boolean;
  handleToggleLogs: () => void;
  handleCopyLogs: () => void;
  onOpenOnboarding?: () => void;
}

export default function SystemTab({
  errorLogs,
  copiedLog,
  handleToggleLogs,
  handleCopyLogs,
  onOpenOnboarding,
}: SystemTabProps) {
  const { t } = useTranslation();
  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>{t("settings.systemPanel.panelTitle")}</h2>
        <p>{t("settings.systemPanel.panelDesc")}</p>
      </div>

      {/* Asistente de Bienvenida */}
      <section className="settings-card" id="settings-onboarding">
        <div className="settings-card-header">
          <div>
            <h3>{t("settings.systemPanel.onboardTitle")}</h3>
            <p>{t("settings.systemPanel.onboardDesc")}</p>
          </div>
          {onOpenOnboarding && (
            <button
              type="button"
              className="settings-btn-primary"
              onClick={onOpenOnboarding}
            >
              {t("settings.systemPanel.onboardBtn")}
            </button>
          )}
        </div>
      </section>

      {/* Log de Errores */}
      <section className="settings-card" id="settings-logs">
        <div className="settings-card-header">
          <div>
            <h3>{t("settings.systemPanel.logsTitle")}</h3>
            <p>{t("settings.systemPanel.logsDesc")}</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            {errorLogs !== null && (
              <button type="button" className="settings-btn-secondary" onClick={handleCopyLogs}>
                {copiedLog ? t("settings.systemPanel.copied") : t("settings.systemPanel.copyLog")}
              </button>
            )}
            <button type="button" className="settings-btn-secondary" onClick={handleToggleLogs}>
              {errorLogs !== null ? t("settings.systemPanel.hide") : t("settings.systemPanel.viewLogs")}
            </button>
          </div>
        </div>

        {errorLogs !== null && (
          <pre className="settings-log-view">{errorLogs}</pre>
        )}
      </section>

      {/* Acerca de */}
      <section className="settings-card settings-about" id="settings-about">
        <h3>{t("settings.systemPanel.aboutTitle")}</h3>
        <div className="settings-about-box">
          <div className="settings-about-header">
            <span className="settings-about-logo">NewGame+</span>
            <span className="settings-badge">v0.1.0</span>
          </div>
          <p className="settings-gpl">
            NewGame+ {t("settings.systemPanel.aboutPowered")} <strong>Tauri</strong>, <strong>React</strong> {t("settings.systemPanel.aboutAnd")}{" "}
            <strong>Rust</strong>.
          </p>
          <p className="settings-gpl">
            {t("settings.systemPanel.aboutUses")} <a href="https://www.retroarch.com/" target="_blank" rel="noreferrer">RetroArch</a> {t("settings.systemPanel.aboutAnd")}{" "}
            <a href="https://www.libretro.com/" target="_blank" rel="noreferrer">libretro</a> {t("settings.systemPanel.aboutGpl")}
          </p>
          <p className="settings-gpl">
            {t("settings.systemPanel.aboutCovers")}{" "}
            <a href="https://github.com/libretro/libretro-thumbnails" target="_blank" rel="noreferrer">
              libretro-thumbnails
            </a>{" "}
            {t("settings.systemPanel.aboutAnd")}{" "}
            <a href="https://www.steamgriddb.com/" target="_blank" rel="noreferrer">
              SteamGridDB
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
