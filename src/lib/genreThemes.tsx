import React from "react";

export interface GenreTheme {
  color: string;
  gradient: string;
  glow: string;
  iconName: string;
}

export const GENRE_THEMES: Record<string, GenreTheme> = {
  // Acción
  accion: {
    color: "#ff7a00",
    gradient: "linear-gradient(135deg, rgba(255, 122, 0, 0.5) 0%, rgba(18, 12, 8, 0.92) 100%)",
    glow: "rgba(255, 122, 0, 0.55)",
    iconName: "swords",
  },
  action: {
    color: "#ff7a00",
    gradient: "linear-gradient(135deg, rgba(255, 122, 0, 0.5) 0%, rgba(18, 12, 8, 0.92) 100%)",
    glow: "rgba(255, 122, 0, 0.55)",
    iconName: "swords",
  },
  // Aventura
  aventura: {
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.5) 0%, rgba(20, 16, 10, 0.92) 100%)",
    glow: "rgba(245, 158, 11, 0.55)",
    iconName: "compass",
  },
  adventure: {
    color: "#f59e0b",
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.5) 0%, rgba(20, 16, 10, 0.92) 100%)",
    glow: "rgba(245, 158, 11, 0.55)",
    iconName: "compass",
  },
  // Rol / RPG
  rpg: {
    color: "#a855f7",
    gradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.5) 0%, rgba(18, 10, 26, 0.92) 100%)",
    glow: "rgba(168, 85, 247, 0.55)",
    iconName: "shield",
  },
  rol: {
    color: "#a855f7",
    gradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.5) 0%, rgba(18, 10, 26, 0.92) 100%)",
    glow: "rgba(168, 85, 247, 0.55)",
    iconName: "shield",
  },
  "role-playing": {
    color: "#a855f7",
    gradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.5) 0%, rgba(18, 10, 26, 0.92) 100%)",
    glow: "rgba(168, 85, 247, 0.55)",
    iconName: "shield",
  },
  // Carreras / Racing
  carreras: {
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.5) 0%, rgba(8, 20, 26, 0.92) 100%)",
    glow: "rgba(6, 182, 212, 0.55)",
    iconName: "flag",
  },
  racing: {
    color: "#06b6d4",
    gradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.5) 0%, rgba(8, 20, 26, 0.92) 100%)",
    glow: "rgba(6, 182, 212, 0.55)",
    iconName: "flag",
  },
  // Deportes / Sports
  deportes: {
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.5) 0%, rgba(10, 16, 28, 0.92) 100%)",
    glow: "rgba(59, 130, 246, 0.55)",
    iconName: "trophy",
  },
  sports: {
    color: "#3b82f6",
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.5) 0%, rgba(10, 16, 28, 0.92) 100%)",
    glow: "rgba(59, 130, 246, 0.55)",
    iconName: "trophy",
  },
  // Lucha / Pelea
  lucha: {
    color: "#ef4444",
    gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.5) 0%, rgba(26, 10, 10, 0.92) 100%)",
    glow: "rgba(239, 68, 68, 0.55)",
    iconName: "swords",
  },
  fighting: {
    color: "#ef4444",
    gradient: "linear-gradient(135deg, rgba(239, 68, 68, 0.5) 0%, rgba(26, 10, 10, 0.92) 100%)",
    glow: "rgba(239, 68, 68, 0.55)",
    iconName: "swords",
  },
  // Disparos / Shooter
  shooter: {
    color: "#f43f5e",
    gradient: "linear-gradient(135deg, rgba(244, 63, 94, 0.5) 0%, rgba(26, 8, 14, 0.92) 100%)",
    glow: "rgba(244, 63, 94, 0.55)",
    iconName: "target",
  },
  disparos: {
    color: "#f43f5e",
    gradient: "linear-gradient(135deg, rgba(244, 63, 94, 0.5) 0%, rgba(26, 8, 14, 0.92) 100%)",
    glow: "rgba(244, 63, 94, 0.55)",
    iconName: "target",
  },
  // Plataformas
  plataformas: {
    color: "#10b981",
    gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.5) 0%, rgba(8, 24, 16, 0.92) 100%)",
    glow: "rgba(16, 185, 129, 0.55)",
    iconName: "sparkles",
  },
  platform: {
    color: "#10b981",
    gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.5) 0%, rgba(8, 24, 16, 0.92) 100%)",
    glow: "rgba(16, 185, 129, 0.55)",
    iconName: "sparkles",
  },
  platformer: {
    color: "#10b981",
    gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.5) 0%, rgba(8, 24, 16, 0.92) 100%)",
    glow: "rgba(16, 185, 129, 0.55)",
    iconName: "sparkles",
  },
  // Terror / Horror
  terror: {
    color: "#e11d48",
    gradient: "linear-gradient(135deg, rgba(225, 29, 72, 0.5) 0%, rgba(20, 6, 10, 0.95) 100%)",
    glow: "rgba(225, 29, 72, 0.55)",
    iconName: "skull",
  },
  horror: {
    color: "#e11d48",
    gradient: "linear-gradient(135deg, rgba(225, 29, 72, 0.5) 0%, rgba(20, 6, 10, 0.95) 100%)",
    glow: "rgba(225, 29, 72, 0.55)",
    iconName: "skull",
  },
  // Estrategia / Puzzle
  estrategia: {
    color: "#eab308",
    gradient: "linear-gradient(135deg, rgba(234, 179, 8, 0.5) 0%, rgba(24, 20, 8, 0.92) 100%)",
    glow: "rgba(234, 179, 8, 0.55)",
    iconName: "grid",
  },
  strategy: {
    color: "#eab308",
    gradient: "linear-gradient(135deg, rgba(234, 179, 8, 0.5) 0%, rgba(24, 20, 8, 0.92) 100%)",
    glow: "rgba(234, 179, 8, 0.55)",
    iconName: "grid",
  },
  puzzle: {
    color: "#14b8a6",
    gradient: "linear-gradient(135deg, rgba(20, 184, 166, 0.5) 0%, rgba(8, 24, 22, 0.92) 100%)",
    glow: "rgba(20, 184, 166, 0.55)",
    iconName: "grid",
  },
  // Simulación
  simulacion: {
    color: "#818cf8",
    gradient: "linear-gradient(135deg, rgba(129, 140, 248, 0.5) 0%, rgba(14, 14, 28, 0.92) 100%)",
    glow: "rgba(129, 140, 248, 0.55)",
    iconName: "sparkles",
  },
  simulation: {
    color: "#818cf8",
    gradient: "linear-gradient(135deg, rgba(129, 140, 248, 0.5) 0%, rgba(14, 14, 28, 0.92) 100%)",
    glow: "rgba(129, 140, 248, 0.55)",
    iconName: "sparkles",
  },
};

