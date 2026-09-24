import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Game, Section, SettingsTab, GraphicsConsole } from "./types";
import { searchSettingsOptions, SETTINGS_OPTIONS, type SettingsSearchOption } from "./lib/settingsSearch";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  toggleFavorite,
  getCoverUrl,
  launchGame,
  isWindowFullscreen,
  toggleWindowFullscreen,
  saveSettings,
} from "./lib/tauri";
import HeroBanner from "./components/HeroBanner";
import CategoryRow from "./components/CategoryRow";
import GameCard from "./components/GameCard";
import GameDetailModal from "./components/GameDetailModal";
import Settings from "./components/Settings";
import Sidebar from "./components/Sidebar";
import CastModal from "./components/CastModal";
import AppHeader from "./components/AppHeader";
import ControllerHUD from "./components/ControllerHUD";
import SplashScreen from "./components/SplashScreen";
import ScanProgressHUD from "./components/ScanProgressHUD";
import ScanCompleteModal from "./components/ScanCompleteModal";
import OnboardingModal from "./components/OnboardingModal";
import { MusicProvider } from "./context/MusicContext";
import { useGamepad } from "./hooks/useGamepad";
import { useLibraryGames } from "./hooks/useLibraryGames";
import { useGenreCatalog } from "./hooks/useGenreCatalog";
import { useGameSearch } from "./hooks/useGameSearch";
import { getGenreTheme } from "./lib/genreThemes";
import { getLocalizedGenreName } from "./lib/genreLocalization";
import "./App.css";

