import { TrophyIcon } from "../icons";

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
}: IntegrationsTabProps) {
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
    </div>
  );
}
