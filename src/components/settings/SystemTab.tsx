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
  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>Sistema &amp; Diagnóstico</h2>
        <p>Registro de errores, información de la aplicación y licencias.</p>
      </div>

      {/* Asistente de Bienvenida */}
      <section className="settings-card" id="settings-onboarding">
        <div className="settings-card-header">
          <div>
            <h3>📖 Asistente de Bienvenida</h3>
            <p>Vuelve a abrir la guía interactiva paso a paso para configurar ROMs, SteamGridDB y RetroAchievements.</p>
          </div>
          {onOpenOnboarding && (
            <button
              type="button"
              className="settings-btn-primary"
              onClick={onOpenOnboarding}
            >
              Iniciar Asistente
            </button>
          )}
        </div>
      </section>

      {/* Log de Errores */}
      <section className="settings-card" id="settings-logs">
        <div className="settings-card-header">
          <div>
            <h3>Registro de Errores (Logs)</h3>
            <p>Útil para diagnosticar problemas al lanzar emuladores o escanear.</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
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
      <section className="settings-card settings-about" id="settings-about">
        <h3>Acerca de NewGame+</h3>
        <div className="settings-about-box">
          <div className="settings-about-header">
            <span className="settings-about-logo">NewGame+</span>
            <span className="settings-badge">v0.1.0</span>
          </div>
          <p className="settings-gpl">
            NewGame+ es un frontend retro de alto rendimiento impulsado por <strong>Tauri</strong>, <strong>React</strong> y{" "}
            <strong>Rust</strong>.
          </p>
          <p className="settings-gpl">
            Utiliza <a href="https://www.retroarch.com/" target="_blank" rel="noreferrer">RetroArch</a> y{" "}
            <a href="https://www.libretro.com/" target="_blank" rel="noreferrer">libretro</a> bajo la licencia
            GNU GPL v3. Los cores de emulación son distribuidos bajo sus respectivas licencias.
          </p>
          <p className="settings-gpl">
            Las carátulas se obtienen de{" "}
            <a href="https://github.com/libretro/libretro-thumbnails" target="_blank" rel="noreferrer">
              libretro-thumbnails
            </a>{" "}
            y{" "}
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