function App() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>("home");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showNavFocus, setShowNavFocus] = useState(false);
  const [homeFocus, setHomeFocus] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [flatFocusIdx, setFlatFocusIdx] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("library");
  const [settingsGraphicsConsole, setSettingsGraphicsConsole] = useState<GraphicsConsole>("citra");
  const [settingsSearchQuery, setSettingsSearchQuery] = useState("");
  const [settingsSearchDropdownOpen, setSettingsSearchDropdownOpen] = useState(false);
  const settingsSearchInputRef = useRef<HTMLInputElement>(null);
  const [castModalOpen, setCastModalOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const prevSectionRef = useRef<Section>(section);

  // Hook 1: Library & Persistent State Management
  const {
    games,
    setGames,
    folders,
    setFolders,
    kioskMode,
    setKioskMode,
    scanning,
    loaded,
    scanMessage,
    setupStatus,
    theme,
    handleThemeChange,
    layoutStyle,
    handleLayoutStyleChange,
    scanCores,
    sortBy,
    setSortBy,
    profiles,
    currentProfile,
    scanProgress,
    platformCores,
    emulatorUpdates,
    sortGames,
    featured,
    recentlyPlayed,
    favorites,
    handleFavoriteChanged: onFavoriteChangedBase,
    handleScan,
    scanCompletedResult,
    dismissScanCompleted,
    handleProfilesChange,
    handlePlatformCoreChange,
    handleProfileSwitch,
  } = useLibraryGames({
    onRetroarchExitedCallback: (updatedGames) => {
      setSelectedGame((prev) => {
        if (!prev) return null;
        return updatedGames.find((g) => g.id === prev.id) ?? prev;
      });
    },
  });

  // Hook 2: Genre Catalog & Dynamic Categories
  const {
    selectedGenre,
    setSelectedGenre,
    selectedCompany,
    setSelectedCompany,
    effectiveCompany,
    availableCompanies,
    genreList,
    activeGenreGames,
    activeGenreSections,
    randomHomeCategories,
    selectRandomHomeCategories,
    homeRows,
  } = useGenreCatalog({
    games,
    section,
    sortGames,
    recentlyPlayed,
  });

  // Hook 3: Game Search & Library Filter
  const {
    searchQuery,
    setSearchQuery,
    searchInputRef,
    searchDropdownOpen,
    setSearchDropdownOpen,
    searchResults,
    navbarSearchResults,
    libraryGames,
    librarySections,
  } = useGameSearch({
    games,
    sortGames,
    selectedCompany,
  });

  const handleFavoriteChanged = useCallback(
    (gameId: string, isFav: boolean) => {
      onFavoriteChangedBase(gameId, isFav);
      setSelectedGame((prev) => (prev?.id === gameId ? { ...prev, favorite: isFav } : prev));
    },
    [onFavoriteChangedBase]
  );

  useEffect(() => {
    if (loaded) {
      const completed = localStorage.getItem("newgameplus_onboarding_completed");
      if (!completed && folders.length === 0 && games.length === 0) {
        setOnboardingOpen(true);
      }
    }
  }, [loaded, folders.length, games.length]);

  const handleCloseOnboarding = useCallback(() => {
    localStorage.setItem("newgameplus_onboarding_completed", "true");
    setOnboardingOpen(false);
  }, []);

  const handleAddFolderFromOnboarding = useCallback(async () => {
    try {
      const path = await openDialog({ directory: true, title: "Seleccionar carpeta de ROMs" });
      if (path && !folders.includes(path)) {
        const next = [...folders, path];
        setFolders(next);
        await saveSettings(next, kioskMode).catch(console.error);
      }
    } catch (e) {
      console.error("Folder picker failed:", e);
    }
  }, [folders, kioskMode, setFolders]);

  const filteredSettingsOptions = useMemo(() => {
    if (!settingsSearchQuery.trim()) {
      return SETTINGS_OPTIONS.slice(0, 8);
    }
    return searchSettingsOptions(settingsSearchQuery);
  }, [settingsSearchQuery]);

  const handleSelectSettingsOption = useCallback((item: SettingsSearchOption) => {
    setSettingsTab(item.tab);
    if (item.graphicsConsole) {
      setSettingsGraphicsConsole(item.graphicsConsole);
    }
    setSettingsSearchDropdownOpen(false);
    setSettingsSearchQuery("");
    settingsSearchInputRef.current?.blur();

    if (item.targetId) {
      setTimeout(() => {
        const el = document.getElementById(item.targetId!);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.classList.remove("settings-card-highlight-pulse");
          void el.offsetWidth;
          el.classList.add("settings-card-highlight-pulse");
          setTimeout(() => el.classList.remove("settings-card-highlight-pulse"), 2200);
        }
      }, 90);
    }
  }, []);

  // Splash Screen State
  const [splashEnabled, setSplashEnabled] = useState<boolean>(() => {
    return localStorage.getItem("gameflix_intro_enabled") !== "false";
  });
  const [splashSoundEnabled, setSplashSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem("gameflix_intro_sound") !== "false";
  });
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    return localStorage.getItem("gameflix_intro_enabled") !== "false";
  });

  const handleSplashEnabledChange = useCallback((enabled: boolean) => {
    setSplashEnabled(enabled);
    localStorage.setItem("gameflix_intro_enabled", enabled ? "true" : "false");
  }, []);

  const handleSplashSoundEnabledChange = useCallback((soundEnabled: boolean) => {
    setSplashSoundEnabled(soundEnabled);
    localStorage.setItem("gameflix_intro_sound", soundEnabled ? "true" : "false");
  }, []);

  const handlePreviewSplash = useCallback(() => {
    setShowSplash(true);
  }, []);

  // Sync and toggle fullscreen
  const handleToggleFullscreen = useCallback(async () => {
    const full = await toggleWindowFullscreen();
    setIsFullscreen(full);
  }, []);

  // Monitor F11 key to toggle fullscreen
  useEffect(() => {
    isWindowFullscreen().then(setIsFullscreen).catch(() => {});

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        handleToggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleToggleFullscreen]);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".app-profile-wrap")) {
        setProfileDropdownOpen(false);
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [profileDropdownOpen]);

  // Close search dropdown and clear search query on outside click
  useEffect(() => {
    if (!searchDropdownOpen && !searchQuery && !settingsSearchDropdownOpen && !settingsSearchQuery) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".app-navbar-search")) {
        setSearchDropdownOpen(false);
        setSearchQuery("");
        searchInputRef.current?.blur();
        if (section === "search") {
          setSection("home");
        }
        setSettingsSearchDropdownOpen(false);
        setSettingsSearchQuery("");
        settingsSearchInputRef.current?.blur();
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [searchDropdownOpen, searchQuery, section, settingsSearchDropdownOpen, settingsSearchQuery]);

  // Global error toast via custom event
  useEffect(() => {
    function onError(e: CustomEvent<string>) {
      setErrorMsg(e.detail);
      setTimeout(() => setErrorMsg(""), 4000);
    }
    window.addEventListener("app-error", onError as EventListener);
    return () => window.removeEventListener("app-error", onError as EventListener);
  }, []);

  useEffect(() => {
    if (section === "home") {
      if (prevSectionRef.current !== "home" || (randomHomeCategories.length === 0 && games.length > 0)) {
        selectRandomHomeCategories();
        setHomeFocus({ row: 0, col: 0 });
      }
    }
    prevSectionRef.current = section;
  }, [section, games, selectRandomHomeCategories, randomHomeCategories.length]);

  const currentFocusedGame = useMemo((): Game | null => {
    if (section === "home") {
      if (homeRows.length === 0) return null;
      const r = Math.min(Math.max(0, homeFocus.row), homeRows.length - 1);
      const row = homeRows[r];
      if (!row || row.games.length === 0) return null;
      const c = Math.min(Math.max(0, homeFocus.col), row.games.length - 1);
      return row.games[c] ?? null;
    }
    if (section === "library") {
      return libraryGames[flatFocusIdx] ?? null;
    }
    if (section === "favorites") {
      return favorites[flatFocusIdx] ?? null;
    }
    if (section === "search") {
      return searchResults[flatFocusIdx] ?? null;
    }
    if (section === "genre" && selectedGenre) {
      return activeGenreGames[flatFocusIdx] ?? null;
    }
    return null;
  }, [
    section,
    homeFocus,
    homeRows,
    libraryGames,
    favorites,
    searchResults,
    selectedGenre,
    activeGenreGames,
    flatFocusIdx,
  ]);

  const moveFocus = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      setShowNavFocus(true);
      if (section === "home") {
        if (homeRows.length === 0) return;
        setHomeFocus((prev) => {
          let r = Math.min(Math.max(0, prev.row), homeRows.length - 1);
          let c = prev.col;

          if (direction === "left") {
            c = Math.max(0, c - 1);
          } else if (direction === "right") {
            const rowGames = homeRows[r].games;
            c = Math.min(rowGames.length - 1, c + 1);
          } else if (direction === "up") {
            r = Math.max(0, r - 1);
            c = Math.min(c, homeRows[r].games.length - 1);
          } else if (direction === "down") {
            r = Math.min(homeRows.length - 1, r + 1);
            c = Math.min(c, homeRows[r].games.length - 1);
          }
          return { row: r, col: c };
        });
        return;
      }

      // For library grid or single-row sections
      const currentList =
        section === "library"
          ? libraryGames
          : section === "favorites"
          ? favorites
          : section === "search"
          ? searchResults
          : section === "genre" && selectedGenre
          ? activeGenreGames
          : [];

      if (currentList.length === 0) return;

      const GRID_COLS = section === "library" || section === "genre" ? 5 : currentList.length;

      setFlatFocusIdx((prev) => {
        let idx = Math.min(Math.max(0, prev), currentList.length - 1);
        if (direction === "left") {
          idx = Math.max(0, idx - 1);
        } else if (direction === "right") {
          idx = Math.min(currentList.length - 1, idx + 1);
        } else if (direction === "up") {
          idx = Math.max(0, idx - GRID_COLS);
        } else if (direction === "down") {
          idx = Math.min(currentList.length - 1, idx + GRID_COLS);
        }
        return idx;
      });
    },
    [section, homeRows, libraryGames, favorites, searchResults, selectedGenre, activeGenreGames]
  );

  const SECTIONS: Section[] = ["home", "library", "favorites", "genres", "settings"];
  const SETTINGS_TABS: SettingsTab[] = [
    "library",
    "appearance",
    "graphics",
    "sound",
    "emulation",
    "emulators",
    "integrations",
    "profiles",
    "system",
  ];

  const handlePrevTab = useCallback(() => {
    setSection((curr) => {
      const idx = SECTIONS.indexOf(curr);
      return SECTIONS[(idx - 1 + SECTIONS.length) % SECTIONS.length];
    });
  }, []);

  const handleNextTab = useCallback(() => {
    setSection((curr) => {
      const idx = SECTIONS.indexOf(curr);
      return SECTIONS[(idx + 1) % SECTIONS.length];
    });
  }, []);

  // Global gamepad controller navigation
  useGamepad({
    onNavigate: (dir) => {
      setShowNavFocus(true);
      if (section === "settings") {
        const focusables = Array.from(
          document.querySelectorAll<HTMLElement>(
            ".settings-container button, .settings-container input, .settings-container select, .settings-nav-btn"
          )
        ).filter((el) => el.offsetParent !== null && !el.hasAttribute("disabled"));

        if (focusables.length > 0) {
          const active = document.activeElement as HTMLElement | null;
          const currentIdx = active ? focusables.indexOf(active) : -1;
          if (dir === "down" || dir === "right") {
            const nextIdx = currentIdx < focusables.length - 1 ? currentIdx + 1 : 0;
            focusables[nextIdx]?.focus();
            focusables[nextIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          } else if (dir === "up" || dir === "left") {
            const prevIdx = currentIdx > 0 ? currentIdx - 1 : focusables.length - 1;
            focusables[prevIdx]?.focus();
            focusables[prevIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        }
      } else if (selectedGame) {
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key:
              dir === "left"
                ? "ArrowLeft"
                : dir === "right"
                ? "ArrowRight"
                : dir === "up"
                ? "ArrowUp"
                : "ArrowDown",
          })
        );
      } else {
        moveFocus(dir);
      }
    },
    onConfirm: () => {
      setShowNavFocus(true);
      if (section === "settings") {
        const active = document.activeElement as HTMLElement | null;
        if (active && active.closest(".settings-container")) {
          active.click();
        }
      } else if (selectedGame) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      } else if (currentFocusedGame) {
        setSelectedGame(currentFocusedGame);
      }
    },
    onCancel: () => {
      if (onboardingOpen) {
        handleCloseOnboarding();
      } else if (scanCompletedResult) {
        dismissScanCompleted();
      } else if (selectedGame) {
        setSelectedGame(null);
      } else if (section !== "home") {
        setSection("home");
      }
    },
    onFavorite: async () => {
      const target = selectedGame ?? currentFocusedGame;
      if (target) {
        try {
          const isFav = await toggleFavorite(target.id);
          handleFavoriteChanged(target.id, isFav);
        } catch (e) {
          console.error("Favorite failed:", e);
        }
      }
    },
    onQuickPlay: async () => {
      const target = selectedGame ?? currentFocusedGame;
      if (target) {
        try {
          await launchGame(target.rom_path);
        } catch (e) {
          console.error("Launch failed:", e);
          const msg = e instanceof Error ? e.message : String(e);
          window.dispatchEvent(
            new CustomEvent("app-error", { detail: `Error al lanzar el juego: ${msg}` })
          );
        }
      }
    },
    onPrevTab: () => {
      if (section === "settings") {
        setSettingsTab((curr) => {
          const idx = SETTINGS_TABS.indexOf(curr);
          return SETTINGS_TABS[(idx - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length];
        });
      } else {
        handlePrevTab();
      }
    },
    onNextTab: () => {
      if (section === "settings") {
        setSettingsTab((curr) => {
          const idx = SETTINGS_TABS.indexOf(curr);
          return SETTINGS_TABS[(idx + 1) % SETTINGS_TABS.length];
        });
      } else {
        handleNextTab();
      }
    },
    onToggleSidebar: () => setSidebarCollapsed((v) => !v),
    onToggleMenu: () => setSection((s) => (s === "settings" ? "home" : "settings")),
  });

  // Global keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (selectedGame) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setShowNavFocus(true);
        moveFocus("right");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setShowNavFocus(true);
        moveFocus("left");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setShowNavFocus(true);
        moveFocus("down");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setShowNavFocus(true);
        moveFocus("up");
      } else if (e.key === "Enter" && currentFocusedGame) {
        e.preventDefault();
        setSelectedGame(currentFocusedGame);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedGame, currentFocusedGame, moveFocus]);

  // Disable focus outline on mouse interaction
  useEffect(() => {
    function onMouseMove() {
      setShowNavFocus(false);
    }
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  function handleNavigate(s: Section) {
    if (s === "home") {
      setSelectedCompany("all");
      if (section === "home") {
        selectRandomHomeCategories();
        setHomeFocus({ row: 0, col: 0 });
      }
    }
    setSection(s);
  }

  function handleSelectGenre(name: string) {
    setSelectedGenre(name);
    setSection("genre");
  }

  const handleScanWrapper = useCallback(
    (f: string[]) => {
      handleScan(f);
    },
    [handleScan]
  );

  return (
    <MusicProvider games={games}>
      <div
        className={`app ${kioskMode ? "kiosk" : ""} ${
          sidebarCollapsed || layoutStyle === "immersive" ? "sidebar-collapsed" : ""
        }`}
        data-theme={theme}
        data-layout-style={layoutStyle}
      >
        {setupStatus && <div className="app-setup-banner">{setupStatus}</div>}
        {errorMsg && (
          <div className={`app-error-banner ${errorMsg.includes("🎮") ? "is-info" : ""}`}>
            {errorMsg}
          </div>
        )}

        {loaded === null && (
          <div className="app-welcome">
            <div className="spinner" />
            <p className="loading-text">{t("common.loading")}</p>
          </div>
        )}

        <Sidebar
          section={section}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
          genres={genreList}
          selectedGenre={selectedGenre}
          onSelectGenre={handleSelectGenre}
          company={effectiveCompany !== "all" ? effectiveCompany : undefined}
          games={games}
          layoutStyle={layoutStyle}
          currentProfile={currentProfile}
          profiles={profiles}
          onProfileSwitch={handleProfileSwitch}
          onOpenCast={() => setCastModalOpen(true)}
          onOpenGuide={() => setOnboardingOpen(true)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          settingsBadge={emulatorUpdates && section !== "settings"}
        />

        <div className="app-main">
          <AppHeader
            section={section}
            setSection={setSection}
            layoutStyle={layoutStyle}
            games={games}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchDropdownOpen={searchDropdownOpen}
            setSearchDropdownOpen={setSearchDropdownOpen}
            navbarSearchResults={navbarSearchResults}
            searchInputRef={searchInputRef}
            setSelectedGame={setSelectedGame}
            settingsSearchQuery={settingsSearchQuery}
            setSettingsSearchQuery={setSettingsSearchQuery}
            settingsSearchDropdownOpen={settingsSearchDropdownOpen}
            setSettingsSearchDropdownOpen={setSettingsSearchDropdownOpen}
            filteredSettingsOptions={filteredSettingsOptions}
            handleSelectSettingsOption={handleSelectSettingsOption}
            settingsSearchInputRef={settingsSearchInputRef}
            isFullscreen={isFullscreen}
            handleToggleFullscreen={handleToggleFullscreen}
            setCastModalOpen={setCastModalOpen}
            currentProfile={currentProfile}
            profiles={profiles}
            handleProfileSwitch={handleProfileSwitch}
            profileDropdownOpen={profileDropdownOpen}
            setProfileDropdownOpen={setProfileDropdownOpen}
          />

          <main className="app-content">
            {section === "settings" && (
              <Settings
                onScan={handleScanWrapper}
                scanning={scanning}
                folders={folders}
                setFolders={setFolders}
                kioskMode={kioskMode}
                setKioskMode={setKioskMode}
                scanMessage={scanMessage}
                scanCores={scanCores}
                scanProgress={scanProgress}
                sortBy={sortBy}
                setSortBy={setSortBy}
                profiles={profiles}
                currentProfile={currentProfile}
                onProfilesChange={handleProfilesChange}
                platformCores={platformCores}
                onPlatformCoreChange={handlePlatformCoreChange}
                games={games}
                theme={theme}
                onThemeChange={handleThemeChange}
                layoutStyle={layoutStyle}
                onLayoutStyleChange={handleLayoutStyleChange}
                activeTab={settingsTab}
                onActiveTabChange={setSettingsTab}
                activeGraphicsConsole={settingsGraphicsConsole}
                onActiveGraphicsConsoleChange={setSettingsGraphicsConsole}
                splashEnabled={splashEnabled}
                onSplashEnabledChange={handleSplashEnabledChange}
                splashSoundEnabled={splashSoundEnabled}
                onSplashSoundEnabledChange={handleSplashSoundEnabledChange}
                onPreviewSplash={handlePreviewSplash}
                onOpenOnboarding={() => setOnboardingOpen(true)}
              />
            )}

            {loaded === true && section === "home" && games.length === 0 && (
              <div className="app-welcome" style={{ padding: "80px 20px", textAlign: "center" }}>
                <h1>NewGame+</h1>
                <p style={{ color: "#94a3b8", maxWidth: "480px", margin: "14px auto 24px", lineHeight: "1.5" }}>
                  Tu biblioteca está vacía. Añade tus carpetas de juegos o abre el asistente guiado para comenzar.
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button className="app-welcome-btn" onClick={() => setOnboardingOpen(true)}>
                    📖 Abrir Asistente de Inicio
                  </button>
                  <button
                    className="app-welcome-btn"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                    onClick={() => setSection("settings")}
                  >
                    ⚙️ Ir a Ajustes
                  </button>
                </div>
              </div>
            )}

            {loaded === true && section === "home" && games.length > 0 && (
              <>
                <HeroBanner
                  games={featured}
                  allGames={games}
                  onSelect={setSelectedGame}
                  onFavoriteChanged={handleFavoriteChanged}
                  layoutStyle={layoutStyle}
                />
                {layoutStyle === "classic" && searchQuery.trim() ? (
                  <div style={{ padding: "0 48px 48px" }}>
                    {searchResults.length > 0 ? (
                      <CategoryRow
                        title={t("search.searchResultsWithCount", { count: searchResults.length })}
                        games={searchResults}
                        onSelect={setSelectedGame}
                        onFavoriteChanged={handleFavoriteChanged}
                        focusedId={showNavFocus ? searchResults[flatFocusIdx]?.id : null}
                      />
                    ) : (
                      <p
                        style={{
                          color: "#777",
                          padding: "32px 0",
                          textAlign: "center",
                          fontSize: "16px",
                        }}
                      >
                        {t("search.noResults", { query: searchQuery })}
                      </p>
                    )}
                  </div>
                ) : (
                  homeRows.map((row, rowIdx) => {
                    const isRowActive = homeFocus.row === rowIdx;
                    const focusedIdInRow =
                      showNavFocus && isRowActive && row.games.length > 0
                        ? row.games[Math.min(homeFocus.col, row.games.length - 1)]?.id
                        : null;
                    return (
                      <CategoryRow
                        key={row.id}
                        title={row.title}
                        games={row.games}
                        onSelect={setSelectedGame}
                        onFavoriteChanged={handleFavoriteChanged}
                        focusedId={focusedIdInRow}
                      />
                    );
                  })
                )}
              </>
            )}

            {loaded === true && section === "library" && (
              <div className="library-container">
                {availableCompanies.length > 0 && (
                  <div className="library-filter-pill-container">
                    <div className="library-filter-pill">
                      <button
                        type="button"
                        className={`library-filter-item ${selectedCompany === "all" ? "active" : ""}`}
                        onClick={() => setSelectedCompany("all")}
                      >
                        Todos
                      </button>
                      {availableCompanies.map((company) => (
                        <button
                          key={company}
                          type="button"
                          className={`library-filter-item ${
                            selectedCompany === company ? "active" : ""
                          }`}
                          onClick={() =>
                            setSelectedCompany(company === selectedCompany ? "all" : company)
                          }
                        >
                          {company}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {librarySections.length > 0 ? (
                  <div className="library-sections-list">
                    {librarySections.map((sec) => {
                      return (
                        <div key={sec.platform} className="library-platform-block">
                          <div className="library-platform-header">
                            <div className="library-platform-title-group">
                              <span
                                className="library-platform-indicator"
                                style={{ backgroundColor: sec.color }}
                              />
                              <h2 className="library-platform-title">{sec.displayName}</h2>
                              <span className="library-platform-count">
                                {sec.games.length} {sec.games.length === 1 ? "juego" : "juegos"}
                              </span>
                            </div>
                          </div>

                          <div className="library-grid">
                            {sec.games.map((game) => {
                              const globalIdx = libraryGames.findIndex((g) => g.id === game.id);
                              return (
                                <GameCard
                                  key={game.id}
                                  game={game}
                                  onSelect={setSelectedGame}
                                  onFavoriteChanged={handleFavoriteChanged}
                                  focused={showNavFocus && flatFocusIdx === globalIdx}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: "#555", textAlign: "center", padding: "48px" }}>
                    No se encontraron juegos
                  </p>
                )}
              </div>
            )}

            {loaded === true && section === "favorites" && (
              <div style={{ padding: "48px" }}>
                {favorites.length > 0 ? (
                  <CategoryRow
                    title={t("library.favorites")}
                    games={favorites}
                    onSelect={setSelectedGame}
                    onFavoriteChanged={handleFavoriteChanged}
                    focusedId={showNavFocus ? favorites[flatFocusIdx]?.id : null}
                  />
                ) : (
                  <p style={{ color: "#555", padding: "48px", textAlign: "center" }}>
                    {t("library.noFavoritesYet")}
                  </p>
                )}
              </div>
            )}

            {loaded === true && section === "search" && (
              <div style={{ padding: "48px" }}>
                {searchResults.length > 0 ? (
                  <CategoryRow
                    title={t("search.resultsWithCount", { count: searchResults.length })}
                    games={searchResults}
                    onSelect={setSelectedGame}
                    onFavoriteChanged={handleFavoriteChanged}
                    focusedId={showNavFocus ? searchResults[flatFocusIdx]?.id : null}
                  />
                ) : (
                  <p style={{ color: "#555", padding: "48px", textAlign: "center" }}>
                    {t("search.noResultsShort")}
                  </p>
                )}
              </div>
            )}

            {loaded === true && section === "genre" && selectedGenre && (
              <div className="library-container">
                <div className="genre-view-header">
                  <button
                    type="button"
                    className="genre-back-btn"
                    onClick={() => setSection("genres")}
                    aria-label={t("genres.backToGenres")}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    <span>{t("genres.backToGenres")}</span>
                  </button>

                  <div className="genre-view-title-wrap">
                    <h2 className="genre-view-title">
                      {effectiveCompany !== "all"
                        ? `${getLocalizedGenreName(selectedGenre, t)} • ${effectiveCompany}`
                        : getLocalizedGenreName(selectedGenre, t)}
                    </h2>
                    <span className="genre-view-count">
                      {t("library.totalGames", { count: activeGenreGames.length })}
                    </span>
                  </div>
                </div>

                {activeGenreSections.length > 0 ? (
                  <div className="library-sections-list">
                    {activeGenreSections.map((sec) => {
                      return (
                        <div key={sec.platform} className="library-platform-block">
                          <div className="library-platform-header">
                            <div className="library-platform-title-group">
                              <span
                                className="library-platform-indicator"
                                style={{ backgroundColor: sec.color }}
                              />
                              <h2 className="library-platform-title">{sec.displayName}</h2>
                              <span className="library-platform-count">
                                {sec.games.length} {sec.games.length === 1 ? "juego" : "juegos"}
                              </span>
                            </div>
                          </div>

                          <div className="library-grid">
                            {sec.games.map((game) => {
                              const globalIdx = activeGenreGames.findIndex((g) => g.id === game.id);
                              return (
                                <GameCard
                                  key={game.id}
                                  game={game}
                                  onSelect={setSelectedGame}
                                  onFavoriteChanged={handleFavoriteChanged}
                                  focused={showNavFocus && flatFocusIdx === globalIdx}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: "#555", textAlign: "center", padding: "48px" }}>
                    {t("genres.noGamesInGenre")}{" "}
                    {effectiveCompany !== "all" ? t("genres.forCompany", { company: effectiveCompany }) : ""}
                  </p>
                )}
              </div>
            )}

            {loaded === true && section === "genres" && (
              <div className="genres-container">
                <div className="genres-header">
                  <div className="genres-header-info">
                    <h1 className="genres-title">
                      {t("genres.title")}
                      {effectiveCompany !== "all" && (
                        <span className="genres-company-badge">{effectiveCompany}</span>
                      )}
                    </h1>
                    <p className="genres-subtitle">{t("genres.subtitle")}</p>
                  </div>
                </div>

                {genreList.length > 0 ? (
                  <div className="genre-cards-grid">
                    {genreList.map((g) => {
                      const itemTheme = getGenreTheme(g.name);
                      const bgSrc = g.imagePath ? getCoverUrl(g.imagePath) : "";
                      const localizedGenreName = getLocalizedGenreName(g.name, t);
                      return (
                        <button
                          key={g.name}
                          className="modern-genre-card"
                          style={
                            {
                              "--genre-color": itemTheme.color,
                              "--genre-glow": itemTheme.glow,
                              "--genre-gradient": itemTheme.gradient,
                            } as React.CSSProperties
                          }
                          onClick={() => handleSelectGenre(g.name)}
                        >
                          <div className="modern-genre-card-inner">
                            {bgSrc ? (
                              <img src={bgSrc} alt="" className="modern-genre-card-bg" loading="lazy" />
                            ) : (
                              <div className="modern-genre-fallback-bg" />
                            )}
                            <div className="modern-genre-card-overlay" />

                            <div className="modern-genre-card-top">
                              <span className="modern-genre-count-badge">
                                {t("library.totalGames", { count: g.count })}
                              </span>
                            </div>

                            <div className="modern-genre-card-bottom">
                              <span className="modern-genre-name">{localizedGenreName}</span>
                              {g.topGameName && (
                                <span className="modern-genre-featured-label" title={g.topGameName}>
                                  {t("genres.featured", { name: g.topGameName })}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: "#777", textAlign: "center", padding: "60px 0" }}>
                    {t("genres.noGenresAvailable")}{" "}
                    {effectiveCompany !== "all" ? t("genres.forCompany", { company: effectiveCompany }) : ""}
                  </p>
                )}
              </div>
            )}
          </main>
        </div>

        {selectedGame && (
          <GameDetailModal
            game={selectedGame}
            onClose={() => setSelectedGame(null)}
            onFavoriteChanged={handleFavoriteChanged}
            onHeroChanged={(gameId, newHeroPath) => {
              setGames((prev) =>
                prev.map((g) => (g.id === gameId ? { ...g, hero_path: newHeroPath } : g))
              );
              if (selectedGame && selectedGame.id === gameId) {
                setSelectedGame({ ...selectedGame, hero_path: newHeroPath });
              }
            }}
            onLogoChanged={(gameId, newLogoPath) => {
              setGames((prev) =>
                prev.map((g) => (g.id === gameId ? { ...g, logo_path: newLogoPath } : g))
              );
              if (selectedGame && selectedGame.id === gameId) {
                setSelectedGame({ ...selectedGame, logo_path: newLogoPath });
              }
            }}
            onGameUpdated={(updated) => {
              setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
              setSelectedGame(updated);
            }}
          />
        )}

        <CastModal isOpen={castModalOpen} onClose={() => setCastModalOpen(false)} />

        <ScanCompleteModal
          isOpen={!!scanCompletedResult}
          result={scanCompletedResult}
          onClose={dismissScanCompleted}
          onGoToLibrary={() => {
            dismissScanCompleted();
            setSection("home");
          }}
        />

        <ScanProgressHUD
          scanning={scanning}
          progress={scanProgress}
          message={scanMessage}
        />

        <OnboardingModal
          isOpen={onboardingOpen}
          onClose={handleCloseOnboarding}
          folders={folders}
          onAddFolder={handleAddFolderFromOnboarding}
          onStartScan={(f) => {
            handleCloseOnboarding();
            handleScanWrapper(f);
          }}
        />

        <ControllerHUD
          section={section}
          hasModalOpen={selectedGame !== null || castModalOpen || onboardingOpen || !!scanCompletedResult}
          selectedGameId={selectedGame?.id ?? null}
        />

        {showSplash && (
          <SplashScreen
            soundEnabled={splashSoundEnabled}
            volume={0.4}
            onFinish={() => setShowSplash(false)}
          />
        )}
      </div>
    </MusicProvider>
  );
}

export default App;
