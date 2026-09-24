import { useState, useEffect, useRef } from "react";
import type { ControllerMapping } from "../types";
import { getControllerMapping, saveControllerMapping } from "../lib/tauri";
import "./ControllerMappingModal.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_MAPPING: ControllerMapping = {
  btn_a: "0",
  btn_b: "1",
  btn_x: "2",
  btn_y: "3",
  btn_start: "7",
  btn_select: "6",
  btn_l: "4",
  btn_r: "5",
  btn_l2: "+4",
  btn_r2: "+5",
  btn_l3: "8",
  btn_r3: "9",
  swap_ab_xy: false,
};

interface ButtonField {
  key: keyof Omit<ControllerMapping, "swap_ab_xy">;
  label: string;
  badge: string;
  category: "actions" | "triggers" | "menu" | "sticks";
}

const FIELDS: ButtonField[] = [
  { key: "btn_a", label: "Botón A (Aceptar / PS Cruz)", badge: "A / ✕", category: "actions" },
  { key: "btn_b", label: "Botón B (Atrás / PS Círculo)", badge: "B / ○", category: "actions" },
  { key: "btn_x", label: "Botón X (Acción 1 / PS Cuadrado)", badge: "X / □", category: "actions" },
  { key: "btn_y", label: "Botón Y (Acción 2 / PS Triángulo)", badge: "Y / △", category: "actions" },
  { key: "btn_l", label: "Botón L1 / Parachoques Izq (LB)", badge: "L1 / LB", category: "triggers" },
  { key: "btn_r", label: "Botón R1 / Parachoques Der (RB)", badge: "R1 / RB", category: "triggers" },
  { key: "btn_l2", label: "Gatillo L2 / LT", badge: "L2 / LT", category: "triggers" },
  { key: "btn_r2", label: "Gatillo R2 / RT", badge: "R2 / RT", category: "triggers" },
  { key: "btn_select", label: "Select / Share / Back", badge: "Select", category: "menu" },
  { key: "btn_start", label: "Start / Options / Menú", badge: "Start", category: "menu" },
  { key: "btn_l3", label: "L3 (Click Stick Izquierdo)", badge: "L3", category: "sticks" },
  { key: "btn_r3", label: "R3 (Click Stick Derecho)", badge: "R3", category: "sticks" },
];

