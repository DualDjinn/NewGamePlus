import { useState, useEffect } from "react";
import {
  getCastNetworkInfo,
  discoverLanDevices,
  openWirelessDisplay,
  checkSunshineStatus,
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
  const [networkInfo, setNetworkInfo] = useState<CastNetworkInfo | null>(null);
  const [devices, setDevices] = useState<LanDevice[]>([]);
  const [sunshineStatus, setSunshineStatus] = useState<SunshineStatus | null>(null);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [pin, setPin] = useState("");
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);
  const [activeTab, setActiveTab] = useState<"devices" | "controller" | "help">("devices");

  useEffect(() => {
    if (!isOpen) return;

    // Cargar información de red
    getCastNetworkInfo()
      .then(setNetworkInfo)
      .catch((e) => console.error("Error al obtener red:", e));

    // Comprobar estado de Sunshine
    checkSunshineStatus()
      .then(setSunshineStatus)
      .catch((e) => console.error("Error Sunshine:", e));

    // Escanear dispositivos
    scanDevices();

    // Escuchar Escape para cerrar
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

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
    <div className="cast-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="cast-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <header className="cast-modal-header">
          <div className="cast-modal-header-left">
            <div className="cast-modal-icon-badge">
              <CastIcon />
            </div>
            <div>
              <h2 className="cast-modal-title">Transmitir a Dispositivo</h2>
              <p className="cast-modal-subtitle">
                Juega en tu Smart TV, Xiaomi TV Stick o Fire TV con baja latencia
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cast-modal-close-btn"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Barra de Estado de Red */}
        <div className="cast-network-bar">
          <div className="cast-network-item">
            <span className="cast-status-dot online" />
            <span className="cast-network-label">Red Local:</span>
            <span className="cast-network-value">{networkInfo?.hostname || "Detectando..."}</span>
          </div>

          <div className="cast-network-item cast-network-ip-item">
            <span className="cast-network-label">Tu IP Local:</span>
            <span className="cast-network-code">{networkInfo?.ip || "127.0.0.1"}</span>
            <button
              type="button"
              className="cast-copy-ip-btn"
              onClick={handleCopyIp}
              title="Copiar dirección IP"
            >
              {copiedIp ? "¡Copiada!" : "Copiar"}
            </button>
          </div>

          <button
            type="button"
            className="cast-rescan-btn"
            onClick={scanDevices}
            disabled={loadingDevices}
          >
            {loadingDevices ? "Buscando..." : "Buscar dispositivos"}
          </button>
        </div>

        {/* Pestañas de navegación interna */}
        <div className="cast-tabs">
          <button
            type="button"
            className={`cast-tab-btn ${activeTab === "devices" ? "active" : ""}`}
            onClick={() => setActiveTab("devices")}
          >
            📺 Dispositivos y Televisores
          </button>
          <button
            type="button"
            className={`cast-tab-btn ${activeTab === "controller" ? "active" : ""}`}
            onClick={() => setActiveTab("controller")}
          >
            🎮 Control y Latencia
          </button>
          <button
            type="button"
            className={`cast-tab-btn ${activeTab === "help" ? "active" : ""}`}
            onClick={() => setActiveTab("help")}
          >
            💡 Guía de Configuración
          </button>
        </div>

        {/* Contenido según pestaña */}
        <div className="cast-modal-body">
          {activeTab === "devices" && (
            <div className="cast-devices-section">
              {/* Tarjeta Destacada: Xiaomi TV Stick & Fire TV Stick (Moonlight) */}
              <div className="cast-device-card featured">
                <div className="cast-device-card-header">
                  <div className="cast-device-icon-box stick">
                    <CastIcon />
                  </div>
                  <div className="cast-device-info">
                    <div className="cast-device-title-row">
                      <h3 className="cast-device-name">Xiaomi TV Stick & Amazon Fire TV</h3>
                      <span className="cast-badge recommended">Recomendado (60 FPS)</span>
                      {sunshineStatus?.is_running && (
                        <span className="cast-badge" style={{ background: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7" }}>
                          ● Host Activo
                        </span>
                      )}
                    </div>
                    <p className="cast-device-protocol">
                      Modo Ultra-Low Latency con <strong>Moonlight Game Streaming</strong>
                    </p>
                  </div>
                </div>

                <div className="cast-device-body">
                  <div className="cast-steps-mini">
                    <div className="cast-step-item">
                      <span className="cast-step-num">1</span>
                      <span>Instala <strong>Moonlight</strong> gratis en tu Stick (Play Store / Amazon Appstore).</span>
                    </div>
                    <div className="cast-step-item">
                      <span className="cast-step-num">2</span>
                      <span>Abre Moonlight en la tele; detectará tu PC (<strong>{networkInfo?.ip || "tu IP"}</strong>) y te mostrará un <strong>PIN de 4 dígitos</strong>.</span>
                    </div>
                    <div className="cast-step-item">
                      <span className="cast-step-num">3</span>
                      <span>Ingresa ese PIN aquí abajo para vincular tu televisor en 1 segundo:</span>
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
                      {pairing ? "Vinculando..." : "Vincular Dispositivo"}
                    </button>
                  </form>

                  {pinMessage && <div className="cast-alert success">{pinMessage}</div>}
                  {pinError && <div className="cast-alert error">{pinError}</div>}
                </div>
              </div>

              {/* Tarjeta: LG UHD TV 4K (Miracast / Conexión Directa) */}
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
                      <h3 className="cast-device-name">LG UHD 4K TV (webOS)</h3>
                      <span className="cast-badge">Miracast Directo</span>
                    </div>
                    <p className="cast-device-protocol">
                      Proyección inalámbrica nativa de Windows (Sin necesidad de instalar apps)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="cast-action-btn primary"
                    onClick={handleOpenMiracast}
                  >
                    Proyectar a TV
                  </button>
                </div>
              </div>

              {/* Otros dispositivos detectados */}
              <div className="cast-other-devices">
                <h4 className="cast-section-subhead">Otros dispositivos activos en tu red Wi-Fi:</h4>
                <div className="cast-devices-grid">
                  {devices
                    .filter((d) => !d.id.startsWith("preset-"))
                    .map((device) => (
                      <div key={device.id} className="cast-device-chip">
                        <span className="cast-chip-dot" />
                        <div className="cast-chip-info">
                          <span className="cast-chip-name">{device.name}</span>
                          <span className="cast-chip-ip">{device.ip} • {device.protocol}</span>
                        </div>
                      </div>
                    ))}
                  {devices.filter((d) => !d.id.startsWith("preset-")).length === 0 && !loadingDevices && (
                    <div className="cast-empty-devices">
                      No se detectaron otros receptores adicionales en este escaneo.
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
                  <p>Hasta 1080p o 4K a 60 FPS fluidos con decodificación por hardware.</p>
                </div>
                <div className="cast-faq-item">
                  <h4>¿Por qué usar Moonlight en lugar de Google Cast / Chromecast?</h4>
                  <p>
                    Chromecast normal añade entre 2 y 4 segundos de retraso obligatorio. Moonlight utiliza streaming en tiempo real diseñado específicamente para videojuegos, con menos de 15 ms de latencia.
                  </p>
                </div>
                <div className="cast-faq-item">
                  <h4>Servidor Sunshine</h4>
                  <p>
                    Para transmitir con Moonlight, tu PC ejecuta o interactúa con el protocolo Sunshine. Si necesitas acceder a su panel avanzado, puedes abrir{" "}
                    <a href="https://localhost:47990" target="_blank" rel="noreferrer">
                      https://localhost:47990
                    </a>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <footer className="cast-modal-footer">
          <div className="cast-footer-tip">
            💡 <span>Tip: Mantén tu PC conectada a tu red Wi-Fi de 5 GHz o por cable Ethernet para máxima estabilidad visual.</span>
          </div>
          <button type="button" className="cast-modal-done-btn" onClick={onClose}>
            Entendido
          </button>
        </footer>
      </div>
    </div>
  );
}
