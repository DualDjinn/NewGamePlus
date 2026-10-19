import React from "react";
import { useTranslation } from "react-i18next";
import type { ControllerMapping } from "../types";

export type GamepadKey =
  | "btn_a"
  | "btn_b"
  | "btn_x"
  | "btn_y"
  | "btn_l"
  | "btn_r"
  | "btn_l2"
  | "btn_r2"
  | "btn_select"
  | "btn_start"
  | "btn_l3"
  | "btn_r3"
  | "dpad_up"
  | "dpad_down"
  | "dpad_left"
  | "dpad_right"
  | "l_stick_x_minus"
  | "l_stick_x_plus"
  | "l_stick_y_minus"
  | "l_stick_y_plus";

interface Props {
  mapping: ControllerMapping;
  highlightedKey: GamepadKey | string | null;
  livePressedKeys?: Set<GamepadKey>;
  onSelectKey?: (key: GamepadKey) => void;
  analogDpadMode?: string;
}

export const GamepadSvg: React.FC<Props> = ({
  mapping,
  highlightedKey,
  livePressedKeys,
  onSelectKey,
}) => {
  const { t } = useTranslation();

  const isKeyActive = (key: GamepadKey) =>
    highlightedKey === key || Boolean(livePressedKeys?.has(key));

  const isLeftStickActive =
    isKeyActive("btn_l3") ||
    isKeyActive("l_stick_x_minus") ||
    isKeyActive("l_stick_x_plus") ||
    isKeyActive("l_stick_y_minus") ||
    isKeyActive("l_stick_y_plus");

  const isRightStickActive = isKeyActive("btn_r3");

  const handleKeyClick = (key: GamepadKey) => {
    if (onSelectKey) {
      onSelectKey(key);
    }
  };

  const isNintendo = mapping.swap_ab_xy;
  const labelA = isNintendo ? "B" : "A";
  const labelB = isNintendo ? "A" : "B";
  const labelX = isNintendo ? "Y" : "X";
  const labelY = isNintendo ? "X" : "Y";

  return (
    <div className="gamepad-visual-container snes-visual-container">
      <svg
        className="gamepad-svg snes-8bitdo-svg"
        viewBox="0 0 500 315"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={t("mapping.svgDiagram")}
      >
        <defs>
          {/* Main Body Gradients */}
          <linearGradient id="ngpBodyGrad" x1="250" y1="130" x2="250" y2="256" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="60%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </linearGradient>

          {/* Stick Pod Collar Gradient (Matching Body Plastic with 3D Spherical Bevel) */}
          <radialGradient id="ngpPodCollarGrad" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#f1f5f9" />
            <stop offset="80%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </radialGradient>

          <linearGradient id="ngpTopDeckGrad" x1="250" y1="38" x2="250" y2="104" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="60%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>

          <linearGradient id="ngpTriggerDarkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          <linearGradient id="ngpTriggerActiveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>

          {/* D-Pad Gradients */}
          <radialGradient id="ngpDpadWellGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="85%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </radialGradient>

          <linearGradient id="ngpDpadCrossGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="55%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Rubber Pill Buttons */}
          <linearGradient id="ngpPillGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Analog Sticks Rubber Textures */}
          <radialGradient id="ngpStickRimGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="65%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </radialGradient>

          <radialGradient id="ngpStickDishGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="70%" stopColor="#334155" />
            <stop offset="100%" stopColor="#475569" />
          </radialGradient>

          {/* Filters */}
          <filter id="ngpActiveGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="ngpDropShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.4" />
          </filter>

          <filter id="ngpPodShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.35" />
          </filter>
        </defs>

        {/* ==================================================================
            CLEAN HEADER
            ================================================================== */}
        <g id="clean-header" opacity="0.9">
          <text
            x="250"
            y="22"
            fill="#94a3b8"
            fontSize="12"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="0.22em"
            textAnchor="middle"
          >
            NG+ GAMEPAD
          </text>
        </g>

        {/* ==================================================================
            1. VISTA SUPERIOR (TOP VIEW - SYMMETRICAL L/ZL & R/ZR)
            ================================================================== */}
        <g id="top-view">
          <path
            d="M 95 38 L 405 38 C 424 38, 432 46, 432 60 L 432 82 C 432 96, 424 104, 405 104 L 95 104 C 76 104, 68 96, 68 82 L 68 60 C 68 46, 76 38, 95 38 Z"
            fill="url(#ngpTopDeckGrad)"
            stroke="#94a3b8"
            strokeWidth="1.5"
            filter="url(#ngpDropShadow)"
          />
          <line x1="70" y1="71" x2="430" y2="71" stroke="#94a3b8" strokeWidth="0.8" opacity="0.5" />

          {/* ── LEFT SHOULDER CLUSTER (ZL = Back/Top, L = Front/Bottom) ── */}
          <g
            className={`gp-interactive-btn ${isKeyActive("btn_l2") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_l2")}
            cursor="pointer"
          >
            <rect
              x="80"
              y="44"
              width="80"
              height="24"
              rx="5"
              fill={isKeyActive("btn_l2") ? "url(#ngpTriggerActiveGrad)" : "url(#ngpTriggerDarkGrad)"}
              stroke={isKeyActive("btn_l2") ? "#38bdf8" : "#1e293b"}
              strokeWidth={isKeyActive("btn_l2") ? "2" : "1.2"}
              filter={isKeyActive("btn_l2") ? "url(#ngpActiveGlow)" : undefined}
            />
            <text
              x="120"
              y="60"
              fill={isKeyActive("btn_l2") ? "#ffffff" : "#f1f5f9"}
              fontSize="11"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              ZL
            </text>
          </g>

          <g
            className={`gp-interactive-btn ${isKeyActive("btn_l") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_l")}
            cursor="pointer"
          >
            <rect
              x="80"
              y="74"
              width="80"
              height="24"
              rx="4"
              fill={isKeyActive("btn_l") ? "url(#ngpTriggerActiveGrad)" : "url(#ngpTriggerDarkGrad)"}
              stroke={isKeyActive("btn_l") ? "#38bdf8" : "#1e293b"}
              strokeWidth={isKeyActive("btn_l") ? "2" : "1.2"}
              filter={isKeyActive("btn_l") ? "url(#ngpActiveGlow)" : undefined}
            />
            <text
              x="120"
              y="90"
              fill={isKeyActive("btn_l") ? "#ffffff" : "#f1f5f9"}
              fontSize="11"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              L
            </text>
          </g>

          {/* ── RIGHT SHOULDER CLUSTER (ZR = Back/Top, R = Front/Bottom) ── */}
          <g
            className={`gp-interactive-btn ${isKeyActive("btn_r2") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_r2")}
            cursor="pointer"
          >
            <rect
              x="340"
              y="44"
              width="80"
              height="24"
              rx="5"
              fill={isKeyActive("btn_r2") ? "url(#ngpTriggerActiveGrad)" : "url(#ngpTriggerDarkGrad)"}
              stroke={isKeyActive("btn_r2") ? "#38bdf8" : "#1e293b"}
              strokeWidth={isKeyActive("btn_r2") ? "2" : "1.2"}
              filter={isKeyActive("btn_r2") ? "url(#ngpActiveGlow)" : undefined}
            />
            <text
              x="380"
              y="60"
              fill={isKeyActive("btn_r2") ? "#ffffff" : "#f1f5f9"}
              fontSize="11"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              ZR
            </text>
          </g>

          <g
            className={`gp-interactive-btn ${isKeyActive("btn_r") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_r")}
            cursor="pointer"
          >
            <rect
              x="340"
              y="74"
              width="80"
              height="24"
              rx="4"
              fill={isKeyActive("btn_r") ? "url(#ngpTriggerActiveGrad)" : "url(#ngpTriggerDarkGrad)"}
              stroke={isKeyActive("btn_r") ? "#38bdf8" : "#1e293b"}
              strokeWidth={isKeyActive("btn_r") ? "2" : "1.2"}
              filter={isKeyActive("btn_r") ? "url(#ngpActiveGlow)" : undefined}
            />
            <text
              x="380"
              y="90"
              fill={isKeyActive("btn_r") ? "#ffffff" : "#f1f5f9"}
              fontSize="11"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              R
            </text>
          </g>
        </g>

        {/* ==================================================================
            2. VISTA FRONTAL
            ================================================================== */}
        <g id="front-view">
          {/* ── SHOULDER BUMPERS (ANCHORED DEEP INSIDE BODY, SMOOTH CURVATURE) ── */}
          {/* Left Bumper (L) */}
          <g
            className={`gp-interactive-btn ${isKeyActive("btn_l") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_l")}
            cursor="pointer"
          >
            <path
              d="M 86 148 C 86 130, 98 120, 118 120 L 158 120 C 168 120, 172 126, 172 148 Z"
              fill={isKeyActive("btn_l") ? "#0284c7" : "url(#ngpTriggerDarkGrad)"}
              stroke={isKeyActive("btn_l") ? "#38bdf8" : "#475569"}
              strokeWidth="1.2"
              filter={isKeyActive("btn_l") ? "url(#ngpActiveGlow)" : undefined}
            />
          </g>

          {/* Right Bumper (R) */}
          <g
            className={`gp-interactive-btn ${isKeyActive("btn_r") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_r")}
            cursor="pointer"
          >
            <path
              d="M 414 148 C 414 130, 402 120, 382 120 L 342 120 C 332 120, 328 126, 328 148 Z"
              fill={isKeyActive("btn_r") ? "#0284c7" : "url(#ngpTriggerDarkGrad)"}
              stroke={isKeyActive("btn_r") ? "#38bdf8" : "#475569"}
              strokeWidth="1.2"
              filter={isKeyActive("btn_r") ? "url(#ngpActiveGlow)" : undefined}
            />
          </g>

          {/* ── LOWER ANALOG STICK PODS (PROTRUDE BELOW FLAT BASE) ── */}
          {/* Left Pod Outer Collar (Beveled White Dome) */}
          <circle
            cx="190"
            cy="250"
            r="30"
            fill="url(#ngpPodCollarGrad)"
            stroke="#94a3b8"
            strokeWidth="1.5"
            filter="url(#ngpPodShadow)"
          />

          {/* Right Pod Outer Collar (Beveled White Dome) */}
          <circle
            cx="310"
            cy="250"
            r="30"
            fill="url(#ngpPodCollarGrad)"
            stroke="#94a3b8"
            strokeWidth="1.5"
            filter="url(#ngpPodShadow)"
          />

          {/* ── MAIN SNES PILL BODY (COVERS BUMPERS AT TOP, STRAIGHT BASE AT BOTTOM) ── */}
          <path
            d="M 130 130 
               L 370 130 
               C 405 130, 434 158, 434 193 
               C 434 228, 405 256, 370 256 
               L 130 256 
               C 95 256, 66 228, 66 193 
               C 66 158, 95 130, 130 130 Z"
            fill="url(#ngpBodyGrad)"
            stroke="#9ca3af"
            strokeWidth="2"
            filter="url(#ngpDropShadow)"
          />

          {/* Mold Inner Highlight Line */}
          <path
            d="M 130 132 L 370 132 C 402 132, 431 159, 431 193 C 431 226, 402 254, 370 254 L 130 254"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.45"
          />

          {/* Straight bottom line between pods */}
          <line x1="220" y1="256" x2="280" y2="256" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Raised Pod Front Bezels */}
          <circle
            cx="190"
            cy="250"
            r="29"
            fill="url(#ngpPodCollarGrad)"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />
          <circle
            cx="310"
            cy="250"
            r="29"
            fill="url(#ngpPodCollarGrad)"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />

          {/* Center Brand Text */}
          <text
            x="250"
            y="158"
            fill="#475569"
            fontSize="10"
            fontWeight="900"
            fontFamily="Impact, Arial Black, system-ui, sans-serif"
            letterSpacing="0.08em"
            textAnchor="middle"
          >
            NG+ GAMEPAD
          </text>

          {/* ── LEFT CLUSTER: D-PAD (cx=135, cy=193, RADIUS 48) ── */}
          <circle cx="135" cy="193" r="48" fill="url(#ngpDpadWellGrad)" stroke="#94a3b8" strokeWidth="1.5" />

          {/* D-Pad Base Cross */}
          <path
            d="M 122.5 158 H 147.5 V 180.5 H 170 V 205.5 H 147.5 V 228 H 122.5 V 205.5 H 100 V 180.5 H 122.5 Z"
            fill="url(#ngpDpadCrossGrad)"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="135" cy="193" r="10" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* D-Pad UP */}
          <g
            className={`gp-interactive-btn ${isKeyActive("dpad_up") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("dpad_up")}
            cursor="pointer"
          >
            <rect
              x="122.5"
              y="158"
              width="25"
              height="22.5"
              rx="2"
              fill={isKeyActive("dpad_up") ? "#0284c7" : "transparent"}
              filter={isKeyActive("dpad_up") ? "url(#ngpActiveGlow)" : undefined}
            />
            <path d="M 135 165 L 128 174 H 142 Z" fill={isKeyActive("dpad_up") ? "#ffffff" : "#64748b"} />
          </g>

          {/* D-Pad DOWN */}
          <g
            className={`gp-interactive-btn ${isKeyActive("dpad_down") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("dpad_down")}
            cursor="pointer"
          >
            <rect
              x="122.5"
              y="205.5"
              width="25"
              height="22.5"
              rx="2"
              fill={isKeyActive("dpad_down") ? "#0284c7" : "transparent"}
              filter={isKeyActive("dpad_down") ? "url(#ngpActiveGlow)" : undefined}
            />
            <path d="M 135 221 L 128 212 H 142 Z" fill={isKeyActive("dpad_down") ? "#ffffff" : "#64748b"} />
          </g>

          {/* D-Pad LEFT */}
          <g
            className={`gp-interactive-btn ${isKeyActive("dpad_left") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("dpad_left")}
            cursor="pointer"
          >
            <rect
              x="100"
              y="180.5"
              width="22.5"
              height="25"
              rx="2"
              fill={isKeyActive("dpad_left") ? "#0284c7" : "transparent"}
              filter={isKeyActive("dpad_left") ? "url(#ngpActiveGlow)" : undefined}
            />
            <path d="M 107 193 L 116 186 V 200 Z" fill={isKeyActive("dpad_left") ? "#ffffff" : "#64748b"} />
          </g>

          {/* D-Pad RIGHT */}
          <g
            className={`gp-interactive-btn ${isKeyActive("dpad_right") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("dpad_right")}
            cursor="pointer"
          >
            <rect
              x="147.5"
              y="180.5"
              width="22.5"
              height="25"
              rx="2"
              fill={isKeyActive("dpad_right") ? "#0284c7" : "transparent"}
              filter={isKeyActive("dpad_right") ? "url(#ngpActiveGlow)" : undefined}
            />
            <path d="M 163 193 L 154 186 V 200 Z" fill={isKeyActive("dpad_right") ? "#ffffff" : "#64748b"} />
          </g>

          {/* ── CENTER: SELECT & START PILLS ── */}
          <g
            className={`gp-interactive-btn ${isKeyActive("btn_select") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_select")}
            cursor="pointer"
          >
            <rect
              x="222"
              y="188"
              width="22"
              height="10"
              rx="5"
              transform="rotate(-30, 233, 193)"
              fill={isKeyActive("btn_select") ? "#0284c7" : "url(#ngpPillGrad)"}
              stroke={isKeyActive("btn_select") ? "#38bdf8" : "#0f172a"}
              strokeWidth="1.2"
              filter={isKeyActive("btn_select") ? "url(#ngpActiveGlow)" : undefined}
            />
            <text
              x="229"
              y="215"
              fill="#475569"
              fontSize="7"
              fontWeight="900"
              fontStyle="italic"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              - SELECT
            </text>
          </g>

          <g
            className={`gp-interactive-btn ${isKeyActive("btn_start") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_start")}
            cursor="pointer"
          >
            <rect
              x="256"
              y="188"
              width="22"
              height="10"
              rx="5"
              transform="rotate(-30, 267, 193)"
              fill={isKeyActive("btn_start") ? "#0284c7" : "url(#ngpPillGrad)"}
              stroke={isKeyActive("btn_start") ? "#38bdf8" : "#0f172a"}
              strokeWidth="1.2"
              filter={isKeyActive("btn_start") ? "url(#ngpActiveGlow)" : undefined}
            />
            <text
              x="271"
              y="215"
              fill="#475569"
              fontSize="7"
              fontWeight="900"
              fontStyle="italic"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              + START
            </text>
          </g>

          {/* ── LOWER ANALOG STICKS (L3 & R3 - INSIDE RAISED POD COLLARS) ── */}
          {/* Left Analog Stick (L3) */}
          <g
            className={`gp-interactive-btn ${isLeftStickActive ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_l3")}
            cursor="pointer"
          >
            <circle cx="190" cy="250" r="23" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <circle
              cx="190"
              cy="250"
              r="19"
              fill="url(#ngpStickRimGrad)"
              stroke={isLeftStickActive ? "#38bdf8" : "#475569"}
              strokeWidth={isLeftStickActive ? "2.5" : "1.5"}
              filter={isLeftStickActive ? "url(#ngpActiveGlow)" : undefined}
            />
            <circle cx="190" cy="250" r="13" fill="url(#ngpStickDishGrad)" stroke="#1e293b" strokeWidth="1.2" />
            <text
              x="190"
              y="253.5"
              fill={isLeftStickActive ? "#38bdf8" : "#cbd5e1"}
              fontSize="8"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              L3
            </text>
          </g>

          {/* Right Analog Stick (R3) */}
          <g
            className={`gp-interactive-btn ${isRightStickActive ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_r3")}
            cursor="pointer"
          >
            <circle cx="310" cy="250" r="23" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
            <circle
              cx="310"
              cy="250"
              r="19"
              fill="url(#ngpStickRimGrad)"
              stroke={isRightStickActive ? "#38bdf8" : "#475569"}
              strokeWidth={isRightStickActive ? "2.5" : "1.5"}
              filter={isRightStickActive ? "url(#ngpActiveGlow)" : undefined}
            />
            <circle cx="310" cy="250" r="13" fill="url(#ngpStickDishGrad)" stroke="#1e293b" strokeWidth="1.2" />
            <text
              x="310"
              y="253.5"
              fill={isRightStickActive ? "#38bdf8" : "#cbd5e1"}
              fontSize="8"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              R3
            </text>
          </g>

          {/* ── RIGHT CLUSTER: ACTION BUTTONS (cx=365, cy=193, RADIUS 48) ── */}
          <circle cx="365" cy="193" r="48" fill="#475569" stroke="#334155" strokeWidth="1.5" />

          {/* CAPSULE 1: Y to X */}
          <rect
            x="322.5"
            y="168.5"
            width="58"
            height="22"
            rx="11"
            transform="rotate(-45, 351.5, 179.5)"
            fill="#e2e8f0"
            opacity="0.9"
          />

          {/* CAPSULE 2: B to A */}
          <rect
            x="349.5"
            y="195.5"
            width="58"
            height="22"
            rx="11"
            transform="rotate(-45, 378.5, 206.5)"
            fill="#e2e8f0"
            opacity="0.9"
          />

          {/* Button X (Top - Royal Blue, diameter 19, radius 9.5) */}
          <g
            className={`gp-interactive-btn ${isKeyActive("btn_x") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_x")}
            cursor="pointer"
          >
            <circle
              cx="365"
              cy="166"
              r="9.5"
              fill={isKeyActive("btn_x") ? "#3b82f6" : "#1d4ed8"}
              stroke={isKeyActive("btn_x") ? "#bfdbfe" : "#1e3a8a"}
              strokeWidth={isKeyActive("btn_x") ? "2" : "1.2"}
              filter={isKeyActive("btn_x") ? "url(#ngpActiveGlow)" : undefined}
            />
            <ellipse cx="362.5" cy="162.5" rx="3.5" ry="1.8" fill="rgba(255,255,255,0.45)" />
            <text
              x="365"
              y="153"
              fill="#cbd5e1"
              fontSize="8.5"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              {labelX}
            </text>
          </g>

          {/* Button Y (Left - Emerald Green, diameter 19, radius 9.5) */}
          <g
            className={`gp-interactive-btn ${isKeyActive("btn_y") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_y")}
            cursor="pointer"
          >
            <circle
              cx="338"
              cy="193"
              r="9.5"
              fill={isKeyActive("btn_y") ? "#22c55e" : "#15803d"}
              stroke={isKeyActive("btn_y") ? "#bbf7d0" : "#14532d"}
              strokeWidth={isKeyActive("btn_y") ? "2" : "1.2"}
              filter={isKeyActive("btn_y") ? "url(#ngpActiveGlow)" : undefined}
            />
            <ellipse cx="335.5" cy="189.5" rx="3.5" ry="1.8" fill="rgba(255,255,255,0.45)" />
            <text
              x="324"
              y="196"
              fill="#cbd5e1"
              fontSize="8.5"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              {labelY}
            </text>
          </g>

          {/* Button B (Bottom - Golden Yellow, diameter 19, radius 9.5) */}
          <g
            className={`gp-interactive-btn ${isKeyActive("btn_b") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_b")}
            cursor="pointer"
          >
            <circle
              cx="365"
              cy="220"
              r="9.5"
              fill={isKeyActive("btn_b") ? "#eab308" : "#ca8a04"}
              stroke={isKeyActive("btn_b") ? "#fef08a" : "#713f12"}
              strokeWidth={isKeyActive("btn_b") ? "2" : "1.2"}
              filter={isKeyActive("btn_b") ? "url(#ngpActiveGlow)" : undefined}
            />
            <ellipse cx="362.5" cy="216.5" rx="3.5" ry="1.8" fill="rgba(255,255,255,0.45)" />
            <text
              x="365"
              y="235"
              fill="#cbd5e1"
              fontSize="8.5"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              {labelB}
            </text>
          </g>

          {/* Button A (Right - Crimson Red, diameter 19, radius 9.5) */}
          <g
            className={`gp-interactive-btn ${isKeyActive("btn_a") ? "gp-active" : ""}`}
            onClick={() => handleKeyClick("btn_a")}
            cursor="pointer"
          >
            <circle
              cx="392"
              cy="193"
              r="9.5"
              fill={isKeyActive("btn_a") ? "#ef4444" : "#b91c1c"}
              stroke={isKeyActive("btn_a") ? "#fecaca" : "#7f1d1d"}
              strokeWidth={isKeyActive("btn_a") ? "2" : "1.2"}
              filter={isKeyActive("btn_a") ? "url(#ngpActiveGlow)" : undefined}
            />
            <ellipse cx="389.5" cy="189.5" rx="3.5" ry="1.8" fill="rgba(255,255,255,0.45)" />
            <text
              x="406"
              y="196"
              fill="#cbd5e1"
              fontSize="8.5"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
              textAnchor="middle"
            >
              {labelA}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};

export default GamepadSvg;