const DEFAULT_THEME: GenreTheme = {
  color: "#6366f1",
  gradient: "linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(15, 18, 26, 0.92) 100%)",
  glow: "rgba(99, 102, 241, 0.45)",
  iconName: "tag",
};

export function getGenreTheme(genreName: string): GenreTheme {
  if (!genreName) return DEFAULT_THEME;
  const clean = genreName.trim().toLowerCase();

  for (const [key, theme] of Object.entries(GENRE_THEMES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return theme;
    }
  }

  return DEFAULT_THEME;
}

export function renderGenreIcon(iconName: string): React.ReactElement {
  switch (iconName) {
    case "swords":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
          <line x1="13" y1="19" x2="19" y2="13" />
          <line x1="16" y1="16" x2="20" y2="20" />
          <line x1="19" y1="21" x2="21" y2="19" />
          <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5" />
          <line x1="5" y1="14" x2="9" y2="18" />
          <line x1="7" y1="17" x2="4" y2="20" />
          <line x1="3" y1="19" x2="5" y2="21" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      );
    case "flag":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
          <line x1="4" y1="22" x2="4" y2="15" />
        </svg>
      );
    case "trophy":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      );
    case "target":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    case "skull":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 10h.01M15 10h.01" />
          <path d="M8 20v-2h8v2M12 14v2" />
          <path d="M4 12a8 8 0 1 1 16 0c0 3-1 6-4 7l-1 2H9l-1-2c-3-1-4-4-4-7Z" />
        </svg>
      );
    case "compass":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    case "sparkles":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.912 5.885L20 10.8l-4.706 3.415L17.09 20 12 16.285 6.91 20l1.796-5.785L4 10.8l6.088-1.915L12 3z" />
        </svg>
      );
    case "grid":
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.83z" />
          <circle cx="7" cy="7" r="1" fill="currentColor" />
        </svg>
      );
  }
}