export default function ControllerMappingModal({ isOpen, onClose }: Props) {
  const [mapping, setMapping] = useState<ControllerMapping>(DEFAULT_MAPPING);
  const [listeningKey, setListeningKey] = useState<keyof Omit<ControllerMapping, "swap_ab_xy"> | null>(null);
  const [gamepadName, setGamepadName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch initial mapping
    getControllerMapping()
      .then((cfg) => {
        if (cfg) setMapping(cfg);
      })
      .catch((err) => console.error("Error loading controller mapping:", err));

    // Detect connected gamepad
    const checkGamepads = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (let i = 0; i < pads.length; i++) {
        if (pads[i]) {
          setGamepadName(pads[i]?.id ?? `Gamepad ${i + 1}`);
          return;
        }
      }
      setGamepadName(null);
    };

    checkGamepads();
    window.addEventListener("gamepadconnected", checkGamepads);
    window.addEventListener("gamepaddisconnected", checkGamepads);

    return () => {
      window.removeEventListener("gamepadconnected", checkGamepads);
      window.removeEventListener("gamepaddisconnected", checkGamepads);
    };
  }, [isOpen]);

  // Gamepad polling loop when listening for a key press
  useEffect(() => {
    if (!listeningKey) {
      if (pollRef.current) cancelAnimationFrame(pollRef.current);
      return;
    }

    let initialPressed = true;

    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let anyPressed = false;

      for (let p = 0; p < pads.length; p++) {
        const pad = pads[p];
        if (!pad) continue;

        for (let b = 0; b < pad.buttons.length; b++) {
          if (pad.buttons[b].pressed) {
            anyPressed = true;
            if (!initialPressed) {
              // Assigned!
              setMapping((prev) => ({
                ...prev,
                [listeningKey]: b.toString(),
              }));
              setListeningKey(null);
              return;
            }
          }
        }
      }

      if (!anyPressed) {
        initialPressed = false;
      }

      pollRef.current = requestAnimationFrame(poll);
    };

    pollRef.current = requestAnimationFrame(poll);

    return () => {
      if (pollRef.current) cancelAnimationFrame(pollRef.current);
    };
  }, [listeningKey]);

  // Keyboard escape listener to cancel listening mode or close modal
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (listeningKey) {
          e.stopPropagation();
          setListeningKey(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, listeningKey, onClose]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveControllerMapping(mapping);
      setToast("Configuración de mando guardada correctamente");
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.error(err);
      setToast(`Error al guardar: ${err}`);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMapping(DEFAULT_MAPPING);
    setToast("Mapeo restablecido a los valores por defecto (Xbox)");
    setTimeout(() => setToast(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="ctrl-map-backdrop" onClick={onClose}>
      <div className="ctrl-map-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ctrl-map-header">
          <div className="ctrl-map-header-text">
            <h2>Mapeo de Mando &amp; RetroPad</h2>
            <p className="ctrl-map-subtitle">
              {gamepadName ? (
                <span className="ctrl-map-pad-active">🟢 {gamepadName}</span>
              ) : (
                <span className="ctrl-map-pad-inactive">⚪ Conecta un mando para reasignar botones</span>
              )}
            </p>
          </div>
          <button type="button" className="ctrl-map-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {toast && <div className="ctrl-map-toast">{toast}</div>}

        <div className="ctrl-map-body">
          {/* Quick preset switch */}
          <div className="ctrl-map-preset-card">
            <div className="ctrl-map-preset-info">
              <span className="ctrl-map-preset-title">Disposición Nintendo (Invertir A/B y X/Y)</span>
              <span className="ctrl-map-preset-desc">
                Adapta automáticamente la posición de botones para mandos de Nintendo Switch o consolas retro.
              </span>
            </div>
            <label className="ctrl-switch-wrapper">
              <input
                type="checkbox"
                checked={mapping.swap_ab_xy}
                onChange={(e) => setMapping((prev) => ({ ...prev, swap_ab_xy: e.target.checked }))}
              />
              <span className="ctrl-switch-slider" />
            </label>
          </div>

          {listeningKey && (
            <div className="ctrl-listening-banner animate-pulse">
              <span>🎮 Presiona el botón deseado en tu mando para asignar: <strong>{listeningKey.replace("btn_", "").toUpperCase()}</strong></span>
              <button
                type="button"
                className="ctrl-cancel-listen-btn"
                onClick={() => setListeningKey(null)}
              >
                Cancelar (Esc)
              </button>
            </div>
          )}

          <div className="ctrl-grid-sections">
            {/* Action buttons */}
            <div className="ctrl-section">
              <h3 className="ctrl-section-title">Botones Principales</h3>
              <div className="ctrl-fields-list">
                {FIELDS.filter((f) => f.category === "actions").map((field) => (
                  <div key={field.key} className="ctrl-field-row">
                    <div className="ctrl-field-info">
                      <span className="ctrl-field-badge">{field.badge}</span>
                      <span className="ctrl-field-label">{field.label}</span>
                    </div>
                    <button
                      type="button"
                      className={`ctrl-bind-btn ${listeningKey === field.key ? "listening" : ""}`}
                      onClick={() => setListeningKey(field.key)}
                    >
                      {listeningKey === field.key ? "Presiona..." : `Botón ${mapping[field.key]}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Triggers and Bumpers */}
            <div className="ctrl-section">
              <h3 className="ctrl-section-title">Gatillos &amp; Superiores</h3>
              <div className="ctrl-fields-list">
                {FIELDS.filter((f) => f.category === "triggers").map((field) => (
                  <div key={field.key} className="ctrl-field-row">
                    <div className="ctrl-field-info">
                      <span className="ctrl-field-badge">{field.badge}</span>
                      <span className="ctrl-field-label">{field.label}</span>
                    </div>
                    <button
                      type="button"
                      className={`ctrl-bind-btn ${listeningKey === field.key ? "listening" : ""}`}
                      onClick={() => setListeningKey(field.key)}
                    >
                      {listeningKey === field.key ? "Presiona..." : `Botón ${mapping[field.key]}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Menu and Sticks */}
            <div className="ctrl-section">
              <h3 className="ctrl-section-title">Menú &amp; Sticks</h3>
              <div className="ctrl-fields-list">
                {FIELDS.filter((f) => f.category === "menu" || f.category === "sticks").map((field) => (
                  <div key={field.key} className="ctrl-field-row">
                    <div className="ctrl-field-info">
                      <span className="ctrl-field-badge">{field.badge}</span>
                      <span className="ctrl-field-label">{field.label}</span>
                    </div>
                    <button
                      type="button"
                      className={`ctrl-bind-btn ${listeningKey === field.key ? "listening" : ""}`}
                      onClick={() => setListeningKey(field.key)}
                    >
                      {listeningKey === field.key ? "Presiona..." : `Botón ${mapping[field.key]}`}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="ctrl-map-footer">
          <button type="button" className="ctrl-btn-secondary" onClick={handleReset}>
            Restablecer por Defecto
          </button>
          <div className="ctrl-footer-right">
            <button type="button" className="ctrl-btn-cancel" onClick={onClose}>
              Cerrar
            </button>
            <button
              type="button"
              className="ctrl-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Guardar Mapeo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
