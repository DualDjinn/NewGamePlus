import React from "react";

interface ConsoleIconProps {
  platform: string;
  size?: number;
  className?: string;
  color?: string;
}

export const ConsoleIcon: React.FC<ConsoleIconProps> = ({
  platform,
  size = 14,
  className = "",
  color = "currentColor",
}) => {
  const p = (platform || "").toUpperCase().trim();

  // PlayStation family (PS1, PS2, PS3, PSP, PSX)
  if (p === "PS1" || p === "PSX" || p.includes("PLAYSTATION 1")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        className={className}
        aria-hidden="true"
      >
        <path d="M8.2 2.5C7.4 2.5 6.7 3.1 6.7 3.9v10.8l4.4-1.5V6.7c0-.8.6-1.4 1.4-1.4.8 0 1.4.6 1.4 1.4v7.7l-4.4 1.5 8.9 3.2c1.7.6 3.1-.4 3.1-2.1v-2.3c0-1.4-1.1-2.5-2.5-2.5h-2.1V7.9c0-3-2.4-5.4-5.4-5.4zM2.8 17.6c-.6.3-1 .9-1 1.6 0 1.2 1.2 2 2.4 1.6l8.8-3.1-3.6-1.3-6.6 2.8zm11 1.7l6.8 2.2c1.1.4 2.4-.4 2.4-1.6 0-.6-.4-1.2-1-1.4l-8.2-2.7v3.5z" />
      </svg>
    );
  }

  if (p === "PS2" || p.includes("PLAYSTATION 2")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        className={className}
        aria-hidden="true"
      >
        <path d="M2 5h7v3H5v2h4v3H2V5zm8 0h9v3h-6v2h6v6h-9v-3h6v-2h-6V5zm10 8h2v5h-2v-5z" />
      </svg>
    );
  }

  if (p === "PS3" || p.includes("PLAYSTATION 3")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        className={className}
        aria-hidden="true"
      >
        <path d="M3 6h11c2.2 0 4 1.8 4 4 0 1.2-.5 2.2-1.3 3 1.4.8 2.3 2.3 2.3 4 0 2.2-1.8 4-4 4H3v-3h11c.6 0 1-.4 1-1s-.4-1-1-1H7v-3h7c.6 0 1-.4 1-1s-.4-1-1-1H3V6z" />
      </svg>
    );
  }

  if (p === "PSP" || p.includes("PORTABLE")) {
    return (
      <svg
        width={size * 1.3}
        height={size}
        viewBox="0 0 28 20"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <rect x="2" y="3" width="24" height="14" rx="7" />
        <rect x="7" y="5" width="14" height="10" rx="1.5" fill={color} fillOpacity="0.2" />
        <circle cx="4.5" cy="10" r="1.2" fill={color} />
        <circle cx="23.5" cy="10" r="1.2" fill={color} />
      </svg>
    );
  }

  // Super Nintendo (SNES / SFC)
  if (p === "SNES" || p === "SFC" || p.includes("SUPER NINTENDO")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className={className}
        aria-hidden="true"
      >
        <circle cx="12" cy="5.5" r="3.2" fill="#22c55e" />
        <circle cx="18.5" cy="12" r="3.2" fill="#3b82f6" />
        <circle cx="12" cy="18.5" r="3.2" fill="#eab308" />
        <circle cx="5.5" cy="12" r="3.2" fill="#ef4444" />
      </svg>
    );
  }

  // Nintendo 64
  if (p === "N64" || p.includes("NINTENDO 64")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        className={className}
        aria-hidden="true"
      >
        <path d="M4 3h4v9.5l6-9.5h4v18h-4v-9.5l-6 9.5H4V3zm2 3v12h1V6H6zm11 0v12h1V6h-1z" />
      </svg>
    );
  }

  // Nintendo GameCube
  if (p === "GC" || p === "GCN" || p.includes("GAMECUBE")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
        <path d="M12 12l9-5M12 12v10M12 12L3 7" />
        <circle cx="12" cy="12" r="2.5" fill={color} />
      </svg>
    );
  }

  // Game Boy Advance
  if (p === "GBA" || p.includes("ADVANCE")) {
    return (
      <svg
        width={size * 1.3}
        height={size}
        viewBox="0 0 28 20"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M4 5c-1.5 2-2 6-2 10 0 2 2 3 5 3h14c3 0 5-1 5-3 0-4-.5-8-2-10-1-1.5-3-2-5-2H9C7 3 5 3.5 4 5z" />
        <rect x="8.5" y="6" width="11" height="8" rx="1" fill={color} fillOpacity="0.25" />
      </svg>
    );
  }

  // Game Boy / Game Boy Color
  if (p === "GB" || p === "GBC" || p.includes("GAME BOY")) {
    return (
      <svg
        width={size * 0.8}
        height={size}
        viewBox="0 0 18 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M2 3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a4 4 0 0 1-4 4H4a2 2 0 0 1-2-2V3z" />
        <rect x="4" y="3.5" width="10" height="8" rx="1" fill={color} fillOpacity="0.25" />
        <circle cx="6" cy="15.5" r="1.5" fill={color} />
        <circle cx="12" cy="16.5" r="1.2" fill={color} />
        <circle cx="14" cy="15" r="1.2" fill={color} />
      </svg>
    );
  }

  // Nintendo DS
  if (p === "NDS" || p === "DS" || p.includes("NINTENDO DS")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <rect x="3" y="2" width="18" height="20" rx="3" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <rect x="6" y="4" width="12" height="6" rx="1" fill={color} fillOpacity="0.25" />
        <rect x="6" y="14" width="12" height="6" rx="1" fill={color} fillOpacity="0.25" />
      </svg>
    );
  }

  // NES
  if (p === "NES" || p.includes("NINTENDO ENTERTAINMENT")) {
    return (
      <svg
        width={size * 1.3}
        height={size}
        viewBox="0 0 28 18"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <rect x="2" y="2" width="24" height="14" rx="2" />
        <path d="M6 6v6M3 9h6" strokeWidth="2" stroke={color} />
        <circle cx="18" cy="9" r="1.4" fill="#ef4444" stroke="none" />
        <circle cx="22" cy="9" r="1.4" fill="#ef4444" stroke="none" />
      </svg>
    );
  }

  // Sega (Genesis, Mega Drive, Master System, Dreamcast)
  if (p.includes("GENESIS") || p.includes("MEGA") || p === "MD" || p === "SMS" || p === "SEGA") {
    return (
      <svg
        width={size * 1.2}
        height={size}
        viewBox="0 0 26 18"
        fill={color}
        className={className}
        aria-hidden="true"
      >
        <path d="M3 4h19c1.5 0 2.5 1 2.5 2.5v5c0 1.5-1 2.5-2.5 2.5H3c-1.5 0-2.5-1-2.5-2.5v-5C.5 5 1.5 4 3 4zm2 3v4h2V7H5zm4 0v4h2V9h2v2h2V7H9zm8 0v4h2V7h-2z" />
      </svg>
    );
  }

  // Arcade / MAME / NeoGeo
  if (p === "MAME" || p === "NEOGEO" || p.includes("ARCADE") || p.includes("FBNEO")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M5 19h14M7 19l2-8h6l2 8" />
        <circle cx="12" cy="5" r="3.5" fill={color} />
        <line x1="12" y1="8.5" x2="12" y2="13" strokeWidth="2.5" />
      </svg>
    );
  }

  // PC / Windows
  if (p === "PC" || p.includes("WINDOWS") || p.includes("JUEGOS DE PC")) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={color}
        className={className}
        aria-hidden="true"
      >
        <path d="M3 5.4l7.6-1v7.1H3V5.4zm0 8.3h7.6v7.1l-7.6-1v-6.1zm8.7-9.5L21 2.8v8.7h-9.3V4.2zm0 8.5H21v8.7l-9.3-1.4v-7.3z" />
      </svg>
    );
  }

  // Fallback: Generic Retro Gamepad
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <path d="M6 12h4m-2-2v4m9-3h.01m2 2h.01" />
    </svg>
  );
};
