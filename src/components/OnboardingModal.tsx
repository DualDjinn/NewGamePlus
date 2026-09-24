import { useState, useEffect } from "react";
import { useFocusTrap } from "../hooks/useFocusTrap";
import {
  saveSteamGridDBKey,
  saveRACredentials,
  setCheevosHardcore,
} from "../lib/tauri";
import "./OnboardingModal.css";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: string[];
  onAddFolder: () => Promise<void>;
  onStartScan: (folders: string[]) => void;
  initialHasSteamGridKey?: boolean;
  initialRaUser?: string;
}

const TOTAL_STEPS = 5;

export default function OnboardingModal({
  isOpen,
  onClose,
  folders,
  onAddFolder,
  onStartScan,
  initialHasSteamGridKey = false,
  initialRaUser = "",
}: OnboardingModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
  const [currentStep, setCurrentStep] = useState(0);

  // SteamGridDB local state
  const [steamGridKey, setSteamGridKey] = useState("");
  const [hasSteamGridKey, setHasSteamGridKey] = useState(initialHasSteamGridKey);
  const [savingSteamGrid, setSavingSteamGrid] = useState(false);
  const [sgFeedback, setSgFeedback] = useState<string | null>(null);

  // RetroAchievements local state
  const [raUsername, setRaUsername] = useState(initialRaUser);
  const [raApiKey, setRaApiKey] = useState("");
  const [raHardcore, setRaHardcore] = useState(true);
  const [savingRa, setSavingRa] = useState(false);
  const [raFeedback, setRaFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSaveSteamGrid() {
    if (!steamGridKey.trim()) return;
    setSavingSteamGrid(true);
    setSgFeedback(null);
    try {
      await saveSteamGridDBKey(steamGridKey.trim());
      setHasSteamGridKey(true);
      setSgFeedback("✓ Clave guardada correctamente");
    } catch (e) {
      console.error("Failed to save SteamGridDB key:", e);
      setSgFeedback("Error al guardar la clave");
    } finally {
      setSavingSteamGrid(false);
    }
  }

  async function handleSaveRA() {
    if (!raUsername.trim() || !raApiKey.trim()) return;
    setSavingRa(true);
    setRaFeedback(null);
    try {
      await saveRACredentials(raUsername.trim(), "", raApiKey.trim());
      await setCheevosHardcore(raHardcore);
      setRaFeedback("✓ Credenciales guardadas correctamente");
    } catch (e) {
      console.error("Failed to save RA credentials:", e);
      setRaFeedback("Error al guardar credenciales");
    } finally {
      setSavingRa(false);
    }
  }

  function handleFinalize() {
    onClose();
    if (folders.length > 0) {
      onStartScan(folders);
    }
  }

  return (
    <div
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="onboarding-card" ref={trapRef}>
        {/* Stepper Dots */}
        <div className="onboarding-stepper" aria-label="Progreso del asistente">
          {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                className={`onboarding-step-dot ${
                  idx === currentStep ? "active" : idx < currentStep ? "completed" : ""
                }`}
              >
                {idx < currentStep ? "✓" : idx + 1}
              </div>
              {idx < TOTAL_STEPS - 1 && (
                <div
                  className={`onboarding-step-line ${idx < currentStep ? "completed" : ""}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* STEP 0: BIENVENIDA */}
        {currentStep === 0 && (
          <>
            <div className="onboarding-header">
              <span className="onboarding-badge">Primeros Pasos</span>
              <h2 id="onboarding-title" className="onboarding-title">
                ¡Te damos la bienvenida a NewGame+!
              </h2>
              <p className="onboarding-subtitle">
                Tu centro multimedia y biblioteca de emulación retro definitivo. Configura tu experiencia en 3 sencillos pasos.
              </p>
            </div>

            <div className="onboarding-body">
              <div className="onboarding-features-list">
                <div className="onboarding-feature-item">
                  <span className="onboarding-feature-icon">📁</span>
                  <div>
                    <div className="onboarding-feature-title">Indexación Automática</div>
                    <p className="onboarding-feature-desc">
                      Agrega tus carpetas de ROMs. NewGame+ detecta consolas y descarga núcleos oficiales de RetroArch y emuladores por ti.
                    </p>
                  </div>
                </div>

                <div className="onboarding-feature-item">
                  <span className="onboarding-feature-icon">🎨</span>
                  <div>
                    <div className="onboarding-feature-title">Pósters y Banners HD</div>
                    <p className="onboarding-feature-desc">
                      Integración comunitaria con SteamGridDB para carátulas de alta resolución, logos transparentes y banners hero estilo Netflix.
                    </p>
                  </div>
                </div>

                <div className="onboarding-feature-item">
                  <span className="onboarding-feature-icon">🏆</span>
                  <div>
                    <div className="onboarding-feature-title">Logros Retro en Vivo</div>
                    <p className="onboarding-feature-desc">
                      Desbloquea trofeos oficiales mientras juegas con soporte para RetroAchievements y modo Hardcore.
                    </p>
                  </div>
                </div>

                <div className="onboarding-feature-item">
                  <span className="onboarding-feature-icon">🎮</span>
                  <div>
                    <div className="onboarding-feature-title">Navegación por Mando</div>
                    <p className="onboarding-feature-desc">
                      Conecta tu mando de Xbox o PlayStation y disfruta de una experiencia 100% estilo consola de sofá sin tocar el ratón.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* STEP 1: CARPETAS DE ROMS */}
        {currentStep === 1 && (
          <>
            <div className="onboarding-header">
              <span className="onboarding-badge">Paso 1 de 4</span>
              <h2 id="onboarding-title" className="onboarding-title">
                Carpetas de ROMs y Juegos
              </h2>
              <p className="onboarding-subtitle">
                Indica dónde almacenas tus juegos. Puedes agregar una carpeta principal (ej. <code>F:\Roms</code>) o carpetas individuales por consola.
              </p>
            </div>

            <div className="onboarding-body">
              <div className="onboarding-box">
                <div className="onboarding-box-header">
                  <span className="onboarding-box-title">
                    📂 Carpetas Seleccionadas ({folders.length})
                  </span>
                  <button
                    type="button"
                    className="onboarding-link-btn"
                    onClick={onAddFolder}
                  >
                    + Explorar y Agregar Carpeta
                  </button>
                </div>

                {folders.length === 0 ? (
                  <p className="onboarding-empty-text">
                    Aún no has agregado ninguna carpeta de ROMs. Haz clic en "Explorar y Agregar Carpeta" para comenzar.
                  </p>
                ) : (
                  <ul className="onboarding-list">
                    {folders.map((f, i) => (
                      <li key={i} className="onboarding-list-item">
                        <span>{f}</span>
                        <span style={{ color: "#34d399", fontSize: "0.8rem" }}>✓ Lista</span>
                      </li>
                    ))}
                  </ul>
                )}

                <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>
                  💡 <strong>Tip:</strong> NewGame+ escaneará subcarpetas automáticamente y descargará los núcleos necesarios sin que tengas que configurar emuladores manualmente.
                </p>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: STEAMGRIDDB */}
        {currentStep === 2 && (
          <>
            <div className="onboarding-header">
              <span className="onboarding-badge">Paso 2 de 4</span>
              <h2 id="onboarding-title" className="onboarding-title">
                🎨 Carátulas y Banners HD (SteamGridDB)
              </h2>
              <p className="onboarding-subtitle">
                SteamGridDB proporciona el arte visual cinematográfico: logos transparentes, carátulas verticales HD y fondos hero panorámicos.
              </p>
            </div>

            <div className="onboarding-body">
              <div className="onboarding-box">
                <div className="onboarding-box-header">
                  <span className="onboarding-box-title">
                    Obtén tu API Key Gratuita
                  </span>
                  <a
                    href="https://www.steamgriddb.com/profile/preferences/api"
                    target="_blank"
                    rel="noreferrer"
                    className="onboarding-link-btn"
                  >
                    🔗 Abrir SteamGridDB (Perfil &gt; Preferencias &gt; API)
                  </a>
                </div>

                <div className="onboarding-input-group">
                  <label className="onboarding-input-label" htmlFor="sgdb-input">
                    Pega tu SteamGridDB API Key (Bearer Token):
                  </label>
                  <input
                    id="sgdb-input"
                    type="password"
                    className="onboarding-input"
                    placeholder="Pega aquí tu clave..."
                    value={steamGridKey}
                    onChange={(e) => setSteamGridKey(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px" }}>
                  <button
                    type="button"
                    className="onboarding-btn-secondary"
                    onClick={handleSaveSteamGrid}
                    disabled={savingSteamGrid || !steamGridKey.trim()}
                  >
                    {savingSteamGrid ? "Guardando..." : "Guardar Clave"}
                  </button>

                  {hasSteamGridKey && (
                    <span className="onboarding-status-pill success">
                      ✓ SteamGridDB Conectado
                    </span>
                  )}
                  {sgFeedback && !hasSteamGridKey && (
                    <span style={{ fontSize: "0.85rem", color: "#f87171" }}>{sgFeedback}</span>
                  )}
                </div>
              </div>

              <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
                ℹ️ <em>Este paso es opcional pero muy recomendado. Puedes omitirlo y configurarlo más tarde en Ajustes &gt; Integraciones.</em>
              </p>
            </div>
          </>
        )}

        {/* STEP 3: RETROACHIEVEMENTS */}
        {currentStep === 3 && (
          <>
            <div className="onboarding-header">
              <span className="onboarding-badge">Paso 3 de 4</span>
              <h2 id="onboarding-title" className="onboarding-title">
                🏆 Logros Retro (RetroAchievements)
              </h2>
              <p className="onboarding-subtitle">
                Desbloquea trofeos mientras juegas a tus clásicos favoritos de NES, SNES, GBA, PS1, Mega Drive y más con sonido y avisos en pantalla.
              </p>
            </div>

            <div className="onboarding-body">
              <div className="onboarding-box">
                <div className="onboarding-box-header">
                  <span className="onboarding-box-title">
                    Cuenta de RetroAchievements
                  </span>
                  <a
                    href="https://retroachievements.org/controlpanel.php"
                    target="_blank"
                    rel="noreferrer"
                    className="onboarding-link-btn"
                  >
                    🔗 Abrir Panel de Control (retroachievements.org)
                  </a>
                </div>

                <div className="onboarding-input-group">
                  <label className="onboarding-input-label" htmlFor="ra-user">
                    Nombre de Usuario:
                  </label>
                  <input
                    id="ra-user"
                    type="text"
                    className="onboarding-input"
                    placeholder="Tu usuario en RetroAchievements"
                    value={raUsername}
                    onChange={(e) => setRaUsername(e.target.value)}
                  />
                </div>

                <div className="onboarding-input-group">
                  <label className="onboarding-input-label" htmlFor="ra-key">
                    Web API Key:
                  </label>
                  <input
                    id="ra-key"
                    type="password"
                    className="onboarding-input"
                    placeholder="Tu Web API Key (Settings > Keys en la web)"
                    value={raApiKey}
                    onChange={(e) => setRaApiKey(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "14px 0" }}>
                  <input
                    id="ra-hardcore"
                    type="checkbox"
                    checked={raHardcore}
                    onChange={(e) => setRaHardcore(e.target.checked)}
                    style={{ accentColor: "#f59e0b", cursor: "pointer" }}
                  />
                  <label htmlFor="ra-hardcore" style={{ fontSize: "0.85rem", color: "#cbd5e1", cursor: "pointer" }}>
                    Modo Hardcore (sin rebobinado ni trampas, insignias de maestría oficiales)
                  </label>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    type="button"
                    className="onboarding-btn-secondary"
                    onClick={handleSaveRA}
                    disabled={savingRa || !raUsername.trim() || !raApiKey.trim()}
                  >
                    {savingRa ? "Guardando..." : "Guardar Credenciales"}
                  </button>

                  {raFeedback && (
                    <span style={{ fontSize: "0.85rem", color: raFeedback.includes("✓") ? "#34d399" : "#f87171" }}>
                      {raFeedback}
                    </span>
                  )}
                </div>
              </div>

              <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
                ℹ️ <em>Si aún no tienes cuenta, puedes registrarte gratis en cualquier momento y configurarlo desde Ajustes &gt; Integraciones.</em>
              </p>
            </div>
          </>
        )}

        {/* STEP 4: CONTROLES & FINALIZAR */}
        {currentStep === 4 && (
          <>
            <div className="onboarding-header">
              <span className="onboarding-badge">¡Todo Listo!</span>
              <h2 id="onboarding-title" className="onboarding-title">
                Controles y Navegación
              </h2>
              <p className="onboarding-subtitle">
                NewGame+ está optimizado tanto para mandos como para teclado. ¡Conéctalo y juega directamente!
              </p>
            </div>

            <div className="onboarding-body">
              <div className="onboarding-box">
                <div className="onboarding-box-title" style={{ marginBottom: "14px" }}>
                  🎮 Controles de Mando (Xbox / PlayStation)
                </div>
                <div className="onboarding-controls-grid">
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">Navegar por la cuadrícula</span>
                    <span className="onboarding-control-key">D-Pad / Stick</span>
                  </div>
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">Abrir ficha / Lanzar</span>
                    <span className="onboarding-control-key">A / ✕</span>
                  </div>
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">Volver / Cerrar modal</span>
                    <span className="onboarding-control-key">B / ◯</span>
                  </div>
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">Marcar Favorito</span>
                    <span className="onboarding-control-key">Y / △</span>
                  </div>
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">Lanzamiento rápido</span>
                    <span className="onboarding-control-key">X / ▢</span>
                  </div>
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">Pantalla Completa</span>
                    <span className="onboarding-control-key">F11</span>
                  </div>
                </div>
              </div>

              {folders.length > 0 && (
                <div style={{ textAlign: "center", color: "#34d399", fontSize: "0.9rem", fontWeight: 600 }}>
                  ✓ {folders.length} carpeta(s) lista(s) para ser indexadas.
                </div>
              )}
            </div>
          </>
        )}

        {/* FOOTER ACTIONS */}
        <div className="onboarding-footer">
          <div>
            {currentStep > 0 && (
              <button
                type="button"
                className="onboarding-btn-secondary"
                onClick={() => setCurrentStep((s) => s - 1)}
              >
                ← Anterior
              </button>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {currentStep > 0 && currentStep < TOTAL_STEPS - 1 && (
              <button
                type="button"
                className="onboarding-btn-ghost"
                onClick={() => setCurrentStep((s) => s + 1)}
              >
                Omitir
              </button>
            )}

            {currentStep < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                className="onboarding-btn-primary"
                onClick={() => setCurrentStep((s) => s + 1)}
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                className="onboarding-btn-primary"
                onClick={handleFinalize}
                autoFocus
              >
                {folders.length > 0 ? "🚀 Escanear e Iniciar NewGame+" : "✨ Comenzar a Explorar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
