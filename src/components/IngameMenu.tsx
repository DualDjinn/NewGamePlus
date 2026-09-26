import React, { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  runningGame,
  listSlots,
  saveSlot,
  loadSlot,
  deleteSlot,
  ingameContinue,
  ingameQuit,
  ingameVolume,
  ingameMute,
  type SaveSlot,
  type RunningGameInfo,
} from "../lib/tauri";
import "./IngameMenu.css";

/** Helper to identify platform name from ROM path */
function getPlatformInfo(romPath?: string): { name: string; tag: string } {
  if (!romPath) return { name: "RetroArch", tag: "RETRO" };
  const lower = romPath.toLowerCase().replace(/\\/g, "/");

  if (lower.includes("/nds/") || lower.endsWith(".nds")) {
    return { name: "Nintendo DS", tag: "NDS" };
  }
  if (lower.includes("/gba/") || lower.endsWith(".gba")) {
    return { name: "Game Boy Advance", tag: "GBA" };
  }
  if (lower.includes("/gbc/") || lower.endsWith(".gbc")) {
    return { name: "Game Boy Color", tag: "GBC" };
  }
  if (lower.includes("/gb/") || lower.endsWith(".gb")) {
    return { name: "Game Boy", tag: "GB" };
  }
  if (lower.includes("/snes/") || lower.endsWith(".sfc") || lower.endsWith(".smc")) {
    return { name: "Super Nintendo", tag: "SNES" };
  }
  if (lower.includes("/nes/") || lower.endsWith(".nes")) {
    return { name: "NES", tag: "NES" };
  }
  if (lower.includes("/n64/") || lower.endsWith(".z64") || lower.endsWith(".n64")) {
    return { name: "Nintendo 64", tag: "N64" };
  }
  if (
    lower.includes("/psx/") ||
    lower.includes("/ps1/") ||
    lower.endsWith(".cue") ||
    lower.endsWith(".chd") ||
    lower.endsWith(".pbp")
  ) {
    return { name: "PlayStation", tag: "PS1" };
  }
  if (lower.includes("/ps2/") || lower.endsWith(".iso")) {
    return { name: "PlayStation 2", tag: "PS2" };
  }
  if (lower.includes("/psp/") || lower.endsWith(".cso")) {
    return { name: "PSP", tag: "PSP" };
  }
  if (
    lower.includes("/megadrive/") ||
    lower.includes("/genesis/") ||
    lower.endsWith(".md") ||
    lower.endsWith(".gen")
  ) {
    return { name: "Sega Genesis", tag: "GENESIS" };
  }
  if (lower.includes("/arcade/") || lower.includes("/mame/") || lower.includes("/fbneo/")) {
    return { name: "Arcade", tag: "ARCADE" };
  }
  if (lower.includes("/gamecube/") || lower.includes("/gc/")) {
    return { name: "GameCube", tag: "GAMECUBE" };
  }
  if (lower.includes("/dreamcast/") || lower.endsWith(".cdi") || lower.endsWith(".gdi")) {
    return { name: "Dreamcast", tag: "DC" };
  }
  return { name: "RetroArch", tag: "RETRO" };
}

