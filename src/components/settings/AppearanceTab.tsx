import { useTranslation } from "react-i18next";
import { changeAppLanguage } from "../../i18n";
import type { LayoutStyle } from "../../types";

export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  primary: string;
  bg: string;
  card: string;
}

export const THEMES: ThemeOption[] = [
  {
    id: "gold",
    name: "NewGame+ Gold",
    description: "Oro cálido, obsidiana y grafito mate",
    primary: "#f59e0b",
    bg: "#0a0b10",
    card: "#131622",
  },
  {
    id: "arcade",
    name: "Arcade Synthwave",
    description: "Cyan neón, magenta y azul medianoche",
    primary: "#00f0ff",
    bg: "#060812",
    card: "#0f1428",
  },
  {
    id: "console",
    name: "Midnight Blue",
    description: "Azul cobalto y pizarra profunda estilo consola",
    primary: "#3b82f6",
    bg: "#070c18",
    card: "#10192e",
  },
  {
    id: "snes",
    name: "SNES Classic",
    description: "Violeta índigo y lavanda 16-bit",
    primary: "#818cf8",
    bg: "#0c0d14",
    card: "#161724",
  },
  {
    id: "crimson",
    name: "Crimson Red",
    description: "Rojo carmesí y negro cinemático",
    primary: "#e50914",
    bg: "#0e0a0c",
    card: "#191114",
  },
];

export interface AppearanceTabProps {
  theme?: string;
  onThemeChange?: (theme: string) => void;
  layoutStyle?: LayoutStyle;
  onLayoutStyleChange?: (style: LayoutStyle) => void;
  splashEnabled?: boolean;
  onSplashEnabledChange?: (v: boolean) => void;
  splashSoundEnabled?: boolean;
  onSplashSoundEnabledChange?: (v: boolean) => void;
  onPreviewSplash?: () => void;
  kioskMode: boolean;
  onToggleKiosk: () => void;
}

