import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Game } from "../types";
import "./NetplayModal.css";

interface NetplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
  coreName: string;
  onNetplayStarted?: (isHost: boolean) => void;
}

export default function NetplayModal({
  isOpen,
  onClose,
  game,
  coreName,
  onNetplayStarted,
}: NetplayModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [sessionId, setSessionId] = useState("");
  const [address, setAddress] = useState("");
  const [port, setPort] = useState(59123);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<{
    isHost: boolean;
    sessionId: string;
    address: string;
    port: number;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const copyToClipboard = async (text: string, field?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (field) {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } else {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleCopyInvite = () => {
    if (!sessionInfo) return;
    const gameTitle = game?.display_name || game?.name || "";
    const header = gameTitle ? `🎮 GameFlix Netplay - ${gameTitle}` : "🎮 GameFlix Netplay";
    const inviteText = `${header}
• ID de Sala: ${sessionInfo.sessionId}
• IP: ${sessionInfo.address}
• Puerto: ${sessionInfo.port}`;
    copyToClipboard(inviteText);
  };

  useEffect(() => {
    if (isOpen) {
      setMode("create");
      setSessionId("");
      setAddress("");
      setPort(59123);
      setError(null);
      setSessionInfo(null);
      setCopiedField(null);
      setCopiedAll(false);
    }
  }, [isOpen]);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { netplayCreateRoom } = await import("../lib/tauri");
      const session = await netplayCreateRoom(coreName, game.rom_path, port);
      setSessionInfo({
        isHost: true,
        sessionId: session.session_id,
        address: session.address,
        port: session.port,
      });
      onNetplayStarted?.(true);
    } catch (e: unknown) {
      setError(t("netplay.errorLaunch", { error: String(e) }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!address.trim() || !sessionId.trim()) {
      setError("Por favor ingresa la dirección IP y el ID de la sala");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { netplayJoinRoom } = await import("../lib/tauri");
      const session = await netplayJoinRoom(coreName, game.rom_path, address, port, sessionId);
      setSessionInfo({
        isHost: false,
        sessionId: session.session_id,
        address: session.address,
        port: session.port,
      });
      onNetplayStarted?.(false);
    } catch (e: unknown) {
      setError(t("netplay.errorLaunch", { error: String(e) }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopNetplay = async () => {
    setIsLoading(true);
    try {
      const { netplayStop } = await import("../lib/tauri");
      await netplayStop();
      setSessionInfo(null);
    } catch (e: unknown) {
      console.error("Error stopping netplay:", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-netplay"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("netplay.title")}
      >
        <div className="modal-header">
          <h2>{t("netplay.title")}</h2>
          <button className="modal-close" onClick={onClose} aria-label={t("common.close")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {sessionInfo ? (
          <div className="modal-body netplay-active">
            <div className="netplay-status">
              <span className={`status-indicator ${sessionInfo.isHost ? "host" : "client"}`} />
              <span>{t(sessionInfo.isHost ? "netplay.waitingPlayers" : "netplay.connected")}</span>
            </div>

            <div className="netplay-info-grid">
              <div className="info-item">
                <label>{t("netplay.sessionId")}</label>
                <div
                  className="info-value-box"
                  onClick={() => copyToClipboard(sessionInfo.sessionId, "sessionId")}
                  title={t("netplay.copyValue", "Copiar")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      copyToClipboard(sessionInfo.sessionId, "sessionId");
                    }
                  }}
                >
                  <code>{sessionInfo.sessionId}</code>
                  <span className={`info-copy-btn ${copiedField === "sessionId" ? "copied" : ""}`}>
                    {copiedField === "sessionId" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </span>
                </div>
              </div>

              <div className="info-item">
                <label>{t("netplay.address")}</label>
                <div
                  className="info-value-box"
                  onClick={() => copyToClipboard(sessionInfo.address, "address")}
                  title={t("netplay.copyValue", "Copiar")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      copyToClipboard(sessionInfo.address, "address");
                    }
                  }}
                >
                  <code>{sessionInfo.address}</code>
                  <span className={`info-copy-btn ${copiedField === "address" ? "copied" : ""}`}>
                    {copiedField === "address" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </span>
                </div>
              </div>

              <div className="info-item">
                <label>{t("netplay.port")}</label>
                <div
                  className="info-value-box"
                  onClick={() => copyToClipboard(String(sessionInfo.port), "port")}
                  title={t("netplay.copyValue", "Copiar")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      copyToClipboard(String(sessionInfo.port), "port");
                    }
                  }}
                >
                  <code>{sessionInfo.port}</code>
                  <span className={`info-copy-btn ${copiedField === "port" ? "copied" : ""}`}>
                    {copiedField === "port" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {sessionInfo.isHost && (
              <p className="netplay-hint">{t("netplay.sessionCreated")}</p>
            )}

            {!sessionInfo.isHost && (
              <p className="netplay-hint">{t("netplay.sessionJoined", { sessionId: sessionInfo.sessionId })}</p>
            )}

            <div className="modal-actions netplay-active-actions">
              <button
                type="button"
                className={`modal-btn modal-btn-copy ${copiedAll ? "copied" : ""}`}
                onClick={handleCopyInvite}
                title={t("netplay.copyInvite")}
              >
                {copiedAll ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>{t("netplay.copied")}</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>{t("netplay.copyInvite")}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="modal-btn modal-btn-danger"
                onClick={handleStopNetplay}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="modal-btn-spinner" />
                    <span>{t("common.loading")}</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                    <span>{t("netplay.stop")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="modal-body">
            <div className="netplay-mode-tabs">
              <button
                type="button"
                className={`netplay-tab ${mode === "create" ? "active" : ""}`}
                onClick={() => setMode("create")}
              >
                {t("netplay.createRoom")}
              </button>
              <button
                type="button"
                className={`netplay-tab ${mode === "join" ? "active" : ""}`}
                onClick={() => setMode("join")}
              >
                {t("netplay.joinRoom")}
              </button>
            </div>

            {mode === "create" && (
              <div className="netplay-form">
                <div className="form-group">
                  <label htmlFor="netplay-port">{t("netplay.port")}</label>
                  <input
                    id="netplay-port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Math.max(1, Math.min(65535, parseInt(e.target.value) || 59123)))}
                    min="1"
                    max="65535"
                    placeholder={t("netplay.portPlaceholder")}
                  />
                </div>
                <div className="form-group">
                  <label>{t("netplay.core")}</label>
                  <code>{coreName}</code>
                </div>

                {error && <div className="netplay-error">{error}</div>}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-btn modal-btn-primary"
                    onClick={handleCreateRoom}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="modal-btn-spinner" />
                        <span>{t("common.loading")}</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        <span>{t("netplay.create")}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="modal-btn modal-btn-secondary"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {t("netplay.cancel")}
                  </button>
                </div>
              </div>
            )}

            {mode === "join" && (
              <div className="netplay-form">
                <div className="form-group">
                  <label htmlFor="netplay-address">{t("netplay.address")}</label>
                  <input
                    id="netplay-address"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("netplay.addressPlaceholder")}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="netplay-session-id">{t("netplay.sessionId")}</label>
                  <input
                    id="netplay-session-id"
                    type="text"
                    value={sessionId}
                    onChange={(e) => setSessionId(e.target.value)}
                    placeholder={t("netplay.sessionIdPlaceholder")}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="netplay-port-join">{t("netplay.port")}</label>
                  <input
                    id="netplay-port-join"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(Math.max(1, Math.min(65535, parseInt(e.target.value) || 59123)))}
                    min="1"
                    max="65535"
                    placeholder={t("netplay.portPlaceholder")}
                  />
                </div>
                <div className="form-group">
                  <label>{t("netplay.core")}</label>
                  <code>{coreName}</code>
                </div>

                {error && <div className="netplay-error">{error}</div>}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-btn modal-btn-primary"
                    onClick={handleJoinRoom}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="modal-btn-spinner" />
                        <span>{t("common.loading")}</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21l-7-7 7-7" />
                          <path d="M9 21h10v-10" />
                        </svg>
                        <span>{t("netplay.join")}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="modal-btn modal-btn-secondary"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {t("netplay.cancel")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}