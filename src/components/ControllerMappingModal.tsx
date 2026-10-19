import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { ControllerMapping } from "../types";
import { getControllerMapping, saveControllerMapping } from "../lib/tauri";
import GamepadSvg, { type GamepadKey } from "./GamepadSvg";
import "./ControllerMappingModal.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  currentPlatform?: string;
}

const DEFAULT_MAPPING: ControllerMapping = {
  btn_a: "0",
  btn_b: "1",
  btn_x: "2",
  btn_y: "3",
  btn_start: "9",
  btn_select: "8",
  btn_l: "4",
  btn_r: "5",
  btn_l2: "6",
  btn_r2: "7",
  btn_l3: "10",
  btn_r3: "11",
  dpad_up: "12",
  dpad_down: "13",
  dpad_left: "14",
  dpad_right: "15",
  l_stick_x_plus: "+0",
  l_stick_x_minus: "-0",
  l_stick_y_plus: "+1",
  l_stick_y_minus: "-1",
  analog_dpad_mode: "0",
  swap_ab_xy: false,
};

export const BUILTIN_PROFILES: Record<string, ControllerMapping> = {
  "Estándar (Xbox)": {
    ...DEFAULT_MAPPING,
  },
  "Nintendo (Retro)": {
    ...DEFAULT_MAPPING,
    swap_ab_xy: true,
    analog_dpad_mode: "1",
  },
  "Arcade / Lucha": {
    ...DEFAULT_MAPPING,
    analog_dpad_mode: "0",
  },
};

interface ButtonField {
  key: GamepadKey;
  labelKey: string;
  badge: string;
  category: "actions" | "triggers" | "menu" | "sticks" | "dpad" | "stick";
  capture: "button" | "axis";
}

const FIELDS: ButtonField[] = [
  { key: "btn_x", labelKey: "mapping.fieldBtnX", badge: "X / △", category: "actions", capture: "button" },
  { key: "btn_y", labelKey: "mapping.fieldBtnY", badge: "Y / □", category: "actions", capture: "button" },
  { key: "btn_b", labelKey: "mapping.fieldBtnB", badge: "B / ✕", category: "actions", capture: "button" },
  { key: "btn_a", labelKey: "mapping.fieldBtnA", badge: "A / ○", category: "actions", capture: "button" },
  { key: "btn_l", labelKey: "mapping.fieldBtnL", badge: "L1 / LB", category: "triggers", capture: "button" },
  { key: "btn_r", labelKey: "mapping.fieldBtnR", badge: "R1 / RB", category: "triggers", capture: "button" },
  { key: "btn_l2", labelKey: "mapping.fieldBtnL2", badge: "L2 / LT", category: "triggers", capture: "button" },
  { key: "btn_r2", labelKey: "mapping.fieldBtnR2", badge: "R2 / RT", category: "triggers", capture: "button" },
  { key: "btn_select", labelKey: "mapping.fieldSelect", badge: "Select", category: "menu", capture: "button" },
  { key: "btn_start", labelKey: "mapping.fieldStart", badge: "Start", category: "menu", capture: "button" },
  { key: "btn_l3", labelKey: "mapping.fieldL3", badge: "L3", category: "sticks", capture: "button" },
  { key: "btn_r3", labelKey: "mapping.fieldR3", badge: "R3", category: "sticks", capture: "button" },
  { key: "dpad_up", labelKey: "mapping.fieldUp", badge: "↑", category: "dpad", capture: "button" },
  { key: "dpad_down", labelKey: "mapping.fieldDown", badge: "↓", category: "dpad", capture: "button" },
  { key: "dpad_left", labelKey: "mapping.fieldLeft", badge: "←", category: "dpad", capture: "button" },
  { key: "dpad_right", labelKey: "mapping.fieldRight", badge: "→", category: "dpad", capture: "button" },
  { key: "l_stick_x_minus", labelKey: "mapping.fieldLxMinus", badge: "LX−", category: "stick", capture: "axis" },
  { key: "l_stick_x_plus", labelKey: "mapping.fieldLxPlus", badge: "LX+", category: "stick", capture: "axis" },
  { key: "l_stick_y_minus", labelKey: "mapping.fieldLyMinus", badge: "LY−", category: "stick", capture: "axis" },
  { key: "l_stick_y_plus", labelKey: "mapping.fieldLyPlus", badge: "LY+", category: "stick", capture: "axis" },
];

