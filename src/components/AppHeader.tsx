import type { Dispatch, RefObject, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import type { Game, LayoutStyle, Section } from "../types";
import type { SettingsSearchOption } from "../lib/settingsSearch";
import { getCoverUrl } from "../lib/tauri";
import { PLATFORM_COLORS } from "../lib/platforms";
import { ConsoleIcon } from "./ConsoleIcon";
import { VinylPlayer } from "./VinylPlayer";
import { GearIcon, SearchIcon, CloseIcon, CastIcon, MaximizeIcon, MinimizeIcon } from "./icons";

export interface AppHeaderProps {
  section: Section;
  setSection: Dispatch<SetStateAction<Section>>;
  layoutStyle: LayoutStyle;
  games: Game[];
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  searchDropdownOpen: boolean;
  setSearchDropdownOpen: Dispatch<SetStateAction<boolean>>;
  navbarSearchResults: Game[];
  searchInputRef: RefObject<HTMLInputElement | null>;
  setSelectedGame: Dispatch<SetStateAction<Game | null>>;
  settingsSearchQuery: string;
  setSettingsSearchQuery: Dispatch<SetStateAction<string>>;
  settingsSearchDropdownOpen: boolean;
  setSettingsSearchDropdownOpen: Dispatch<SetStateAction<boolean>>;
  filteredSettingsOptions: SettingsSearchOption[];
  handleSelectSettingsOption: (item: SettingsSearchOption) => void;
  settingsSearchInputRef: RefObject<HTMLInputElement | null>;
  isFullscreen: boolean;
  handleToggleFullscreen: () => void;
  setCastModalOpen: Dispatch<SetStateAction<boolean>>;
  currentProfile: string;
  profiles: string[];
  handleProfileSwitch: (name: string) => void;
  profileDropdownOpen: boolean;
  setProfileDropdownOpen: Dispatch<SetStateAction<boolean>>;
}

// ponytail: extraído de App.tsx sin cambios de lógica; solo recibe props.
export default function AppHeader(props: AppHeaderProps) {
  const { t, i18n } = useTranslation();
  const {
    section, setSection, layoutStyle, games,
    searchQuery, setSearchQuery, searchDropdownOpen, setSearchDropdownOpen,
    navbarSearchResults, searchInputRef, setSelectedGame,
    settingsSearchQuery, setSettingsSearchQuery,
    settingsSearchDropdownOpen, setSettingsSearchDropdownOpen,
    filteredSettingsOptions, handleSelectSettingsOption, settingsSearchInputRef,
    isFullscreen, handleToggleFullscreen, setCastModalOpen,
    currentProfile, profiles, handleProfileSwitch,
    profileDropdownOpen, setProfileDropdownOpen,
  } = props;

  return (
    <header className="app-header">
      <div className="app-header-left" />

      <div className="app-header-center">
        {section === "settings" ? (
          <div className="app-navbar-search app-settings-search">
            <div className="app-navbar-search-box">
              <span className="app-navbar-search-icon">
                <SearchIcon />
              </span>
              <input
                ref={settingsSearchInputRef}
                type="text"
                className="app-navbar-search-input"
                placeholder={t("search.settingsPlaceholder")}
                value={settingsSearchQuery}
                onFocus={() => setSettingsSearchDropdownOpen(true)}
                onChange={(e) => {
                  setSettingsSearchQuery(e.target.value);
                  setSettingsSearchDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSettingsSearchQuery("");
                    setSettingsSearchDropdownOpen(false);
                    settingsSearchInputRef.current?.blur();
                  } else if (e.key === "Enter" && filteredSettingsOptions.length > 0) {
                    handleSelectSettingsOption(filteredSettingsOptions[0]);
                  }
                }}
              />
              {settingsSearchQuery && (
                <button
                  type="button"
                  className="app-navbar-search-clear"
                  aria-label="Limpiar búsqueda"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSettingsSearchQuery("");
                    setSettingsSearchDropdownOpen(false);
                  }}
                >
                  <CloseIcon />
                </button>
              )}
            </div>

            {settingsSearchDropdownOpen && (
              <>
                <div
                  className="app-search-backdrop"
                  onClick={() => setSettingsSearchDropdownOpen(false)}
                />
                <div className="app-navbar-search-dropdown app-settings-search-dropdown" role="listbox">
                {filteredSettingsOptions.length > 0 ? (
                  <>
                    {!settingsSearchQuery.trim() && (
                      <div className="app-settings-search-hint-header">
                        <span>{i18n.language.startsWith("en") ? "Frequent settings & options:" : "Ajustes y opciones frecuentes:"}</span>
                      </div>
                    )}
                    {filteredSettingsOptions.map((item) => (
                      <div
                        key={item.id}
                        className="app-navbar-search-item app-settings-search-item"
                        role="option"
                        onClick={() => handleSelectSettingsOption(item)}
                      >
                        <div className="app-settings-search-item-icon">
                          {item.icon}
                        </div>
                        <div className="app-navbar-search-item-info">
                          <div className="app-settings-search-title-row">
                            <span className="app-navbar-search-item-title">{item.title}</span>
                            <span className="app-settings-search-badge">{item.category}</span>
                          </div>
                          {item.description && (
                            <span className="app-settings-search-desc">{item.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="app-navbar-search-no-results">
                    {t("search.noResults", { query: settingsSearchQuery })}
                  </div>
                )}
              </div>
              </>
            )}
          </div>
        ) : (
          <div className="app-navbar-search">
            <div className="app-navbar-search-box">
              <span className="app-navbar-search-icon">
                <SearchIcon />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="app-navbar-search-input"
                placeholder={t("search.gamesPlaceholder")}
                value={searchQuery}
                onFocus={() => setSearchDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchQuery("");
                    setSearchDropdownOpen(false);
                  } else if (e.key === "Enter" && navbarSearchResults.length > 0) {
                    setSelectedGame(navbarSearchResults[0]);
                    setSearchQuery("");
                    setSearchDropdownOpen(false);
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="app-navbar-search-clear"
                  aria-label="Limpiar búsqueda"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                    setSearchDropdownOpen(false);
                  }}
                >
                  <CloseIcon />
                </button>
              )}
            </div>

            {searchQuery.trim().length > 0 && searchDropdownOpen && (
              <>
                <div
                  className="app-search-backdrop"
                  onClick={() => setSearchDropdownOpen(false)}
                />
                <div className="app-navbar-search-dropdown" role="listbox">
                  {navbarSearchResults.length > 0 ? (
                    navbarSearchResults.map((game) => {
                      const coverSrc = getCoverUrl(game.cover_path);
                      const title = game.display_name || game.name;
                      const platColor = PLATFORM_COLORS[game.platform] || "var(--accent)";
                      return (
                        <div
                          key={game.id}
                          className="app-navbar-search-item"
                          role="option"
                          onClick={() => {
                            setSelectedGame(game);
                            setSearchQuery("");
                            setSearchDropdownOpen(false);
                          }}
                        >
                          <div className="app-navbar-search-item-thumb">
                            {coverSrc ? (
                              <img src={coverSrc} alt={title} className="app-navbar-search-item-img" />
                            ) : (
                              <div className="app-navbar-search-item-placeholder">
                                {(title[0] || "?").toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="app-navbar-search-item-info">
                            <span className="app-navbar-search-item-title">{title}</span>
                            <span className="app-navbar-search-item-meta">
                              <span
                                className="app-navbar-search-item-plat"
                                style={{
                                  borderColor: platColor,
                                  color: platColor,
                                }}
                              >
                                <ConsoleIcon platform={game.platform} size={11} />
                                <span>{game.platform}</span>
                              </span>
                              {game.release_year && (
                                <span className="app-navbar-search-item-year">{game.release_year}</span>
                              )}
                              {game.genre && (
                                <span className="app-navbar-search-item-genre">{game.genre}</span>
                              )}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="app-navbar-search-no-results">
                      {t("search.noResults", { query: searchQuery })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="app-header-right">
        {layoutStyle === "immersive" ? (
          <VinylPlayer games={games} mode="navbar" />
        ) : (
          <div className="app-header-actions">
            <button
              type="button"
              className="app-fullscreen-btn"
              onClick={handleToggleFullscreen}
              title={isFullscreen ? "Salir de pantalla completa (F11)" : "Pantalla completa (F11)"}
              aria-label="Pantalla completa"
            >
              {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
            </button>

            <button
              type="button"
              className="app-cast-btn"
              onClick={() => setCastModalOpen(true)}
              title={t("cast.title")}
              aria-label={t("cast.title")}
            >
              <CastIcon />
              <span className="app-cast-btn-label">{t("sidebar.cast")}</span>
            </button>

            <div className="app-profile-wrap">
              <div
                className="app-profile"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileDropdownOpen((v) => !v);
                }}
                title={`${t("settings.tabs.profiles")}: ${currentProfile}`}
              >
                {currentProfile.charAt(0).toUpperCase()}
              </div>
              {profileDropdownOpen && (
                <div className="app-profile-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="app-profile-dropdown-header">{t("settings.tabs.profiles")}</div>
                  {profiles.map((p) => (
                    <button
                      key={p}
                      className={`app-profile-dropdown-item ${p === currentProfile ? "active" : ""}`}
                      onClick={() => {
                        handleProfileSwitch(p);
                        setProfileDropdownOpen(false);
                      }}
                    >
                      {p === currentProfile ? "● " : ""}{p}
                    </button>
                  ))}
                  <div className="app-profile-dropdown-divider" />
                  <button
                    className="app-profile-dropdown-item"
                    onClick={() => {
                      setSection("settings");
                      setProfileDropdownOpen(false);
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
    </header>
  );
}
