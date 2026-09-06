import { useState, useEffect, type ComponentType } from "react";
import type { Section, Game } from "../types";
import { HomeIcon, LibraryIcon, HeartIcon, GearIcon, TagIcon, CastIcon } from "./icons";
import { VinylPlayer } from "./VinylPlayer";
import "./Sidebar.css";

interface Props {
  section: Section;
  onNavigate: (s: Section) => void;
  collapsed: boolean;
  onToggle: () => void;
  genres: { name: string; count: number }[];
  selectedGenre: string | null;
  onSelectGenre: (name: string) => void;
  company?: string;
  games?: Game[];
  layoutStyle?: "classic" | "immersive";
  currentProfile?: string;
  profiles?: string[];
  onProfileSwitch?: (name: string) => void;
  onOpenCast?: () => void;
}

const NAV_ITEMS: { section: Section; icon: ComponentType; label: string }[] = [
  { section: "home", icon: HomeIcon, label: "Inicio" },
  { section: "library", icon: LibraryIcon, label: "Biblioteca" },
  { section: "favorites", icon: HeartIcon, label: "Favoritos" },
];

export default function Sidebar({
  section,
  onNavigate,
  collapsed,
  onToggle,
  genres,
  selectedGenre,
  onSelectGenre,
  company,
  games = [],
  layoutStyle = "classic",
  currentProfile = "Por defecto",
  profiles = [],
  onProfileSwitch,
  onOpenCast,
}: Props) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const isImmersive = layoutStyle === "immersive";
  const isCollapsed = isImmersive ? true : collapsed;

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".sidebar-profile-wrap")) {
        setProfileMenuOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [profileMenuOpen]);

  return (
    <aside className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isImmersive ? "sidebar-immersive" : ""}`}>
      <div
        className="sidebar-logo"
        onClick={isImmersive ? undefined : onToggle}
        title={isImmersive ? "GameFlix" : (isCollapsed ? "Expandir" : "Colapsar")}
        style={{ cursor: isImmersive ? "default" : "pointer" }}
      >
        {isCollapsed ? "NG+" : "NewGame+"}
      </div>

      <nav className="sidebar-nav">
        <ul>
          {NAV_ITEMS.map((item) => (
            <li key={item.section}>
              <a
                href="#"
                className={section === item.section ? "active" : ""}
                title={isCollapsed ? item.label : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.section);
                }}
              >
                <span className="sidebar-icon"><item.icon /></span>
                {!isCollapsed && <span className="sidebar-label">{item.label}</span>}
              </a>
            </li>
          ))}
          {isCollapsed && genres.length > 0 && (
            <li>
              <a
                href="#"
                className={section === "genres" || section === "genre" ? "active" : ""}
                title="Géneros"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate("genres");
                }}
              >
                <span className="sidebar-icon"><TagIcon /></span>
              </a>
            </li>
          )}
        </ul>
      </nav>

      {!isCollapsed && genres.length > 0 && (
        <div className="sidebar-genres">
          <div className="sidebar-genres-header">
            GÉNEROS {company ? `• ${company}` : ""}
          </div>
          <ul>
            {genres.map((g) => (
              <li key={g.name}>
                <a
                  href="#"
                  className={section === "genre" && selectedGenre === g.name ? "active" : ""}
                  title={g.name}
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectGenre(g.name);
                  }}
                >
                  <span className="sidebar-label">{g.name}</span>
                  <span className="sidebar-genre-count">{g.count}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sidebar-bottom">
        {!isImmersive && (
          <>
            <div className="sidebar-vinyl-wrap">
              <VinylPlayer games={games} collapsed={isCollapsed} mode={isCollapsed ? "collapsed" : "sidebar"} />
            </div>

            <div className="sidebar-divider" />

            <a
              href="#"
              className={`sidebar-settings ${section === "settings" ? "active" : ""}`}
              title={isCollapsed ? "Configuración" : undefined}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("settings");
              }}
            >
              <span className="sidebar-icon"><GearIcon /></span>
              {!isCollapsed && <span className="sidebar-label">Configuración</span>}
            </a>
          </>
        )}

        {isImmersive && (
          <div className="sidebar-immersive-bottom-actions">
            {onOpenCast && (
              <button
                type="button"
                className="sidebar-cast-btn"
                onClick={onOpenCast}
                title="Transmitir a TV / Dispositivo"
                aria-label="Transmitir a TV"
              >
                <CastIcon />
              </button>
            )}

            <div className="sidebar-profile-wrap" onClick={(e) => e.stopPropagation()}>
              <div
                className="sidebar-profile-avatar"
                onClick={() => setProfileMenuOpen((v) => !v)}
                title={`Perfil: ${currentProfile}`}
              >
                {currentProfile.charAt(0).toUpperCase()}
              </div>
            {profileMenuOpen && (
              <div className="sidebar-profile-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="sidebar-profile-dropdown-header">Perfil actual</div>
                {profiles.map((p) => (
                  <button
                    key={p}
                    className={`sidebar-profile-dropdown-item ${p === currentProfile ? "active" : ""}`}
                    onClick={() => {
                      onProfileSwitch?.(p);
                      setProfileMenuOpen(false);
                    }}
                  >
                    {p === currentProfile ? "● " : ""}{p}
                  </button>
                ))}
                <div className="sidebar-profile-dropdown-divider" />
                <button
                  className="sidebar-profile-dropdown-item"
                  onClick={() => {
                    onNavigate("settings");
                    setProfileMenuOpen(false);
                  }}
                >
                  <GearIcon /> Configuración
                </button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </aside>
  );
}