const AXIS_THRESHOLD = 0.5;

function fieldValueLabel(field: ButtonField, mapping: ControllerMapping, t: TFunction): string {
  const v = mapping[field.key];
  if (field.capture === "axis") {
    return t("mapping.axisLabel", { v: v ?? "?" });
  }
  return t("mapping.buttonLabel", { v: v ?? "?" });
}

function getKeycapBadgeClass(key: string): string {
  switch (key) {
    case "btn_a":
      return "keycap-a";
    case "btn_b":
      return "keycap-b";
    case "btn_x":
      return "keycap-x";
    case "btn_y":
      return "keycap-y";
    case "btn_l":
    case "btn_r":
    case "btn_l2":
    case "btn_r2":
      return "keycap-trigger";
    case "dpad_up":
    case "dpad_down":
    case "dpad_left":
    case "dpad_right":
      return "keycap-dpad";
    default:
      return "keycap-default";
  }
}

export default function ControllerMappingModal({ isOpen, onClose, onSaved, currentPlatform }: Props) {
  const { t } = useTranslation();
  const [selectedPlayer, setSelectedPlayer] = useState<number>(1);
  const [playerMappings, setPlayerMappings] = useState<Record<number, ControllerMapping>>({
    1: DEFAULT_MAPPING,
    2: DEFAULT_MAPPING,
    3: DEFAULT_MAPPING,
    4: DEFAULT_MAPPING,
  });
  const [mapping, setMapping] = useState<ControllerMapping>(DEFAULT_MAPPING);

  const [customProfiles, setCustomProfiles] = useState<Record<string, ControllerMapping>>(() => {
    try {
      const stored = localStorage.getItem("gameflix_custom_controller_profiles");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const allProfiles: Record<string, ControllerMapping> = {
    ...BUILTIN_PROFILES,
    ...customProfiles,
  };

  const [playerProfiles, setPlayerProfiles] = useState<Record<number, string>>(() => {
    try {
      const stored = localStorage.getItem("gameflix_player_active_profiles");
      return stored
        ? JSON.parse(stored)
        : { 1: "Estándar (Xbox)", 2: "Estándar (Xbox)", 3: "Estándar (Xbox)", 4: "Estándar (Xbox)" };
    } catch {
      return { 1: "Estándar (Xbox)", 2: "Estándar (Xbox)", 3: "Estándar (Xbox)", 4: "Estándar (Xbox)" };
    }
  });

  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const activeProfileName = playerProfiles[selectedPlayer] || "Estándar (Xbox)";

  const [listeningKey, setListeningKey] = useState<ButtonField["key"] | null>(null);
  const listeningField = listeningKey ? FIELDS.find((f) => f.key === listeningKey) ?? null : null;
  const [gamepadName, setGamepadName] = useState<string | null>(null);
  const [livePressedKeys, setLivePressedKeys] = useState<Set<GamepadKey>>(new Set());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  const isRetroPlatform = Boolean(
    currentPlatform &&
      ["snes", "super nintendo", "nes", "gba", "gbc", "gb", "game boy", "genesis", "megadrive", "arcade", "mame", "fbneo"].some((p) =>
        currentPlatform.toLowerCase().includes(p)
      )
  );

  useEffect(() => {
    if (!isOpen) return;

    // Load initial mapping from backend and local storage player profiles
    getControllerMapping()
      .then((cfg) => {
        let initialMap: Record<number, ControllerMapping> = {
          1: DEFAULT_MAPPING,
          2: DEFAULT_MAPPING,
          3: DEFAULT_MAPPING,
          4: DEFAULT_MAPPING,
        };
        const stored = localStorage.getItem("gameflix_player_mappings");
        if (stored) {
          try {
            initialMap = { ...initialMap, ...JSON.parse(stored) };
          } catch (e) {
            console.error(e);
          }
        }
        if (cfg) {
          initialMap[1] = { ...DEFAULT_MAPPING, ...cfg };
        }
        setPlayerMappings(initialMap);
        setMapping(initialMap[selectedPlayer] || DEFAULT_MAPPING);
      })
      .catch((err) => console.error("Error loading controller mapping:", err));

    // Detect connected gamepads
    const checkGamepads = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const currentPad = pads[selectedPlayer - 1] || pads.find((p) => p !== null);
      if (currentPad) {
        setGamepadName(currentPad.id);
      } else {
        setGamepadName(null);
      }
    };

    checkGamepads();
    window.addEventListener("gamepadconnected", checkGamepads);
    window.addEventListener("gamepaddisconnected", checkGamepads);

    return () => {
      window.removeEventListener("gamepadconnected", checkGamepads);
      window.removeEventListener("gamepaddisconnected", checkGamepads);
    };
  }, [isOpen, selectedPlayer]);

  // Gamepad polling loop when listening for a button press or stick deflection
  useEffect(() => {
    if (!listeningKey || !listeningField) {
      if (pollRef.current) cancelAnimationFrame(pollRef.current);
      return;
    }

    const captureMode = listeningField.capture;
    let initialActive = true;

    const poll = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = pads[selectedPlayer - 1] || pads.find((p) => p !== null);

      if (pad) {
        if (captureMode === "axis") {
          let anyDeflected = false;
          for (let a = 0; a < pad.axes.length; a++) {
            const v = pad.axes[a] ?? 0;
            if (Math.abs(v) >= AXIS_THRESHOLD) {
              anyDeflected = true;
              if (!initialActive) {
                // Assigned!
                const newCode = `${v > 0 ? "+" : "-"}${a}`;
                setMapping((prev) => ({
                  ...prev,
                  [listeningKey]: newCode,
                }));
                setListeningKey(null);
                return;
              }
            }
          }
          if (!anyDeflected) initialActive = false;
        } else {
          let anyPressed = false;
          for (let b = 0; b < pad.buttons.length; b++) {
            if (pad.buttons[b].pressed) {
              anyPressed = true;
              if (!initialActive) {
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
          if (!anyPressed) initialActive = false;
        }
      }

      pollRef.current = requestAnimationFrame(poll);
    };

    pollRef.current = requestAnimationFrame(poll);

    return () => {
      if (pollRef.current) cancelAnimationFrame(pollRef.current);
    };
  }, [listeningKey, listeningField, selectedPlayer]);

  // Live Input Visualizer loop (illuminates buttons on the SVG when pressed physically)
  useEffect(() => {
    if (!isOpen || listeningKey) {
      setLivePressedKeys(new Set());
      return;
    }

    let animId: number;
    const checkLiveInput = () => {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = pads[selectedPlayer - 1] || pads.find((p) => p !== null);

      if (pad) {
        const pressed = new Set<GamepadKey>();

        // Check active buttons
        for (let b = 0; b < pad.buttons.length; b++) {
          const btn = pad.buttons[b];
          if (btn && (btn.pressed || btn.value > 0.25)) {
            const bStr = b.toString();
            for (const f of FIELDS) {
              if (f.capture === "button" && mapping[f.key] === bStr) {
                pressed.add(f.key);
              }
            }
          }
        }

        // Check active axes
        for (let a = 0; a < pad.axes.length; a++) {
          const v = pad.axes[a] ?? 0;
          if (Math.abs(v) >= AXIS_THRESHOLD) {
            const code = `${v > 0 ? "+" : "-"}${a}`;
            for (const f of FIELDS) {
              if (mapping[f.key] === code) {
                pressed.add(f.key);
              }
            }
          }
        }

        setLivePressedKeys((prev) => {
          if (prev.size === pressed.size && [...pressed].every((k) => prev.has(k))) {
            return prev;
          }
          return pressed;
        });
      } else {
        setLivePressedKeys((prev) => (prev.size === 0 ? prev : new Set()));
      }

      animId = requestAnimationFrame(checkLiveInput);
    };

    animId = requestAnimationFrame(checkLiveInput);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, listeningKey, selectedPlayer, mapping]);

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

  const handlePlayerChange = (playerNum: number) => {
    const updatedMap = {
      ...playerMappings,
      [selectedPlayer]: mapping,
    };
    setPlayerMappings(updatedMap);
    setSelectedPlayer(playerNum);
    setMapping(updatedMap[playerNum] || DEFAULT_MAPPING);
  };

  const handleApplyProfile = (profileName: string) => {
    const targetMap = allProfiles[profileName];
    if (!targetMap) return;
    setMapping(targetMap);
    setPlayerMappings((prev) => ({ ...prev, [selectedPlayer]: targetMap }));
    setPlayerProfiles((prev) => {
      const updated = { ...prev, [selectedPlayer]: profileName };
      localStorage.setItem("gameflix_player_active_profiles", JSON.stringify(updated));
      return updated;
    });
    setToast(`Perfil "${profileName}" asignado a Jugador ${selectedPlayer}`);
    setTimeout(() => setToast(null), 2500);
  };

  const handleCreateProfileSubmit = () => {
    const trimmed = newProfileName.trim();
    if (!trimmed) {
      setToast("Ingresa un nombre para el perfil");
      setTimeout(() => setToast(null), 2000);
      return;
    }
    if (BUILTIN_PROFILES[trimmed]) {
      setToast("Ese nombre corresponde a un perfil predeterminado");
      setTimeout(() => setToast(null), 2000);
      return;
    }
    const updatedCustom = {
      ...customProfiles,
      [trimmed]: { ...mapping },
    };
    setCustomProfiles(updatedCustom);
    localStorage.setItem("gameflix_custom_controller_profiles", JSON.stringify(updatedCustom));

    setPlayerProfiles((prev) => {
      const updated = { ...prev, [selectedPlayer]: trimmed };
      localStorage.setItem("gameflix_player_active_profiles", JSON.stringify(updated));
      return updated;
    });

    setIsCreatingProfile(false);
    setNewProfileName("");
    setToast(`Perfil "${trimmed}" creado y asignado a Jugador ${selectedPlayer}`);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSaveCurrentToProfile = () => {
    if (!customProfiles[activeProfileName]) {
      setToast("Los perfiles predeterminados no se pueden sobrescribir. Usa '+ Nuevo Perfil'");
      setTimeout(() => setToast(null), 2500);
      return;
    }
    const updatedCustom = {
      ...customProfiles,
      [activeProfileName]: { ...mapping },
    };
    setCustomProfiles(updatedCustom);
    localStorage.setItem("gameflix_custom_controller_profiles", JSON.stringify(updatedCustom));
    setToast(`Cambios guardados en el perfil "${activeProfileName}"`);
    setTimeout(() => setToast(null), 2500);
  };

  const handleDeleteProfile = (profileName: string) => {
    if (BUILTIN_PROFILES[profileName]) return;
    const updatedCustom = { ...customProfiles };
    delete updatedCustom[profileName];
    setCustomProfiles(updatedCustom);
    localStorage.setItem("gameflix_custom_controller_profiles", JSON.stringify(updatedCustom));

    setPlayerProfiles((prev) => {
      const nextProfiles = { ...prev };
      for (let p = 1; p <= 4; p++) {
        if (nextProfiles[p] === profileName) {
          nextProfiles[p] = "Estándar (Xbox)";
        }
      }
      localStorage.setItem("gameflix_player_active_profiles", JSON.stringify(nextProfiles));
      return nextProfiles;
    });

    if (activeProfileName === profileName) {
      const fallback = BUILTIN_PROFILES["Estándar (Xbox)"];
      setMapping(fallback);
      setPlayerMappings((prev) => ({ ...prev, [selectedPlayer]: fallback }));
    }
    setToast(`Perfil "${profileName}" eliminado`);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedMap = {
        ...playerMappings,
        [selectedPlayer]: mapping,
      };
      setPlayerMappings(updatedMap);
      localStorage.setItem("gameflix_player_mappings", JSON.stringify(updatedMap));

      // If active profile is custom, also persist mapping to that custom profile
      if (customProfiles[activeProfileName]) {
        const updatedCustom = {
          ...customProfiles,
          [activeProfileName]: { ...mapping },
        };
        setCustomProfiles(updatedCustom);
        localStorage.setItem("gameflix_custom_controller_profiles", JSON.stringify(updatedCustom));
      }

      // Persist Player 1 to backend (RetroArch config)
      await saveControllerMapping(updatedMap[1]);
      setToast(t("mapping.savedOk"));
      setTimeout(() => setToast(null), 2500);
      onSaved?.();
    } catch (err) {
      console.error(err);
      setToast(t("mapping.saveError", { err: String(err) }));
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMapping(DEFAULT_MAPPING);
    setPlayerProfiles((prev) => {
      const updated = { ...prev, [selectedPlayer]: "Estándar (Xbox)" };
      localStorage.setItem("gameflix_player_active_profiles", JSON.stringify(updated));
      return updated;
    });
    setToast(t("mapping.resetOk"));
    setTimeout(() => setToast(null), 2000);
  };

  const renderFieldRow = (fieldKey: ButtonField["key"]) => {
    const field = FIELDS.find((f) => f.key === fieldKey);
    if (!field) return null;
    const isLiveActive = livePressedKeys.has(field.key);

    return (
      <div
        key={field.key}
        className={`ctrl-field-row ${isLiveActive ? "live-active" : ""}`}
        title={t(field.labelKey)}
      >
        <div className="ctrl-field-info">
          <span className={`ctrl-field-badge ${getKeycapBadgeClass(field.key)}`}>{field.badge}</span>
          <span className="ctrl-field-label" title={t(field.labelKey)}>
            {t(field.labelKey)}
          </span>
        </div>
        <button
          type="button"
          className={`ctrl-bind-btn ${listeningKey === field.key ? "listening" : ""} ${isLiveActive ? "live-active" : ""}`}
          onClick={() => setListeningKey(field.key)}
          title={t("mapping.reassign", { label: t(field.labelKey) })}
        >
          {listeningKey === field.key
            ? field.capture === "axis"
              ? t("mapping.moveHint")
              : t("mapping.pressHint")
            : fieldValueLabel(field, mapping, t)}
        </button>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="ctrl-map-backdrop" data-capture-gamepad="true" onClick={onClose}>
      <div className="ctrl-map-modal ctrl-modal-expanded" data-capture-gamepad="true" onClick={(e) => e.stopPropagation()}>
        {/* Header with Player Selector, Profile / Preset Selector, and Device Tag */}
        <div className="ctrl-map-header">
          <div className="ctrl-header-main">
            <div className="ctrl-title-wrap">
              <h2>{t("mapping.title")}</h2>
              <div className="ctrl-device-pill">
                <span className={`ctrl-status-dot ${gamepadName ? "online" : "offline"}`} />
                <span className="ctrl-device-name">
                  {gamepadName ?? t("mapping.connectPad")}
                </span>
              </div>
            </div>

            {/* Multi-Player Slots (1, 2, 3, 4) */}
            <div className="ctrl-player-group">
              <span className="ctrl-player-label">Jugador:</span>
              <div className="ctrl-player-tabs">
                {[1, 2, 3, 4].map((pNum) => (
                  <button
                    key={pNum}
                    type="button"
                    className={`ctrl-player-btn ${selectedPlayer === pNum ? "active" : ""}`}
                    onClick={() => handlePlayerChange(pNum)}
                  >
                    Jugador {pNum}
                  </button>
                ))}
              </div>
            </div>

            {/* Named Controller Profiles (Presets / Perfiles de Control) */}
            <div className="ctrl-profile-group">
              <span className="ctrl-profile-label">Perfil de Mando:</span>
              {!isCreatingProfile ? (
                <div className="ctrl-profile-select-wrap">
                  <select
                    className="ctrl-profile-select"
                    value={activeProfileName}
                    onChange={(e) => handleApplyProfile(e.target.value)}
                  >
                    <optgroup label="Perfiles Predeterminados">
                      {Object.keys(BUILTIN_PROFILES).map((pName) => (
                        <option key={pName} value={pName}>
                          {pName}
                        </option>
                      ))}
                    </optgroup>
                    {Object.keys(customProfiles).length > 0 && (
                      <optgroup label="Mis Perfiles Guardados">
                        {Object.keys(customProfiles).map((pName) => (
                          <option key={pName} value={pName}>
                            {pName}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  <button
                    type="button"
                    className="ctrl-profile-btn ctrl-profile-add-btn"
                    onClick={() => setIsCreatingProfile(true)}
                    title="Crear un nuevo perfil de mando a partir del mapeo actual"
                  >
                    + Nuevo Perfil
                  </button>

                  {customProfiles[activeProfileName] && (
                    <button
                      type="button"
                      className="ctrl-profile-btn ctrl-profile-save-btn"
                      onClick={handleSaveCurrentToProfile}
                      title={`Guardar los botones actuales en el perfil "${activeProfileName}"`}
                    >
                      Guardar en Perfil
                    </button>
                  )}

                  {customProfiles[activeProfileName] && (
                    <button
                      type="button"
                      className="ctrl-profile-btn ctrl-profile-del-btn"
                      onClick={() => handleDeleteProfile(activeProfileName)}
                      title={`Eliminar el perfil "${activeProfileName}"`}
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              ) : (
                <div className="ctrl-profile-create-inline">
                  <input
                    type="text"
                    className="ctrl-profile-input"
                    placeholder="Nombre del perfil (ej: Pelea, Carreras, Mario Kart)..."
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateProfileSubmit();
                      if (e.key === "Escape") {
                        setIsCreatingProfile(false);
                        setNewProfileName("");
                      }
                    }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="ctrl-profile-btn ctrl-profile-confirm-btn"
                    onClick={handleCreateProfileSubmit}
                  >
                    Crear y Asignar
                  </button>
                  <button
                    type="button"
                    className="ctrl-profile-btn ctrl-profile-cancel-btn"
                    onClick={() => {
                      setIsCreatingProfile(false);
                      setNewProfileName("");
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>

          <button type="button" className="ctrl-map-close-btn" onClick={onClose} aria-label={t("mapping.close")}>
            ✕
          </button>
        </div>

        {toast && <div className="ctrl-map-toast">{toast}</div>}

        {/* 3-Column Spatial Body (Ryujinx Style) */}
        <div className="ctrl-map-body ctrl-map-ryu-body">
          {/* LEFT COLUMN: Left Hand (Triggers, Left Stick, D-Pad) */}
          <div className="ctrl-ryu-col ctrl-ryu-col-left">
            <div className="ctrl-section">
              <h3 className="ctrl-section-title">Gatillos Izq. (ZL / L)</h3>
              <div className="ctrl-fields-list">
                {renderFieldRow("btn_l2")}
                {renderFieldRow("btn_l")}
              </div>
            </div>

            <div className="ctrl-section">
              <h3 className="ctrl-section-title">{t("mapping.secStick")}</h3>
              <div className="ctrl-fields-list">
                {renderFieldRow("btn_l3")}
                {renderFieldRow("l_stick_x_minus")}
                {renderFieldRow("l_stick_x_plus")}
                {renderFieldRow("l_stick_y_minus")}
                {renderFieldRow("l_stick_y_plus")}
              </div>
            </div>

            <div className="ctrl-section">
              <h3 className="ctrl-section-title">{t("mapping.secDpad")}</h3>
              <div className="ctrl-fields-list">
                {renderFieldRow("dpad_up")}
                {renderFieldRow("dpad_down")}
                {renderFieldRow("dpad_left")}
                {renderFieldRow("dpad_right")}
              </div>
            </div>
          </div>

          {/* CENTER COLUMN: Dual-View Controller Diagram & Clean Toggles */}
          <div className="ctrl-ryu-col ctrl-ryu-col-center">
            <GamepadSvg
              mapping={mapping}
              highlightedKey={listeningKey}
              livePressedKeys={livePressedKeys}
              onSelectKey={(k) => setListeningKey(k)}
              analogDpadMode={mapping.analog_dpad_mode}
            />

            {listeningKey && listeningField && (
              <div className="ctrl-listening-banner animate-pulse">
                <span>
                  Reasignando {listeningField.capture === "axis" ? "Eje" : "Botón"}: <strong>{listeningField.badge}</strong>
                </span>
                <button
                  type="button"
                  className="ctrl-cancel-listen-btn"
                  onClick={() => setListeningKey(null)}
                >
                  {t("mapping.cancelEsc")}
                </button>
              </div>
            )}

            {/* Movement Mode (Cruceta vs Stick Izq.) - Clean 2-tile selector */}
            <div className="ctrl-movement-card">
              <div className="ctrl-movement-header">
                <div className="ctrl-map-preset-info">
                  <span className="ctrl-map-preset-title">{t("mapping.moveTitle")}</span>
                  <span className="ctrl-map-preset-desc">{t("mapping.moveDesc")}</span>
                </div>
              </div>

              {currentPlatform && (
                <div className="ctrl-platform-tip">
                  <div className="ctrl-platform-tip-text">
                    <span className="ctrl-tip-prefix">Consola:</span>
                    <span>
                      <strong>{currentPlatform}</strong>.
                      {isRetroPlatform && mapping.analog_dpad_mode !== "1"
                        ? ` ${t("mapping.retroTip")}`
                        : ` ${t("mapping.readyTip")}`}
                    </span>
                  </div>
                  {isRetroPlatform && mapping.analog_dpad_mode !== "1" && (
                    <button
                      type="button"
                      className="ctrl-platform-quick-btn"
                      onClick={() => setMapping((prev) => ({ ...prev, analog_dpad_mode: "1" }))}
                    >
                      {t("mapping.enableLeftStick")}
                    </button>
                  )}
                </div>
              )}

              <div className="ctrl-analog-modes-container ctrl-analog-2modes">
                <button
                  type="button"
                  className={`ctrl-analog-tile ${mapping.analog_dpad_mode === "0" ? "active" : ""}`}
                  onClick={() => setMapping((prev) => ({ ...prev, analog_dpad_mode: "0" }))}
                >
                  <div className="ctrl-analog-tile-header">
                    <span className="ctrl-analog-tile-title">{t("mapping.dpadOnly")}</span>
                  </div>
                  <span className="ctrl-analog-tile-desc">{t("mapping.dpadOnlyDesc")}</span>
                </button>

                <button
                  type="button"
                  className={`ctrl-analog-tile ${mapping.analog_dpad_mode === "1" ? "active" : ""}`}
                  onClick={() => setMapping((prev) => ({ ...prev, analog_dpad_mode: "1" }))}
                >
                  <div className="ctrl-analog-tile-header">
                    <span className="ctrl-analog-tile-title">{t("mapping.leftStick")}</span>
                  </div>
                  <span className="ctrl-analog-tile-desc">{t("mapping.leftStickDesc")}</span>
                </button>
              </div>
            </div>

            {/* Nintendo Layout Switch */}
            <div className="ctrl-map-preset-card">
              <div className="ctrl-map-preset-info">
                <span className="ctrl-map-preset-title">{t("mapping.nintendoLayout")}</span>
                <span className="ctrl-map-preset-desc">{t("mapping.nintendoLayoutDesc")}</span>
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
          </div>

          {/* RIGHT COLUMN: Right Hand (Triggers, Face Buttons, Right Stick, Menus) */}
          <div className="ctrl-ryu-col ctrl-ryu-col-right">
            <div className="ctrl-section">
              <h3 className="ctrl-section-title">Gatillos Der. (ZR / R)</h3>
              <div className="ctrl-fields-list">
                {renderFieldRow("btn_r2")}
                {renderFieldRow("btn_r")}
              </div>
            </div>

            <div className="ctrl-section">
              <h3 className="ctrl-section-title">{t("mapping.secActions")}</h3>
              <div className="ctrl-fields-list">
                {renderFieldRow("btn_x")}
                {renderFieldRow("btn_y")}
                {renderFieldRow("btn_b")}
                {renderFieldRow("btn_a")}
              </div>
            </div>

            <div className="ctrl-section">
              <h3 className="ctrl-section-title">{t("mapping.secMenu")}</h3>
              <div className="ctrl-fields-list">
                {renderFieldRow("btn_r3")}
                {renderFieldRow("btn_select")}
                {renderFieldRow("btn_start")}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="ctrl-map-footer">
          <button type="button" className="ctrl-btn-secondary" onClick={handleReset}>
            {t("mapping.resetDefault")}
          </button>
          <div className="ctrl-footer-right">
            <button type="button" className="ctrl-btn-cancel" onClick={onClose}>
              {t("mapping.close")}
            </button>
            <button
              type="button"
              className="ctrl-btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t("mapping.saving") : t("mapping.saveMapping")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
