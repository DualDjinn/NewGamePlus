import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PLATFORM_CORES } from "../../lib/cores";
import { GamepadIcon } from "../icons";
import ControllerMappingModal from "../ControllerMappingModal";

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
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const { t } = useTranslation();
  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>{t("settings.emulation.panelTitle")}</h2>
        <p>{t("settings.emulation.panelDesc")}</p>
      </div>

      {/* DetecciÃ³n de Gamepad */}
      <section className="settings-card settings-card--wide" id="settings-gamepads">
        <h3>{t("settings.emulation.padsTitle")}</h3>
        <div className="settings-gamepad-box">
          {connectedGamepads.length > 0 ? (
            <div className="settings-gamepad-list">
              {connectedGamepads.map((name, i) => (
                <div key={i} className="settings-gamepad-item">
                  <span className="settings-gamepad-icon"><GamepadIcon /></span>
                  <div>
                    <span className="settings-gamepad-name">{name}</span>
                    <span className="settings-badge-ok">{t("settings.emulation.padActive")}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="settings-gamepad-empty">
              <span className="settings-gamepad-icon-muted"><GamepadIcon /></span>
              <p>{t("settings.emulation.padEmpty")}</p>
              <span className="settings-hint">{t("settings.emulation.padHint")}</span>
            </div>
          )}
        </div>
        <div style={{ marginTop: "16px" }}>
          <button
            type="button"
            className="settings-btn-primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
            onClick={() => setMappingModalOpen(true)}
          >
            {t("settings.emulation.customizeMapping")}
          </button>
        </div>
      </section>

      {/* AsignaciÃ³n de Cores */}
      {uniquePlatforms.length > 0 ? (
<section className="settings-card settings-card--wide" id="settings-platform-cores">
            <h3>{t("settings.emulation.coresTitle")}</h3>
            <p className="settings-hint" style={{ marginBottom: "16px" }}>
            {t("settings.emulation.coresDesc")}
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
<section className="settings-card settings-card--wide" id="settings-platform-cores">
            <h3>{t("settings.emulation.coresTitle")}</h3>
            <p className="settings-hint">
            {t("settings.emulation.coresEmpty")}
          </p>
        </section>
      )}

      <ControllerMappingModal
        isOpen={mappingModalOpen}
        onClose={() => setMappingModalOpen(false)}
      />
    </div>
  );
}