/** Format timestamp to a human-friendly relative or calendar date */
function formatSlotDate(timestampSecs: number): string {
  if (!timestampSecs) return "";
  const d = new Date(timestampSecs * 1000);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Hoy ${timeStr}`;
  if (isYesterday) return `Ayer ${timeStr}`;
  return `${d.toLocaleDateString([], { day: "2-digit", month: "2-digit" })} ${timeStr}`;
}

/** Format file size in KB or MB */
function formatSlotSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

export const IngameMenu: React.FC = () => {
  const [game, setGame] = useState<RunningGameInfo | null>(null);
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [focusedSlot, setFocusedSlot] = useState<number>(1);
  const [confirmOverwriteSlot, setConfirmOverwriteSlot] = useState<number | null>(null);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<number | null>(null);
  const [confirmQuit, setConfirmQuit] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [status, setStatus] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const prevVolRef = useRef<number>(80);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSessionTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    const secs = totalSec % 60;
    return `${minutes}m ${secs < 10 ? `0${secs}` : secs}s`;
  };

  const showStatus = useCallback(
    (text: string, type: "success" | "error" | "info" = "info", duration = 3500) => {
      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current);
      }
      setStatus({ type, text });
      statusTimerRef.current = setTimeout(() => {
        setStatus(null);
      }, duration);
    },
    [],
  );

  const refreshData = useCallback(async () => {
    try {
      const activeGame = await runningGame();
      setGame(activeGame);
      if (activeGame) {
        const loadedSlots = await listSlots(activeGame.game_id);
        setSlots(loadedSlots);
      }
    } catch (err) {
      console.error("Error refreshing in-game data:", err);
    }
  }, []);

  // Listen to focus changes (when F9 shows and focuses the window)
  useEffect(() => {
    refreshData();

    const appWindow = getCurrentWindow();
    const unlistenFocus = appWindow.onFocusChanged((focused) => {
      if (focused.payload) {
        refreshData();
        setBusy(false);
        setBusySlot(null);
        setConfirmOverwriteSlot(null);
        setConfirmDeleteSlot(null);
        setConfirmQuit(false);
      }
    });

    return () => {
      unlistenFocus.then((fn) => fn());
    };
  }, [refreshData]);

  const handleContinue = async () => {
    try {
      await ingameContinue();
      try {
        await getCurrentWindow().hide();
      } catch {}
    } catch (err) {
      console.error("Error continuing game:", err);
    }
  };

  // Keyboard navigation & global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Priority 1: Dismiss open confirmation modals/popovers
      if (e.key === "Escape") {
        e.preventDefault();
        if (confirmQuit) {
          setConfirmQuit(false);
          return;
        }
        if (confirmOverwriteSlot !== null) {
          setConfirmOverwriteSlot(null);
          return;
        }
        if (confirmDeleteSlot !== null) {
          setConfirmDeleteSlot(null);
          return;
        }
        handleContinue();
        return;
      }

      if (e.key === "F9") {
        e.preventDefault();
        handleContinue();
        return;
      }

      // Slot navigation with Arrow keys
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedSlot((prev) => (prev > 1 ? prev - 1 : 5));
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedSlot((prev) => (prev < 5 ? prev + 1 : 1));
        return;
      }

      // Quick slot jump with numbers 1..5
      if (["1", "2", "3", "4", "5"].includes(e.key)) {
        setFocusedSlot(parseInt(e.key, 10));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmQuit, confirmOverwriteSlot, confirmDeleteSlot]);

  // Save to specific slot
  const handleSaveToSlot = async (slotNum: number) => {
    if (busy || !game) return;
    setBusy(true);
    setBusySlot(slotNum);
    showStatus(`Guardando partida en Ranura ${slotNum}...`, "info", 5000);
    try {
      await saveSlot(slotNum);
      await refreshData();
      setConfirmOverwriteSlot(null);
      showStatus(`✓ Partida guardada con éxito en Ranura ${slotNum}`, "success");
    } catch (err: any) {
      showStatus(`✕ Error al guardar: ${err?.toString() || err}`, "error");
    } finally {
      setBusy(false);
      setBusySlot(null);
    }
  };

  // Load from specific slot and immediately resume game
  const handleLoadSlot = async (slotNum: number, file: string) => {
    if (busy || !game) return;
    setBusy(true);
    setBusySlot(slotNum);
    try {
      await loadSlot(game.game_id, file);
      // Immediately resume game and close the pause overlay
      await ingameContinue();
      try {
        await getCurrentWindow().hide();
      } catch {}
    } catch (err: any) {
      showStatus(`✕ Error al cargar: ${err?.toString() || err}`, "error");
    } finally {
      setBusy(false);
      setBusySlot(null);
    }
  };

  // Delete specific slot
  const handleDeleteSlot = async (slotNum: number, file: string) => {
    if (busy || !game) return;
    setBusy(true);
    try {
      await deleteSlot(game.game_id, file);
      await refreshData();
      setConfirmDeleteSlot(null);
      showStatus(`✓ Partida de la Ranura ${slotNum} eliminada`, "info");
    } catch (err: any) {
      showStatus(`✕ Error al eliminar: ${err?.toString() || err}`, "error");
    } finally {
      setBusy(false);
      setBusySlot(null);
    }
  };

  // Audio slider
  const handleVolumeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    const prevVol = prevVolRef.current;
    setVolume(newVol);

    const diff = newVol - prevVol;
    const steps = Math.trunc(diff / 2);
    if (steps !== 0) {
      prevVolRef.current = newVol;
      try {
        await ingameVolume(steps);
      } catch (err) {
        console.error("Error setting volume:", err);
      }
    }
  };

  // Audio mute toggle
  const handleToggleMute = async () => {
    try {
      await ingameMute();
      setIsMuted((m) => !m);
    } catch (err) {
      console.error("Error toggling mute:", err);
    }
  };

  // Quit game cleanly
  const handleQuitGame = async () => {
    if (busy) return;
    setBusy(true);
    showStatus("Cerrando emulador de manera limpia...", "info", 5000);
    try {
      await ingameQuit();
    } catch (err) {
      console.error("Error quitting in-game:", err);
    } finally {
      setBusy(false);
    }
  };

  const platform = getPlatformInfo(game?.rom_path);
  const allSlots = [1, 2, 3, 4, 5];

  return (
    <div className="ingame-backdrop">
      <div className="ingame-panel">
        {/* Top Header */}
        <header className="ingame-header">
          <div className="ingame-header-info">
            <h1 className="ingame-game-title" title={game?.game_name || "Juego en ejecución"}>
              {game?.game_name || "Juego en ejecución"}
            </h1>
            <div className="ingame-header-meta">
              <span className="ingame-platform-badge">{platform.name}</span>
              <span className="ingame-session-time">
                <svg
                  className="ingame-clock-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {formatSessionTime(sessionSeconds)}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="ingame-btn-resume"
            onClick={handleContinue}
            title="Volver a la partida (ESC / F9)"
          >
            <span className="ingame-resume-icon">▶</span>
            <span>Continuar</span>
            <span className="ingame-resume-key">ESC / F9</span>
          </button>
        </header>

        {/* Status notification toast */}
        {status && (
          <div className={`ingame-status-banner ${status.type}`}>
            <span className="ingame-status-dot" />
            <span>{status.text}</span>
          </div>
        )}

        {/* Unified 5-Slot Carousel / Grid */}
        <main className="ingame-body">
          <div className="ingame-slots-header">
            <h2 className="ingame-slots-title">Ranuras de Guardado</h2>
            <span className="ingame-slots-subtitle">
              Selecciona una ranura para guardar o cargar al instante
            </span>
          </div>

          <div className="ingame-slots-grid" role="region" aria-label="Ranuras de guardado">
            {allSlots.map((num) => {
              const fileName = `slot_${num}.state`;
              const slotData = slots.find((s) => s.file === fileName);
              const hasSave = !!slotData;
              const isFocused = focusedSlot === num;
              const isSlotBusy = busy && busySlot === num;
              const isOverwriting = confirmOverwriteSlot === num;
              const isDeleting = confirmDeleteSlot === num;

              return (
                <div
                  key={num}
                  className={`igm-slot-card ${hasSave ? "occupied" : "empty"} ${
                    isFocused ? "focused" : ""
                  } ${isSlotBusy ? "busy" : ""}`}
                  onClick={() => setFocusedSlot(num)}
                  role="group"
                  aria-label={`Ranura ${num}`}
                >
                  {/* Card Top Pill Badge */}
                  <div className="igm-card-header">
                    <span className="igm-slot-badge">{num}</span>
                    {hasSave && !isDeleting && (
                      <button
                        type="button"
                        className="igm-btn-trash"
                        title={`Eliminar guardado de ranura ${num}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteSlot(num);
                        }}
                        disabled={busy}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Thumbnail / Empty State Zone */}
                  <div className="igm-thumb-area">
                    {hasSave ? (
                      slotData?.thumbnail ? (
                        <img
                          src={slotData.thumbnail}
                          alt={`Captura de Ranura ${num}`}
                          className="igm-thumb-img"
                          loading="lazy"
                        />
                      ) : (
                        <div className="igm-thumb-fallback">
                          <span className="igm-fallback-icon">🎮</span>
                          <span className="igm-fallback-text">Partida guardada</span>
                        </div>
                      )
                    ) : (
                      <div className="igm-empty-dashbox">
                        <span className="igm-empty-icon">+</span>
                        <span className="igm-empty-text">Ranura libre</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata Row */}
                  <div className="igm-meta-row">
                    {hasSave ? (
                      <>
                        <span className="igm-meta-date" title={slotData.modified ? new Date(slotData.modified * 1000).toLocaleString() : ""}>
                          {formatSlotDate(slotData.modified)}
                        </span>
                        <span className="igm-meta-size">{formatSlotSize(slotData.size)}</span>
                      </>
                    ) : (
                      <span className="igm-meta-available">Espacio disponible</span>
                    )}
                  </div>

                  {/* Action Buttons Zone */}
                  <div className="igm-actions-zone" onClick={(e) => e.stopPropagation()}>
                    {/* Empty Slot: One-click Save */}
                    {!hasSave && (
                      <button
                        type="button"
                        className="igm-btn-save-here"
                        onClick={() => handleSaveToSlot(num)}
                        disabled={busy}
                      >
                        {isSlotBusy ? (
                          <span className="igm-spinner-label">Guardando...</span>
                        ) : (
                          <>
                            <span className="igm-plus-symbol">+</span>
                            <span>Guardar aquí</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Occupied Slot: Load, Overwrite, or Inline Confirmation */}
                    {hasSave && !isOverwriting && !isDeleting && (
                      <div className="igm-action-buttons">
                        <button
                          type="button"
                          className="igm-btn-load"
                          onClick={() => handleLoadSlot(num, fileName)}
                          disabled={busy}
                          title={`Cargar y reanudar Ranura ${num}`}
                        >
                          {isSlotBusy ? (
                            <span className="igm-spinner-label">Cargando...</span>
                          ) : (
                            <>
                              <span className="igm-load-bolt">⚡</span>
                              <span>Cargar</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="igm-btn-overwrite"
                          onClick={() => setConfirmOverwriteSlot(num)}
                          disabled={busy}
                          title={`Sobrescribir Ranura ${num} con el estado actual`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                            <polyline points="17 21 17 13 7 13 7 21" />
                            <polyline points="7 3 7 8 15 8" />
                          </svg>
                          <span>Sobrescribir</span>
                        </button>
                      </div>
                    )}

                    {/* Inline Confirm Overwrite */}
                    {isOverwriting && (
                      <div className="igm-confirm-box overwrite">
                        <span className="igm-confirm-msg">¿Sobrescribir?</span>
                        <div className="igm-confirm-buttons">
                          <button
                            type="button"
                            className="igm-btn-confirm-yes"
                            onClick={() => handleSaveToSlot(num)}
                            disabled={busy}
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            className="igm-btn-confirm-no"
                            onClick={() => setConfirmOverwriteSlot(null)}
                            disabled={busy}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Inline Confirm Delete */}
                    {isDeleting && (
                      <div className="igm-confirm-box delete">
                        <span className="igm-confirm-msg">¿Eliminar guardado?</span>
                        <div className="igm-confirm-buttons">
                          <button
                            type="button"
                            className="igm-btn-confirm-delete"
                            onClick={() => handleDeleteSlot(num, fileName)}
                            disabled={busy}
                          >
                            Eliminar
                          </button>
                          <button
                            type="button"
                            className="igm-btn-confirm-no"
                            onClick={() => setConfirmDeleteSlot(null)}
                            disabled={busy}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Bottom Dock: Audio + Controller Legend + Quit */}
        <footer className="ingame-dock">
          {/* Audio Slider & Mute Toggle */}
          <div className="ingame-dock-audio">
            <button
              type="button"
              className={`ingame-dock-mute-btn ${isMuted ? "muted" : ""}`}
              onClick={handleToggleMute}
              title={isMuted ? "Activar sonido" : "Silenciar"}
              disabled={busy}
            >
              {isMuted ? (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="ingame-dock-slider"
              disabled={busy}
              aria-label="Volumen del juego"
            />
            <span className="ingame-dock-volume-val">{volume}%</span>
          </div>

          {/* Controller / Keyboard Legend */}
          <div className="ingame-dock-hints">
            <span className="ingame-dock-pill">
              <kbd>A</kbd> / <kbd>Enter</kbd> Seleccionar
            </span>
            <span className="ingame-dock-pill">
              <kbd>←</kbd> <kbd>→</kbd> Ranuras
            </span>
            <span className="ingame-dock-pill">
              <kbd>B</kbd> / <kbd>F9</kbd> Continuar
            </span>
          </div>

          {/* Clean Quit Game Action */}
          <div className="ingame-dock-quit-wrap">
            {confirmQuit ? (
              <div className="ingame-quit-confirm-inline">
                <span className="ingame-quit-confirm-text">¿Salir al menú?</span>
                <button
                  type="button"
                  className="ingame-btn-quit-confirm"
                  onClick={handleQuitGame}
                  disabled={busy}
                >
                  Sí, salir
                </button>
                <button
                  type="button"
                  className="ingame-btn-quit-cancel"
                  onClick={() => setConfirmQuit(false)}
                  disabled={busy}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="ingame-btn-dock-quit"
                onClick={() => setConfirmQuit(true)}
                disabled={busy}
                title="Cerrar juego y volver a la biblioteca"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <line x1="12" y1="2" x2="12" y2="12" />
                </svg>
                <span>Salir al Menú</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default IngameMenu;
