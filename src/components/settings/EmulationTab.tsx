import { PLATFORM_CORES } from "../../lib/cores";

export interface EmulationTabProps {
  connectedGamepads: string[];
  uniquePlatforms: string[];
  platformCores: Record<string, string>;
  onPlatformCoreChange: (platform: string, core: string) => void;
  getDefaultCore: (platform: string) => string;
}

export default function EmulationTab({
  connectedGamepads,
  uniquePlatforms,
  platformCores,
  onPlatformCoreChange,
  getDefaultCore,
}: EmulationTabProps) {
  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>Emulación &amp; Cores</h2>
        <p>Configuración de núcleos de RetroArch y detección de controles.</p>
      </div>

      {/* Detección de Gamepad */}
      <section className="settings-card" id="settings-gamepads">
        <h3>Mandos y Gamepads Conectados</h3>
        <div className="settings-gamepad-box">
          {connectedGamepads.length > 0 ? (
            <div className="settings-gamepad-list">
              {connectedGamepads.map((name, i) => (
                <div key={i} className="settings-gamepad-item">
                  <span className="settings-gamepad-icon">🎮</span>
                  <div>
                    <span className="settings-gamepad-name">{name}</span>
                    <span className="settings-badge-ok">Conectado y Activo</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="settings-gamepad-empty">
              <span className="settings-gamepad-icon-muted">🎮</span>
              <p>Ningún gamepad detectado en este momento.</p>
              <span className="settings-hint">Conecta un mando por USB o Bluetooth para navegar con gamepad.</span>
            </div>
          )}
        </div>
      </section>

      {/* Asignación de Cores */}
      {uniquePlatforms.length > 0 ? (
        <section className="settings-card" id="settings-platform-cores">
          <h3>Cores por Plataforma</h3>
          <p className="settings-hint" style={{ marginBottom: "16px" }}>
            Core por defecto que se usará al lanzar juegos de cada consola.
          </p>
          <div className="settings-platform-cores">
            {uniquePlatforms.map((platform) => {
              const options = PLATFORM_CORES[platform] || [getDefaultCore(platform)];
              return (
                <div key={platform} className="settings-platform-row">
                  <span className="settings-platform-name">{platform}</span>
                  <select
                    className="settings-platform-select"
                    value={platformCores[platform] || getDefaultCore(platform)}
                    onChange={(e) => onPlatformCoreChange(platform, e.target.value)}
                  >
                    {options.map((core) => (
                      <option key={core} value={core}>
                        {core}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <section className="settings-card" id="settings-platform-cores">
          <h3>Cores por Plataforma</h3>
          <p className="settings-hint">
            Escanea tu biblioteca de juegos para configurar los cores de cada plataforma.
          </p>
        </section>
      )}
    </div>
  );
}
