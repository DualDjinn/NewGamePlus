import React from "react";
import { useInputDevice } from "../hooks/useGamepad";
import type { Section } from "../types";
import "./ControllerHUD.css";

interface ControllerHUDProps {
  section: Section;
  hasModalOpen: boolean;
  selectedGameId: string | null;
}

interface ActionHint {
  key: string;
  label: string;
  variant?: "confirm" | "cancel" | "action-x" | "action-y" | "bumper" | "dpad" | "special";
}

export const ControllerHUD: React.FC<ControllerHUDProps> = ({
  section,
  hasModalOpen,
  selectedGameId,
}) => {
  const { device, controllerType } = useInputDevice();

  if (device === "mouse") {
    return null;
  }

  // Helper to render authentic controller glyphs
  const renderGlyph = (hint: ActionHint) => {
    if (device === "keyboard") {
      let keycap = hint.key;
      if (hint.key === "A") keycap = "Enter";
      else if (hint.key === "B") keycap = "Esc";
      else if (hint.key === "X") keycap = "F";
      else if (hint.key === "Y") keycap = "Espacio";
      else if (hint.key === "LB/RB") keycap = "1 / 2";
      else if (hint.key === "Start") keycap = "Tab";
      else if (hint.key === "Select") keycap = "M";
      else if (hint.key === "D-Pad") keycap = "↑ ↓ ← →";

      return <span className="hud-keycap">{keycap}</span>;
    }

    // PlayStation Glyphs
    if (controllerType === "playstation") {
      let label = hint.key;
      let symbolClass = "ps-generic";
      if (hint.key === "A") { label = "✕"; symbolClass = "ps-cross"; }
      else if (hint.key === "B") { label = "○"; symbolClass = "ps-circle"; }
      else if (hint.key === "X") { label = "□"; symbolClass = "ps-square"; }
      else if (hint.key === "Y") { label = "△"; symbolClass = "ps-triangle"; }
      else if (hint.key === "LB/RB") { label = "L1/R1"; symbolClass = "btn-bumper"; }
      else if (hint.key === "Start") { label = "Options"; symbolClass = "btn-menu"; }
      else if (hint.key === "Select") { label = "Share"; symbolClass = "btn-menu"; }
      else if (hint.key === "D-Pad") { label = "D-Pad"; symbolClass = "btn-dpad"; }

      return <span className={`hud-btn ${symbolClass}`}>{label}</span>;
    }

    // Nintendo Glyphs (A is right, B is bottom, X is top, Y is left)
    if (controllerType === "nintendo") {
      let label = hint.key;
      if (hint.key === "LB/RB") label = "L/R";
      else if (hint.key === "Start") label = "+";
      else if (hint.key === "Select") label = "-";
      return <span className={`hud-btn nintendo-${hint.variant || "generic"}`}>{label}</span>;
    }

    // Default: Xbox / XInput
    return <span className={`hud-btn xbox-${hint.variant || "generic"}`}>{hint.key}</span>;
  };

  // Determine current contextual hints
  let hints: ActionHint[] = [];

  if (hasModalOpen) {
    hints = [
      { key: "A", label: "Seleccionar", variant: "confirm" },
      { key: "B", label: "Volver", variant: "cancel" },
      { key: "X", label: "Favorito", variant: "action-x" },
      { key: "Y", label: "Jugar", variant: "action-y" },
      { key: "D-Pad", label: "Moverse", variant: "dpad" },
    ];
  } else if (section === "settings") {
    hints = [
      { key: "LB/RB", label: "Pestañas", variant: "bumper" },
      { key: "D-Pad", label: "Navegar Opciones", variant: "dpad" },
      { key: "A", label: "Modificar", variant: "confirm" },
      { key: "B", label: "Volver a Inicio", variant: "cancel" },
    ];
  } else if (selectedGameId) {
    // Game selected in grid or carousel
    hints = [
      { key: "A", label: "Ver Detalles", variant: "confirm" },
      { key: "Y", label: "Jugar Rápido", variant: "action-y" },
      { key: "X", label: "Favorito", variant: "action-x" },
      { key: "LB/RB", label: "Secciones", variant: "bumper" },
      { key: "Select", label: "Barra Lateral", variant: "special" },
      { key: "Start", label: "Ajustes", variant: "special" },
    ];
  } else {
    // General exploration
    hints = [
      { key: "D-Pad", label: "Navegar Catálogo", variant: "dpad" },
      { key: "LB/RB", label: "Secciones", variant: "bumper" },
      { key: "Select", label: "Barra Lateral", variant: "special" },
      { key: "Start", label: "Ajustes", variant: "special" },
    ];
  }

  return (
    <aside className="controller-hud" aria-label="Controles del sistema">
      <div className="controller-hud-capsule">
        <div className="controller-hud-device-badge" title={`Entrada activa: ${device} (${controllerType})`}>
          {device === "gamepad" ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M7 6h10a6 6 0 0 1 6 6v3a4 4 0 0 1-4 4 3 3 0 0 1-3-2l-1.5-3h-5L8 21a3 3 0 0 1-3 2 4 4 0 0 1-4-4v-3a6 6 0 0 1 6-6zm-1 5a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h1v1a1 1 0 0 0 2 0v-1h1a1 1 0 0 0 0-2H7v-1a1 1 0 0 0-1-1zm12.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-2 2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z" />
            </svg>
          )}
        </div>

        <div className="controller-hud-hints">
          {hints.map((hint, idx) => (
            <div key={`${hint.key}-${idx}`} className="controller-hud-item">
              {renderGlyph(hint)}
              <span className="controller-hud-label">{hint.label}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default ControllerHUD;
