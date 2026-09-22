import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import {
  getCastNetworkInfo,
  discoverLanDevices,
  openWirelessDisplay,
  checkSunshineStatus,
  startSunshine,
  stopSunshine,
  downloadSunshinePortable,
  pairMoonlightPin,
  type CastNetworkInfo,
  type LanDevice,
  type SunshineStatus,
} from "../lib/tauri";
import { CastIcon, CloseIcon } from "./icons";
import "./CastModal.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CastModal({ isOpen, onClose }: Props) {
  const { t } = useTranslation();
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);
  const [networkInfo, setNetworkInfo] = useState<CastNetworkInfo | null>(null);
  const [devices, setDevices] = useState<LanDevice[]>([]);
  const [sunshineStatus, setSunshineStatus] = useState<SunshineStatus | null>(null);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [pin, setPin] = useState("");
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [downloadingSunshine, setDownloadingSunshine] = useState(false);
  const [togglingServer, setTogglingServer] = useState(false);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"devices" | "controller" | "help">("devices");

  useEffect(() => {
    if (!isOpen) return;

    // Cargar información de red
    getCastNetworkInfo()
      .then(setNetworkInfo)
      .catch((e) => console.error("Error al obtener red:", e));

    // Comprobar estado de Sunshine
    refreshSunshineStatus();

    // Escanear dispositivos
    scanDevices();

    // Escuchar Escape para cerrar
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const refreshSunshineStatus = async () => {
    try {
      const status = await checkSunshineStatus();
      setSunshineStatus(status);
    } catch (e) {
      console.error("Error Sunshine:", e);
    }
  };

  const scanDevices = async () => {
    setLoadingDevices(true);
    try {
      const devs = await discoverLanDevices();
      setDevices(devs);
    } catch (e) {
      console.error("Error escaneando dispositivos:", e);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleToggleServer = async () => {
    setTogglingServer(true);
    setServerMessage(null);
    try {
      if (sunshineStatus?.is_running) {
        const res = await stopSunshine();
        setServerMessage(res);
      } else {
        const res = await startSunshine();
        setServerMessage(res);
      }
      await refreshSunshineStatus();
    } catch (err: any) {
      setServerMessage(err?.toString() || "Error al cambiar estado del servidor");
    } finally {
      setTogglingServer(false);
    }
  };

  const handleDownloadSunshine = async () => {
    setDownloadingSunshine(true);
    setServerMessage(null);
    try {
      const res = await downloadSunshinePortable();
      setServerMessage(res);
      await refreshSunshineStatus();
    } catch (err: any) {
      setServerMessage(err?.toString() || "Error descargando Sunshine Portable");
    } finally {
      setDownloadingSunshine(false);
    }
  };

  const handlePairPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setPairing(true);
    setPinMessage(null);
    setPinError(null);

    try {
      const res = await pairMoonlightPin(pin.trim());
      setPinMessage(res);
      setPin("");
      await refreshSunshineStatus();
    } catch (err: any) {
      setPinError(err?.toString() || "Error al vincular PIN");
    } finally {
      setPairing(false);
    }
  };

  const handleOpenMiracast = async () => {
    try {
      await openWirelessDisplay();
    } catch (err: any) {
      alert(err?.toString() || "Error al iniciar proyección de Windows");
    }
  };

  const handleCopyIp = () => {
    if (networkInfo?.ip) {
      navigator.clipboard.writeText(networkInfo.ip);
      setCopiedIp(true);
      setTimeout(() => setCopiedIp(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cast-modal-backdrop" onClick={onClose}>
      <div
        className="cast-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("cast.title")}
        tabIndex={-1}
        ref={trapRef}
      >
        {/* Cabecera */}
        <header className="cast-modal-header">
          <div className="cast-modal-header-left">
            <div className="cast-modal-icon-badge">
              <CastIcon />
            </div>
            <div>
              <h2 className="cast-modal-title">{t("cast.title")}</h2>
              <p className="cast-modal-subtitle">
                {t("cast.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cast-modal-close-btn"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            <CloseIcon />
          </button>
        </header>

        {/* Barra de Estado de Red */}
        <div className="cast-network-bar">
          <div className="cast-network-item">
            <span className="cast-status-dot online" />
            <span className="cast-network-label">{t("cast.localNetwork")}</span>
            <span className="cast-network-value">{networkInfo?.hostname || "Detectando..."}</span>
          </div>

          <div className="cast-network-item cast-network-ip-item">
            <span className="cast-network-label">{t("cast.localIp")}</span>
            <span className="cast-network-code">{networkInfo?.ip || "127.0.0.1"}</span>
            <button
              type="button"
              className="cast-copy-ip-btn"
              onClick={handleCopyIp}
              title={t("common.copy")}
            >
              {copiedIp ? t("common.copied") : t("common.copy")}
            </button>
          </div>

          <button
            type="button"
            className="cast-rescan-btn"
            onClick={scanDevices}
            disabled={loadingDevices}
          >
            {loadingDevices ? t("cast.searching") : t("cast.searchDevices")}
          </button>
        </div>

        {/* Pestañas de navegación interna */}
        <div className="cast-tabs">
          <button
            type="button"
            className={`cast-tab-btn ${activeTab === "devices" ? "active" : ""}`}
            onClick={() => setActiveTab("devices")}
          >
            {t("cast.tabs.devices")}
          </button>
          <button
            type="button"
            className={`cast-tab-btn ${activeTab === "controller" ? "active" : ""}`}
            onClick={() => setActiveTab("controller")}
          >
            {t("cast.tabs.controller")}
          </button>
          <button
            type="button"
            className={`cast-tab-btn ${activeTab === "help" ? "active" : ""}`}
            onClick={() => setActiveTab("help")}
          >
            {t("cast.tabs.help")}
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="cast-modal-body">
          {activeTab === "devices" && (
            <div className="cast-devices-section">
              {/* Tarjeta Destacada: Streaming por Moonlight (Smart TVs, TV Sticks, Tablets y Celulares) */}
              <div className="cast-device-card featured">
                <div className="cast-device-card-header">
                  <div className="cast-device-icon-box stick">
                    <CastIcon />
                  </div>
                  <div className="cast-device-info">
                    <div className="cast-device-title-row">
                      <h3 className="cast-device-name">{t("cast.moonlightCard.title")}</h3>
                      <span className="cast-badge recommended">{t("cast.moonlightCard.badge")}</span>
                      {sunshineStatus?.is_running && (
                        <span className="cast-badge status-online">
                          {t("cast.moonlightCard.activeBadge")}
                        </span>
                      )}
                    </div>
                    <p className="cast-device-protocol">
                      {t("cast.moonlightCard.protocol")}
                    </p>
                  </div>
                </div>

                <div className="cast-device-body">
                  {/* Barra de control de servidor Sunshine Portable */}
                  <div className="cast-sunshine-control-bar">
                    <div className="cast-sunshine-status-info">
                      <span className={`cast-status-dot ${sunshineStatus?.is_running ? "online" : "offline"}`} />
                      <span className="cast-sunshine-status-text">
                        {sunshineStatus?.is_running
                          ? t("cast.moonlightCard.statusRunning")
                          : sunshineStatus?.is_installed
                          ? t("cast.moonlightCard.statusReady")
                          : t("cast.moonlightCard.statusNotInstalled")}
                      </span>
                    </div>

                    <div className="cast-sunshine-btns">
                      {sunshineStatus?.is_installed ? (
                        <button
                          type="button"
                          className={`cast-server-toggle-btn ${sunshineStatus?.is_running ? "stop" : "start"}`}
                          onClick={handleToggleServer}
                          disabled={togglingServer}
                        >
                          {togglingServer
                            ? "..."
                            : sunshineStatus?.is_running
                            ? t("cast.moonlightCard.btnStop")
                            : t("cast.moonlightCard.btnStart")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="cast-server-toggle-btn download"
                          onClick={handleDownloadSunshine}
                          disabled={downloadingSunshine}
                        >
                          {downloadingSunshine
                            ? "..."
                            : t("cast.moonlightCard.btnDownload")}
                        </button>
                      )}
                    </div>
                  </div>

                  {serverMessage && (
                    <div className="cast-server-toast">{serverMessage}</div>
                  )}

                  <div className="cast-steps-mini">
                    <div className="cast-step-item">
                      <span className="cast-step-num">1</span>
                      <span>
                        {t("cast.moonlightCard.step1")}
                      </span>
                    </div>
                    <div className="cast-step-item">
                      <span className="cast-step-num">2</span>
                      <span>
                        {t("cast.moonlightCard.step2", { ip: networkInfo?.ip || "tu IP" })}
                      </span>
                    </div>
                    <div className="cast-step-item">
                      <span className="cast-step-num">3</span>
                      <span>
                        {t("cast.moonlightCard.step3")}
                      </span>
                    </div>
                  </div>

                  {/* Formulario de PIN */}
                  <form className="cast-pin-form" onSubmit={handlePairPin}>
                    <input
                      type="text"
                      className="cast-pin-input"
                      placeholder="Ej: 1234"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                      disabled={pairing}
                    />
                    <button
                      type="submit"
                      className="cast-pin-submit-btn"
                      disabled={pairing || pin.trim().length !== 4}
                    >
                      {pairing ? t("cast.moonlightCard.pairing") : t("cast.moonlightCard.pairBtn")}
                    </button>
                  </form>

                  {pinMessage && <div className="cast-alert success">{pinMessage}</div>}
                  {pinError && <div className="cast-alert error">{pinError}</div>}
                </div>
              </div>

              {/* Tarjeta: Proyección inalámbrica universal (Miracast) */}
              <div className="cast-device-card">
                <div className="cast-device-card-header">
                  <div className="cast-device-icon-box tv">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                      <polyline points="17 2 12 7 7 2" />
                    </svg>
                  </div>
                  <div className="cast-device-info">
                    <div className="cast-device-title-row">
                      <h3 className="cast-device-name">{t("cast.miracastCard.title")}</h3>
                      <span className="cast-badge">{t("cast.miracastCard.badge")}</span>
                    </div>
                    <p className="cast-device-protocol">
                      {t("cast.miracastCard.protocol")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="cast-action-btn primary"
                    onClick={handleOpenMiracast}
                  >
                    {t("cast.miracastCard.btnProject")}
                  </button>
                </div>
              </div>

              {/* Dispositivos reales detectados en la red local */}
              <div className="cast-other-devices">
                <h4 className="cast-section-subhead">{t("cast.detectedDevices")}</h4>
                <div className="cast-devices-grid">
                  {devices.map((device) => (
                    <div key={device.id} className="cast-device-chip">
                      <span className="cast-chip-dot" />
                      <div className="cast-chip-info">
                        <span className="cast-chip-name">{device.name}</span>
                        <span className="cast-chip-ip">{device.ip} • {device.protocol}</span>
                      </div>
                    </div>
                  ))}
                  {devices.length === 0 && !loadingDevices && (
                    <div className="cast-empty-devices">
                      {t("cast.noDevices")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "controller" && (
            <div className="cast-controller-section">
              <div className="cast-card-box">
                <div className="cast-card-box-header">
                  <span className="cast-box-icon">🎮</span>
                  <h3>Jugar con el control conectado a tu PC</h3>
                </div>
                <p>
                  ¡Buenas noticias! Dado que tu control está conectado directamente a tu PC (por cable USB o adaptador inalámbrico de 2.4 GHz / Bluetooth):
                </p>
                <ul className="cast-feature-list">
                  <li><strong>0 ms de Input Lag:</strong> Tus botones responden inmediatamente en la computadora mientras tú miras cómodamente la pantalla de tu televisor.</li>
                  <li><strong>Sin configuraciones adicionales:</strong> No necesitas configurar mandos en el Xiaomi Stick ni en el Fire TV.</li>
                  <li><strong>Alcance recomendado:</strong> Si la habitación está a menos de 8 metros de la PC, la señal del joystick llegará de forma impecable.</li>
                </ul>
              </div>

              <div className="cast-card-box secondary">
                <div className="cast-card-box-header">
                  <span className="cast-box-icon">📶</span>
                  <h3>¿Y si juegas desde más lejos?</h3>
                </div>
                <p>
                  Si las paredes de tu casa debilitan la señal del joystick, puedes conectar cualquier control Bluetooth (Xbox, PlayStation, 8BitDo o genérico) <strong>directamente a tu Xiaomi TV Stick o Fire TV Stick</strong>. Moonlight enviará las órdenes del mando a NewGamePlus automáticamente a través de la red Wi-Fi.
                </p>
              </div>
            </div>
          )}

          {activeTab === "help" && (
            <div className="cast-help-section">
              <div className="cast-card-box">
                <h3>Preguntas Frecuentes sobre Transmisión</h3>
                <div className="cast-faq-item">
                  <h4>¿Qué resolución y tasa de refresco obtendré?</h4>
                  <p>Hasta 1080p o 4K a 60 FPS fluidos con decodificación por hardware de tu placa de video.</p>
                </div>
                <div className="cast-faq-item">
                  <h4>¿Por qué usar Moonlight + Sunshine Portable?</h4>
                  <p>
                    Moonlight y Sunshine utilizan el protocolo de streaming en tiempo real más rápido del mundo, con menos de 15 ms de retraso. Como es portable, vive dentro de la carpeta de NewGamePlus y no ensucia tu instalación de Windows.
                  </p>
                </div>
                <div className="cast-faq-item">
                  <h4>Panel web local de Sunshine</h4>
                  <p>
                    Si alguna vez deseas ver estadísticas avanzadas o gestionar clientes vinculados, puedes abrir{" "}
                    <a href="https://localhost:47990" target="_blank" rel="noreferrer">
                      https://localhost:47990
                    </a> con el servidor encendido.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <footer className="cast-modal-footer">
          <div className="cast-footer-tip">
            💡 <span>{t("cast.footerTip")}</span>
          </div>
          <button type="button" className="cast-modal-done-btn" onClick={onClose}>
            {t("common.understood")}
          </button>
        </footer>
      </div>
    </div>
  );
}