export default function AppearanceTab({
  theme = "gold",
  onThemeChange,
  layoutStyle = "classic",
  onLayoutStyleChange,
  splashEnabled = true,
  onSplashEnabledChange,
  splashSoundEnabled = true,
  onSplashSoundEnabledChange,
  onPreviewSplash,
  kioskMode,
  onToggleKiosk,
}: AppearanceTabProps) {
  const { t, i18n } = useTranslation();

  return (
    <div className="settings-tab-panel">
      <div className="settings-panel-header">
        <h2>{t("settings.tabs.appearance")}</h2>
        <p>
          {i18n.language.startsWith("en")
            ? "Customize interface language, visual layout, and theme colors."
            : "Personaliza el idioma, estilo visual y temas cromáticos de la interfaz."}
        </p>
      </div>

      {/* Selector de Idioma */}
      <section className="settings-card" id="settings-language">
        <h3>{t("settings.appearance.language")}</h3>
        <p className="settings-hint" style={{ marginBottom: "16px" }}>
          {t("settings.appearance.languageSubtitle")}
        </p>
        <div className="settings-sort-group">
          <button
            type="button"
            className={`settings-sort-btn ${i18n.language.startsWith("es") ? "active" : ""}`}
            onClick={() => changeAppLanguage("es")}
          >
            🇪🇸 {t("settings.appearance.languageEs")}
          </button>
          <button
            type="button"
            className={`settings-sort-btn ${i18n.language.startsWith("en") ? "active" : ""}`}
            onClick={() => changeAppLanguage("en")}
          >
            🇺🇸 {t("settings.appearance.languageEn")}
          </button>
        </div>
      </section>

      {/* Selector de Estilos de Diseño */}
      <section className="settings-card" id="settings-layout">
        <h3>{t("settings.appearance.layoutStyle")}</h3>
        <p className="settings-hint" style={{ marginBottom: "16px" }}>
          {i18n.language.startsWith("en")
            ? "Choose the home screen structure and layout."
            : "Elige la estructura y disposición visual de la pantalla principal."}
        </p>
        <div className="settings-themes-grid">
          <button
            type="button"
            className={`settings-theme-card ${layoutStyle === "classic" ? "active" : ""}`}
            onClick={() => onLayoutStyleChange?.("classic")}
          >
            <div
              className="settings-theme-preview"
              style={{
                background: "#0a0b10",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              📑
            </div>
            <div className="settings-theme-info">
              <span className="settings-theme-name">
                {t("settings.appearance.layoutClassic", "Estilo Clásico (Cards)")}
              </span>
            </div>
          </button>

          <button
            type="button"
            className={`settings-theme-card ${layoutStyle === "immersive" ? "active" : ""}`}
            onClick={() => onLayoutStyleChange?.("immersive")}
          >
            <div
              className="settings-theme-preview"
              style={{
                background: "linear-gradient(135deg, #071526, #00f0ff22)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              🌌
            </div>
            <div className="settings-theme-info">
              <span className="settings-theme-name">
                {t("settings.appearance.layoutImmersive", "Estilo Inmersivo (Edge-to-Edge)")}
              </span>
            </div>
          </button>

          <button
            type="button"
            className={`settings-theme-card ${layoutStyle === "arcade" ? "active" : ""}`}
            onClick={() => onLayoutStyleChange?.("arcade")}
          >
            <div
              className="settings-theme-preview"
              style={{
                background: "linear-gradient(135deg, #1e0a3c, #00f0ff33)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              🕹️
            </div>
            <div className="settings-theme-info">
              <span className="settings-theme-name">
                {t("settings.appearance.layoutArcade", "Arcade Wheel (HyperSpin)")}
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* Selector de Temas */}
      <section className="settings-card" id="settings-themes">
        <h3>Temas Visuales</h3>
        <p className="settings-hint" style={{ marginBottom: "16px" }}>
          Selecciona la paleta de iluminación y acento para toda la interfaz.
        </p>
        <div className="settings-themes-grid">
          {THEMES.map((themeItem) => (
            <button
              key={themeItem.id}
              type="button"
              className={`settings-theme-card ${theme === themeItem.id ? "active" : ""}`}
              onClick={() => onThemeChange?.(themeItem.id)}
            >
              <div className="settings-theme-preview" style={{ background: themeItem.bg }}>
                <div className="settings-theme-swatch" style={{ background: themeItem.primary }} />
                <div className="settings-theme-card-preview" style={{ background: themeItem.card }} />
              </div>
              <div className="settings-theme-info">
                <span className="settings-theme-name">{themeItem.name}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Animación de Inicio (Splash Screen) */}
      <section className="settings-card" id="settings-splash">
        <h3>{t("settings.appearance.splashSection")}</h3>
        <p className="settings-hint" style={{ marginBottom: "16px" }}>
          {t("settings.appearance.splashSubtitle")}
        </p>

        <div className="settings-row-option" style={{ marginBottom: "16px" }}>
          <div>
            <span className="settings-option-title">{t("settings.appearance.splashEnable")}</span>
            <p className="settings-option-desc">{t("settings.appearance.splashEnableDesc")}</p>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={splashEnabled}
              onChange={(e) => onSplashEnabledChange?.(e.target.checked)}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>

        <div className="settings-row-option" style={{ marginBottom: "16px" }}>
          <div>
            <span className="settings-option-title">{t("settings.appearance.splashSound")}</span>
            <p className="settings-option-desc">{t("settings.appearance.splashSoundDesc")}</p>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={splashSoundEnabled}
              disabled={!splashEnabled}
              onChange={(e) => onSplashSoundEnabledChange?.(e.target.checked)}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>

        <div style={{ marginTop: "12px" }}>
          <button
            type="button"
            className="settings-btn-secondary"
            onClick={onPreviewSplash}
            title={t("settings.appearance.splashPreviewBtn")}
          >
            ▶ {t("settings.appearance.splashPreviewBtn")}
          </button>
        </div>
      </section>

      {/* Modo Kiosko */}
      <section className="settings-card" id="settings-kiosk">
        <div className="settings-row-option">
          <div>
            <span className="settings-option-title">Modo Kiosko / Consola</span>
            <p className="settings-option-desc">Inicia GameFlix en pantalla completa sin bordes de ventana.</p>
          </div>
          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={kioskMode}
              onChange={onToggleKiosk}
            />
            <span className="settings-toggle-slider" />
          </label>
        </div>
      </section>
    </div>
  );
}
