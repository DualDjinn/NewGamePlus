import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      setSgFeedback(t("onboarding.keySaved"));
    } catch (e) {
      console.error("Failed to save SteamGridDB key:", e);
      setSgFeedback(t("onboarding.keySaveError"));
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
      setRaFeedback(t("onboarding.credsSaved"));
    } catch (e) {
      console.error("Failed to save RA credentials:", e);
      setRaFeedback(t("onboarding.credsSaveError"));
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
        <div className="onboarding-stepper" aria-label={t("onboarding.progress")}>
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
              <span className="onboarding-badge">{t("onboarding.gettingStarted")}</span>
              <h2 id="onboarding-title" className="onboarding-title">
                {t("onboarding.welcome")}
              </h2>
              <p className="onboarding-subtitle">
                {t("onboarding.welcomeDesc")}
              </p>
            </div>

            <div className="onboarding-body">
              <div className="onboarding-features-list">
                <div className="onboarding-feature-item">
                  <span className="onboarding-feature-icon">📁</span>
                  <div>
                    <div className="onboarding-feature-title">{t("onboarding.featIndex")}</div>
                    <p className="onboarding-feature-desc">
                      {t("onboarding.featIndexDesc")}
                    </p>
                  </div>
                </div>

                <div className="onboarding-feature-item">
                  <span className="onboarding-feature-icon">🎨</span>
                  <div>
                    <div className="onboarding-feature-title">{t("onboarding.featPosters")}</div>
                    <p className="onboarding-feature-desc">
                      {t("onboarding.featPostersDesc")}
                    </p>
                  </div>
                </div>

                <div className="onboarding-feature-item">
                  <span className="onboarding-feature-icon">🏆</span>
                  <div>
                    <div className="onboarding-feature-title">{t("onboarding.featAchievements")}</div>
                    <p className="onboarding-feature-desc">
                      {t("onboarding.featAchievementsDesc")}
                    </p>
                  </div>
                </div>

                <div className="onboarding-feature-item">
                  <span className="onboarding-feature-icon">🎮</span>
                  <div>
                    <div className="onboarding-feature-title">{t("onboarding.featGamepad")}</div>
                    <p className="onboarding-feature-desc">
                      {t("onboarding.featGamepadDesc")}
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
              <span className="onboarding-badge">{t("onboarding.step1of4")}</span>
              <h2 id="onboarding-title" className="onboarding-title">
                {t("onboarding.romFolders")}
              </h2>
              <p className="onboarding-subtitle">
                {t("onboarding.romFoldersDesc")} <code>F:\Roms</code> {t("onboarding.romFoldersDesc2")}
              </p>
            </div>

            <div className="onboarding-body">
              <div className="onboarding-box">
                <div className="onboarding-box-header">
                  <span className="onboarding-box-title">
                    {t("onboarding.selectedFolders", { count: folders.length })}
                  </span>
                  <button
                    type="button"
                    className="onboarding-link-btn"
                    onClick={onAddFolder}
                  >
                    {t("onboarding.browseAdd")}
                  </button>
                </div>

                {folders.length === 0 ? (
                  <p className="onboarding-empty-text">
                    {t("onboarding.noFoldersYet")}
                  </p>
                ) : (
                  <ul className="onboarding-list">
                    {folders.map((f, i) => (
                      <li key={i} className="onboarding-list-item">
                        <span>{f}</span>
                        <span style={{ color: "#34d399", fontSize: "0.8rem" }}>{t("onboarding.ready")}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0, lineHeight: 1.4 }}>
                  💡 <strong>{t("onboarding.tip")}</strong> {t("onboarding.romTip")}
                </p>
              </div>
            </div>
          </>
        )}

        {/* STEP 2: STEAMGRIDDB */}
        {currentStep === 2 && (
          <>
            <div className="onboarding-header">
              <span className="onboarding-badge">{t("onboarding.step2of4")}</span>
              <h2 id="onboarding-title" className="onboarding-title">
                {t("onboarding.sgdbTitle")}
              </h2>
              <p className="onboarding-subtitle">
                {t("onboarding.sgdbDesc")}
              </p>
            </div>

            <div className="onboarding-body">
              <div className="onboarding-box">
                <div className="onboarding-box-header">
                  <span className="onboarding-box-title">
                    {t("onboarding.getFreeKey")}
                  </span>
                  <a
                    href="https://www.steamgriddb.com/profile/preferences/api"
                    target="_blank"
                    rel="noreferrer"
                    className="onboarding-link-btn"
                  >
                    {t("onboarding.openSgdb")}
                  </a>
                </div>

                <div className="onboarding-input-group">
                  <label className="onboarding-input-label" htmlFor="sgdb-input">
                    {t("onboarding.pasteKey")}
                  </label>
                  <input
                    id="sgdb-input"
                    type="password"
                    className="onboarding-input"
                    placeholder={t("onboarding.keyPh")}
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
                    {savingSteamGrid ? t("onboarding.saving") : t("onboarding.saveKey")}
                  </button>

                  {hasSteamGridKey && (
                    <span className="onboarding-status-pill success">
                      {t("onboarding.sgdbConnected")}
                    </span>
                  )}
                  {sgFeedback && !hasSteamGridKey && (
                    <span style={{ fontSize: "0.85rem", color: "#f87171" }}>{sgFeedback}</span>
                  )}
                </div>
              </div>

              <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
                ℹ️ <em>{t("onboarding.optionalStep")}</em>
              </p>
            </div>
          </>
        )}

        {/* STEP 3: RETROACHIEVEMENTS */}
        {currentStep === 3 && (
          <>
            <div className="onboarding-header">
              <span className="onboarding-badge">{t("onboarding.step3of4")}</span>
              <h2 id="onboarding-title" className="onboarding-title">
                {t("onboarding.raTitle")}
              </h2>
              <p className="onboarding-subtitle">
                {t("onboarding.raDesc")}
              </p>
            </div>

            <div className="onboarding-body">
              <div className="onboarding-box">
                <div className="onboarding-box-header">
                  <span className="onboarding-box-title">
                    {t("onboarding.raAccount")}
                  </span>
                  <a
                    href="https://retroachievements.org/controlpanel.php"
                    target="_blank"
                    rel="noreferrer"
                    className="onboarding-link-btn"
                  >
                    {t("onboarding.openRaPanel")}
                  </a>
                </div>

                <div className="onboarding-input-group">
                  <label className="onboarding-input-label" htmlFor="ra-user">
                    {t("onboarding.username")}
                  </label>
                  <input
                    id="ra-user"
                    type="text"
                    className="onboarding-input"
                    placeholder={t("onboarding.usernamePh")}
                    value={raUsername}
                    onChange={(e) => setRaUsername(e.target.value)}
                  />
                </div>

                <div className="onboarding-input-group">
                  <label className="onboarding-input-label" htmlFor="ra-key">
                    {t("onboarding.apiKey")}
                  </label>
                  <input
                    id="ra-key"
                    type="password"
                    className="onboarding-input"
                    placeholder={t("onboarding.apiKeyPh")}
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
                    {t("onboarding.hardcoreOpt")}
                  </label>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    type="button"
                    className="onboarding-btn-secondary"
                    onClick={handleSaveRA}
                    disabled={savingRa || !raUsername.trim() || !raApiKey.trim()}
                  >
                    {savingRa ? t("onboarding.saving") : t("onboarding.saveCreds")}
                  </button>

                  {raFeedback && (
                    <span style={{ fontSize: "0.85rem", color: raFeedback.includes("✓") ? "#34d399" : "#f87171" }}>
                      {raFeedback}
                    </span>
                  )}
                </div>
              </div>

              <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: 0 }}>
                ℹ️ <em>{t("onboarding.noAccountYet")}</em>
              </p>
            </div>
          </>
        )}

        {/* STEP 4: CONTROLES & FINALIZAR */}
        {currentStep === 4 && (
          <>
            <div className="onboarding-header">
              <span className="onboarding-badge">{t("onboarding.allReady")}</span>
              <h2 id="onboarding-title" className="onboarding-title">
                {t("onboarding.controlsNav")}
              </h2>
              <p className="onboarding-subtitle">
                {t("onboarding.controlsNavDesc")}
              </p>
            </div>

            <div className="onboarding-body">
              <div className="onboarding-box">
                <div className="onboarding-box-title" style={{ marginBottom: "14px" }}>
                  {t("onboarding.padControls")}
                </div>
                <div className="onboarding-controls-grid">
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">{t("onboarding.ctrlGrid")}</span>
                    <span className="onboarding-control-key">D-Pad / Stick</span>
                  </div>
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">{t("onboarding.ctrlOpen")}</span>
                    <span className="onboarding-control-key">A / ✕</span>
                  </div>
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">{t("onboarding.ctrlBack")}</span>
                    <span className="onboarding-control-key">B / ◯</span>
                  </div>
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">{t("onboarding.ctrlFav")}</span>
                    <span className="onboarding-control-key">Y / △</span>
                  </div>
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">{t("onboarding.ctrlQuick")}</span>
                    <span className="onboarding-control-key">X / ▢</span>
                  </div>
                  <div className="onboarding-control-row">
                    <span className="onboarding-control-action">{t("onboarding.ctrlFullscreen")}</span>
                    <span className="onboarding-control-key">F11</span>
                  </div>
                </div>
              </div>

              {folders.length > 0 && (
                <div style={{ textAlign: "center", color: "#34d399", fontSize: "0.9rem", fontWeight: 600 }}>
                  {t("onboarding.foldersReady", { count: folders.length })}
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
                {t("onboarding.back")}
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
                {t("onboarding.skip")}
              </button>
            )}

            {currentStep < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                className="onboarding-btn-primary"
                onClick={() => setCurrentStep((s) => s + 1)}
              >
                {t("onboarding.next")}
              </button>
            ) : (
              <button
                type="button"
                className="onboarding-btn-primary"
                onClick={handleFinalize}
                autoFocus
              >
                {folders.length > 0 ? t("onboarding.scanStart") : t("onboarding.exploreStart")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
