import { useState, useEffect, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import type { Section, Game, LayoutStyle } from "../types";
import { HomeIcon, LibraryIcon, HeartIcon, GearIcon, TagIcon, CastIcon, MaximizeIcon, MinimizeIcon, BookIcon } from "./icons";
import { VinylPlayer } from "./VinylPlayer";
import { getLocalizedGenreName, normalizeGenre } from "../lib/genreLocalization";
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
  layoutStyle?: LayoutStyle;
  currentProfile?: string;
  profiles?: string[];
  onProfileSwitch?: (name: string) => void;
  onOpenCast?: () => void;
  onOpenGuide?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  settingsBadge?: boolean;
}

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
  onOpenGuide,
  isFullscreen = false,
  onToggleFullscreen,
  settingsBadge = false,
}: Props) {
  const { t } = useTranslation();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const isImmersive = layoutStyle === "immersive";
  const isArcade = layoutStyle === "arcade";
  const isCollapsed = isImmersive || isArcade ? true : collapsed;

  const navItems: { section: Section; icon: ComponentType; label: string }[] = [
    { section: "home", icon: HomeIcon, label: t("sidebar.home") },
    { section: "library", icon: LibraryIcon, label: t("sidebar.library") },
    { section: "favorites", icon: HeartIcon, label: t("sidebar.favorites") },
  ];

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
    <aside
      className={`sidebar ${isCollapsed ? "collapsed" : ""} ${
        isImmersive ? "sidebar-immersive" : ""
      } ${isArcade ? "sidebar-arcade" : ""}`}
    >
      <div
        className="sidebar-logo"
        onClick={isImmersive || isArcade ? undefined : onToggle}
        title={isImmersive || isArcade ? "GameFlix" : isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        style={{ cursor: isImmersive || isArcade ? "default" : "pointer" }}
      >
        {isCollapsed ? "NG+" : "NewGame+"}
      </div>

      <nav className="sidebar-nav">
        <ul>
          {navItems.map((item) => (
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
                title={t("sidebar.genres")}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate("genres");
                }}
              >
                <span className="sidebar-icon"><TagIcon /></span>
                {!isCollapsed && <span className="sidebar-label">{t("sidebar.genres")}</span>}
              </a>
            </li>
          )}
        </ul>
      </nav>

      {!isCollapsed && genres.length > 0 && (
        <div className="sidebar-genres">
          <div className="sidebar-genres-header">
            {t("sidebar.genres").toUpperCase()} {company ? `• ${company}` : ""}
          </div>
          <ul>
            {genres.slice(0, 6).map((g) => {
              const localizedName = getLocalizedGenreName(g.name, t);
              return (
                <li key={g.name}>
                  <a
                    href="#"
                    className={section === "genre" && normalizeGenre(selectedGenre) === normalizeGenre(g.name) ? "active" : ""}
                    title={localizedName}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectGenre(g.name);
                    }}
                  >
                    <span className="sidebar-label">{localizedName}</span>
                    <span className="sidebar-genre-count">{g.count}</span>
                  </a>
                </li>
              );
            })}
          </ul>
          {genres.length > 6 && (
            <button
              type="button"
              className="sidebar-genres-explore-btn"
              onClick={() => onNavigate("genres")}
              title={t("sidebar.exploreAllGenres")}
            >
              <span>{t("sidebar.exploreAllGenres")}</span>
              <span className="sidebar-genres-explore-arrow">→</span>
            </button>
          )}
        </div>
      )}

      <div className="sidebar-bottom">
        {!(isImmersive || isArcade) && (
          <>
            <div className="sidebar-vinyl-wrap">
              <VinylPlayer games={games} collapsed={isCollapsed} mode={isCollapsed ? "collapsed" : "sidebar"} />
            </div>

            <div className="sidebar-divider" />

            <a
              href="#"
              className={`sidebar-settings ${section === "settings" ? "active" : ""}`}
              title={isCollapsed ? t("sidebar.settings") : undefined}
              onClick={(e) => {
                e.preventDefault();
                onNavigate("settings");
              }}
            >
              <span className="sidebar-icon"><GearIcon /></span>
              {!isCollapsed && <span className="sidebar-label">{t("sidebar.settings")}</span>}
              {settingsBadge && <span className="settings-pill-dot" title={t("settings.emulators.updatesFound")} />}
            </a>
          </>
        )}

        {(isImmersive || isArcade) && (
          <div className="sidebar-immersive-bottom-actions">
            {onToggleFullscreen && (
              <button
                type="button"
                className="sidebar-fullscreen-btn"
                onClick={onToggleFullscreen}
                title={isFullscreen ? "Salir de pantalla completa (F11)" : "Pantalla completa (F11)"}
                aria-label="Pantalla completa"
              >
                {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
              </button>
            )}

            {onOpenCast && (
              <button
                type="button"
                className="sidebar-cast-btn"
                onClick={onOpenCast}
                title={t("cast.title")}
                aria-label={t("cast.title")}
              >
                <CastIcon />
              </button>
            )}

            {onOpenGuide && (
              <button
                type="button"
                className="sidebar-guide-btn"
                onClick={onOpenGuide}
                title="Guía de Inicio - NewGame+"
                aria-label="Guía de Inicio - NewGame+"
              >
                <BookIcon />
              </button>
            )}

            <div className="sidebar-profile-wrap" onClick={(e) => e.stopPropagation()}>
              <div
                className="sidebar-profile-avatar"
                onClick={() => setProfileMenuOpen((v) => !v)}
                title={`${t("settings.tabs.profiles")}: ${currentProfile}`}
              >
                {currentProfile.charAt(0).toUpperCase()}
              </div>
            {profileMenuOpen && (
              <div className="sidebar-profile-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="sidebar-profile-dropdown-header">{t("settings.tabs.profiles")}</div>
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
                {onOpenGuide && (
                  <button
                    className="sidebar-profile-dropdown-item"
                    onClick={() => {
                      onOpenGuide();
                      setProfileMenuOpen(false);
                    }}
                  >
                    <BookIcon /> Guía de Inicio (NewGame+)
                  </button>
                )}
                <button
                  className="sidebar-profile-dropdown-item"
                  onClick={() => {
                    onNavigate("settings");
                    setProfileMenuOpen(false);
                  }}
                >
                  <GearIcon /> {t("sidebar.settings")}
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
