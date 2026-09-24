import { useState, useEffect, useRef, useCallback } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import type { Game, SaveSlotInfo } from "../types";
import {
  inGameResume,
  inGameSaveState,
  inGameLoadState,
  inGameSetVolume,
  inGameQuit,
  getGraphicsSettings,
  getSavestateSlots,
} from "../lib/tauri";
import ControllerMappingModal from "./ControllerMappingModal";
import "./InGameOverlayModal.css";

interface Props {
  isOpen: boolean;
  game: Game | null;
  screenshotPath?: string | null;
  onClose: () => void;
}

export default function InGameOverlayModal({ isOpen, game, screenshotPath, onClose }: Props) {
  const [activeSlot, setActiveSlot] = useState<number>(1);
  const [volume, setVolume] = useState<number>(80);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number>(0);
  const [showControlsModal, setShowControlsModal] = useState<boolean>(false);
  const [showMappingModal, setShowMappingModal] = useState<boolean>(false);
  const [showSlotsPanel, setShowSlotsPanel] = useState<boolean>(false);
  const [slots, setSlots] = useState<SaveSlotInfo[]>([]);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSlots = useCallback(async () => {
    if (!game?.id) return;
    try {
      const data = await getSavestateSlots(game.id);
      setSlots(data);
    } catch (err) {
      console.error("Error loading save slots:", err);
    }
  }, [game?.id]);

  // Load existing volume and slots when modal opens
  useEffect(() => {
    if (isOpen) {
      getGraphicsSettings()
        .then((s) => {
          if (s && typeof s.audio_volume === "number") {
            setVolume(s.audio_volume);
          }
        })
        .catch(() => {});
      setSelectedCardIdx(0);
      setShowControlsModal(false);
      setShowMappingModal(false);
      setShowSlotsPanel(false);
      fetchSlots();
    }
  }, [isOpen, fetchSlots]);

  const showToast = useCallback((msg: string) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(msg);
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 2800);
  }, []);

  const handleResume = useCallback(async () => {
    try {
      await inGameResume();
    } catch (e) {
      console.error(e);
    } finally {
      onClose();
    }
  }, [onClose]);

  const handleSave = useCallback(
    async (slotNum?: number) => {
      const targetSlot = slotNum ?? activeSlot;
      try {
        const res = await inGameSaveState(game?.id, targetSlot);
        showToast(res || `Estado guardado en ranura ${targetSlot}`);
        await fetchSlots();
      } catch (err) {
        showToast(`Error al guardar: ${err}`);
      }
    },
    [activeSlot, game?.id, fetchSlots, showToast]
  );

  const handleLoad = useCallback(
    async (slotNum?: number) => {
      const targetSlot = slotNum ?? activeSlot;
      try {
        const res = await inGameLoadState(targetSlot);
        showToast(res || `Estado cargado de ranura ${targetSlot}`);
        setTimeout(() => {
          handleResume();
        }, 600);
      } catch (err) {
        showToast(`Error al cargar: ${err}`);
      }
    },
    [activeSlot, handleResume, showToast]
  );

  const handleVolumeChange = useCallback(async (newVol: number) => {
    setVolume(newVol);
    try {
      await inGameSetVolume(newVol);
    } catch (err) {
      console.error("Error setting volume:", err);
    }
  }, []);

  const handleQuit = useCallback(async () => {
    try {
      await inGameQuit();
    } catch (e) {
      console.error(e);
    } finally {
      onClose();
    }
  }, [onClose]);

  // Keyboard navigation inside InGameOverlay
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (showMappingModal) return;

      if (showControlsModal) {
        if (e.key === "Escape" || e.key === "Backspace") {
          e.preventDefault();
          setShowControlsModal(false);
        }
        return;
      }

      if (showSlotsPanel) {
        if (e.key === "Escape" || e.key === "Backspace") {
          e.preventDefault();
          setShowSlotsPanel(false);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        handleResume();
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedCardIdx((prev) => (prev < 4 ? prev + 1 : prev));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedCardIdx((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedCardIdx(5);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedCardIdx(0);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedCardIdx === 0) handleResume();
        else if (selectedCardIdx === 1) setShowSlotsPanel(true);
        else if (selectedCardIdx === 2) setShowSlotsPanel(true);
        else if (selectedCardIdx === 4) setShowControlsModal(true);
        else if (selectedCardIdx === 5) handleQuit();
      } else if (selectedCardIdx === 3) {
        if (e.key === "]" || e.key === "+" || e.key === "=") {
          e.preventDefault();
          handleVolumeChange(Math.min(100, volume + 5));
        } else if (e.key === "[" || e.key === "-") {
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 5));
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isOpen,
    showControlsModal,
    showMappingModal,
    showSlotsPanel,
    selectedCardIdx,
    volume,
    handleResume,
    handleSave,
    handleLoad,
    handleVolumeChange,
    handleQuit,
  ]);

  if (!isOpen) return null;

  const gameTitle = game?.display_name || game?.name || "Juego en ejecución";
  const platform = game?.platform || "RetroArch";

  return (
    <div className="ingame-overlay-backdrop">
      {screenshotPath && (
        <img
          src={convertFileSrc(screenshotPath)}
          className="ingame-overlay-screenshot"
          alt=""
        />
      )}
      {notification && (
        <div className="ingame-overlay-toast animate-slide-down">
          <span>{notification}</span>
        </div>
      )}

      <div className="ingame-overlay-container">
        <div className="ingame-overlay-header">
          <span className="ingame-overlay-badge">PAUSA</span>
          <h1 className="ingame-overlay-title">
            {gameTitle} <span className="ingame-overlay-subtitle">• {platform}</span>
          </h1>
        </div>

        <div className="ingame-cards-row">
          {/* Card 1: Reanudar */}
          <button
            type="button"
            className={`ingame-card ${selectedCardIdx === 0 ? "active-focus" : ""}`}
            onClick={handleResume}
            onMouseEnter={() => setSelectedCardIdx(0)}
          >
            <div className="ingame-card-icon-wrapper play-glow">
              <svg viewBox="0 0 24 24" fill="currentColor" className="ingame-svg-icon">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            <div className="ingame-card-content">
              <span className="ingame-card-title">Reanudar</span>
              <span className="ingame-card-caption">Volver al juego (Esc)</span>
            </div>
          </button>

          {/* Card 2: Guardar Estado */}
          <button
            type="button"
            className={`ingame-card ${selectedCardIdx === 1 ? "active-focus" : ""}`}
            onClick={() => handleSave(activeSlot)}
            onMouseEnter={() => setSelectedCardIdx(1)}
          >
            <div className="ingame-card-icon-wrapper save-glow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ingame-svg-icon"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </div>
            <div className="ingame-card-content">
              <span className="ingame-card-title">Guardar Estado</span>
              <div className="ingame-slot-selector" onClick={(e) => e.stopPropagation()}>
                {[1, 2, 3, 4, 5].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`ingame-slot-pill ${activeSlot === slot ? "active" : ""}`}
                    onClick={() => {
                      setActiveSlot(slot);
                      handleSave(slot);
                    }}
                    title={`Guardar en ranura ${slot}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="ingame-subaction-link"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSlotsPanel(true);
                }}
              >
                Ver ranuras con capturas 🖼️
              </button>
            </div>
          </button>

          {/* Card 3: Cargar Estado */}
          <button
            type="button"
            className={`ingame-card ${selectedCardIdx === 2 ? "active-focus" : ""}`}
            onClick={() => handleLoad(activeSlot)}
            onMouseEnter={() => setSelectedCardIdx(2)}
          >
            <div className="ingame-card-icon-wrapper load-glow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ingame-svg-icon"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div className="ingame-card-content">
              <span className="ingame-card-title">Cargar Estado</span>
              <span className="ingame-card-caption">Ranura actual: {activeSlot}</span>
              <button
                type="button"
                className="ingame-subaction-link"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSlotsPanel(true);
                }}
              >
                Explorar estados guardados 📂
              </button>
            </div>
          </button>

          {/* Card 4: Volumen */}
          <div
            className={`ingame-card volume-card ${selectedCardIdx === 3 ? "active-focus" : ""}`}
            onMouseEnter={() => setSelectedCardIdx(3)}
          >
            <div className="ingame-card-icon-wrapper volume-glow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ingame-svg-icon"
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </div>
            <div className="ingame-card-content">
              <div className="ingame-volume-header">
                <span className="ingame-card-title">Volumen</span>
                <span className="ingame-volume-val">{volume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="ingame-volume-slider"
              />
            </div>
          </div>

          {/* Card 5: Controles & Mapeo */}
          <button
            type="button"
            className={`ingame-card ${selectedCardIdx === 4 ? "active-focus" : ""}`}
            onClick={() => setShowControlsModal(true)}
            onMouseEnter={() => setSelectedCardIdx(4)}
          >
            <div className="ingame-card-icon-wrapper controls-glow">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ingame-svg-icon"
              >
                <line x1="6" y1="12" x2="10" y2="12" />
                <line x1="8" y1="10" x2="8" y2="14" />
                <line x1="15" y1="13" x2="15.01" y2="13" />
                <line x1="18" y1="11" x2="18.01" y2="11" />
                <rect x="2" y="6" width="20" height="12" rx="6" />
              </svg>
            </div>
            <div className="ingame-card-content">
              <span className="ingame-card-title">Mando &amp; Atajos</span>
              <span className="ingame-card-caption">Ver atajos y remapear</span>
            </div>
          </button>
        </div>

        {/* Footer pill button */}
        <div className="ingame-overlay-footer">
          <button
            type="button"
            className={`ingame-exit-button ${selectedCardIdx === 5 ? "active-focus" : ""}`}
            onClick={handleQuit}
            onMouseEnter={() => setSelectedCardIdx(5)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ingame-exit-icon"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Salir al Menú Principal</span>
          </button>
        </div>
      </div>

      {/* Visual Save Slots Modal */}
      {showSlotsPanel && (
        <div className="ingame-slots-modal-backdrop" onClick={() => setShowSlotsPanel(false)}>
          <div className="ingame-slots-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ingame-slots-header">
              <div>
                <h2>Ranuras de Guardado Visual</h2>
                <p>Guarda y carga partidas con captura de pantalla y fecha.</p>
              </div>
              <button
                type="button"
                className="ingame-controls-close-btn"
                onClick={() => setShowSlotsPanel(false)}
              >
                ✕
              </button>
            </div>

            <div className="ingame-slots-grid">
              {(slots.length > 0
                ? slots
                : ([1, 2, 3, 4, 5].map((s) => ({
                    slot: s,
                    has_save: false,
                    screenshot_path: null,
                    timestamp_str: null,
                  })) as SaveSlotInfo[])
              ).map((slotInfo) => {
                const s = slotInfo.slot;
                const hasSave = slotInfo.has_save;
                const shotPath = slotInfo.screenshot_path;
                const timeStr = slotInfo.timestamp_str;

                return (
                  <div key={s} className={`ingame-slot-card ${activeSlot === s ? "selected-slot" : ""}`}>
                    <div className="ingame-slot-card-thumb">
                      {shotPath ? (
                        <img src={convertFileSrc(shotPath)} alt={`Ranura ${s}`} />
                      ) : (
                        <div className="ingame-slot-empty">
                          <span>{hasSave ? "Partida guardada" : "Ranura Vacía"}</span>
                        </div>
                      )}
                      <span className="ingame-slot-card-num">Ranura {s}</span>
                    </div>

                    <div className="ingame-slot-card-info">
                      <span className="ingame-slot-timestamp">{timeStr || (hasSave ? "Guardado reciente" : "Sin partida")}</span>
                      <div className="ingame-slot-actions">
                        <button
                          type="button"
                          className="ingame-slot-btn save"
                          onClick={() => {
                            setActiveSlot(s);
                            handleSave(s);
                          }}
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          className="ingame-slot-btn load"
                          disabled={!hasSave}
                          onClick={() => {
                            setActiveSlot(s);
                            handleLoad(s);
                          }}
                        >
                          Cargar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hotkeys / Controls Quick Modal */}
      {showControlsModal && (
        <div className="ingame-controls-modal-backdrop" onClick={() => setShowControlsModal(false)}>
          <div className="ingame-controls-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ingame-controls-modal-header">
              <h2>Mando y Atajos de Teclado</h2>
              <button
                type="button"
                className="ingame-controls-close-btn"
                onClick={() => setShowControlsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="ingame-controls-grid">
              <div className="ingame-control-row">
                <span className="ingame-key-badge">Escape / Xbox Guide</span>
                <span>Pausar / Reanudar Juego y Menú Superpuesto</span>
              </div>
              <div className="ingame-control-row">
                <span className="ingame-key-badge">L3 + R3 / Back + Start</span>
                <span>Atajo en mando para Pausar / Reanudar Emulación</span>
              </div>
              <div className="ingame-control-row">
                <span className="ingame-key-badge">D-Pad / Flechas</span>
                <span>Navegar entre opciones del menú</span>
              </div>
              <div className="ingame-control-row">
                <span className="ingame-key-badge">Botón A / Enter</span>
                <span>Seleccionar y ejecutar acción</span>
              </div>
            </div>

            <div className="ingame-controls-action-box">
              <button
                type="button"
                className="ingame-open-mapping-btn"
                onClick={() => {
                  setShowControlsModal(false);
                  setShowMappingModal(true);
                }}
              >
                🎮 Personalizar Mapeo de Mando &amp; RetroPad
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Controller Mapping Modal */}
      <ControllerMappingModal
        isOpen={showMappingModal}
        onClose={() => setShowMappingModal(false)}
      />
    </div>
  );
}
