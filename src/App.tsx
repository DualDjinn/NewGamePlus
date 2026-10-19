import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import type { Game, Section, SettingsTab, GraphicsConsole } from "./types";
import { searchSettingsOptions, resolveSettingsOptions, type SettingsSearchOption } from "./lib/settingsSearch";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  toggleFavorite,
  launchGame,
  isWindowFullscreen,
  toggleWindowFullscreen,
  saveSettings,
  onInGamePauseOpen,
  onInGamePauseClose,
  onEdenKeysRequired,
  getActiveLaunchedRomPath,
} from "./lib/tauri";
import CategoryRow from "./components/CategoryRow";
import Sidebar from "./components/Sidebar";
import AppHeader from "./components/AppHeader";
import ControllerHUD from "./components/ControllerHUD";
import SplashScreen from "./components/SplashScreen";
import ScanProgressHUD from "./components/ScanProgressHUD";
import ScanCompleteModal from "./components/ScanCompleteModal";

// Lazy-loaded heavy components for optimal startup performance
const Settings = lazy(() => import("./components/Settings"));
const GameDetailModal = lazy(() => import("./components/GameDetailModal"));
const CastModal = lazy(() => import("./components/CastModal"));
const OnboardingModal = lazy(() => import("./components/OnboardingModal"));
const CreateUserModal = lazy(() => import("./components/CreateUserModal"));
const InGameOverlayModal = lazy(() => import("./components/InGameOverlayModal"));
const EdenKeysModal = lazy(() => import("./components/EdenKeysModal"));
import { HomeView, LibraryView, GenresView } from "./views";
import { MusicProvider } from "./context/MusicContext";
import { useGamepad } from "./hooks/useGamepad";
import { useLibraryGames } from "./hooks/useLibraryGames";
import { useGenreCatalog } from "./hooks/useGenreCatalog";
import { useGameSearch } from "./hooks/useGameSearch";
import "./App.css";

export type ActiveModal =
  | { type: "game_detail"; game: Game; action?: "edit" | "hero" | "logo" | "video" | null }
  | { type: "cast" }
  | { type: "onboarding" }
  | { type: "in_game_pause"; game: Game | null; screenshotPath: string | null }
  | { type: "eden_keys"; romPath: string }
  | null;

function App() {
  const { t, i18n } = useTranslation();
  const [section, setSection] = useState<Section>("home");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);

  // Derived modal accessors for clean backward compatibility
  const selectedGame = useMemo(() => (activeModal?.type === "game_detail" ? activeModal.game : null), [activeModal]);
  const selectedGameAction = useMemo(() => (activeModal?.type === "game_detail" ? (activeModal.action ?? null) : null), [activeModal]);
  const castModalOpen = activeModal?.type === "cast";
  const onboardingOpen = activeModal?.type === "onboarding";
  const inGamePauseOpen = activeModal?.type === "in_game_pause";
  const inGameScreenshot = activeModal?.type === "in_game_pause" ? activeModal.screenshotPath : null;
  const inGameActiveGame = activeModal?.type === "in_game_pause" ? activeModal.game : null;
  const edenKeysRom = activeModal?.type === "eden_keys" ? activeModal.romPath : null;

  const setSelectedGame = useCallback(
    (gameOrFn: Game | null | ((prev: Game | null) => Game | null), action?: "edit" | "hero" | "logo" | "video" | null) => {
      setActiveModal((prev) => {
        const currentGame = prev?.type === "game_detail" ? prev.game : null;
        const nextGame = typeof gameOrFn === "function" ? gameOrFn(currentGame) : gameOrFn;
        if (!nextGame) {
          return prev?.type === "game_detail" ? null : prev;
        }
        return {
          type: "game_detail",
          game: nextGame,
          action: action ?? (prev?.type === "game_detail" ? prev.action : null),
        };
      });
    },
    []
  );

  const setSelectedGameAction = useCallback((action: "edit" | "hero" | "logo" | "video" | null) => {
    setActiveModal((prev) => (prev?.type === "game_detail" ? { ...prev, action } : prev));
  }, []);

  const setCastModalOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setActiveModal((prev) => {
      const isOpen = typeof open === "function" ? open(prev?.type === "cast") : open;
      return isOpen ? { type: "cast" } : (prev?.type === "cast" ? null : prev);
    });
  }, []);

  const setOnboardingOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setActiveModal((prev) => {
      const isOpen = typeof open === "function" ? open(prev?.type === "onboarding") : open;
      return isOpen ? { type: "onboarding" } : (prev?.type === "onboarding" ? null : prev);
    });
  }, []);

  const setInGamePauseOpen = useCallback((open: boolean | ((prev: boolean) => boolean)) => {
    setActiveModal((prev) => {
      const isOpen = typeof open === "function" ? open(prev?.type === "in_game_pause") : open;
      return isOpen
        ? prev?.type === "in_game_pause"
          ? prev
          : { type: "in_game_pause", game: null, screenshotPath: null }
        : prev?.type === "in_game_pause"
        ? null
        : prev;
    });
  }, []);

  const setEdenKeysRom = useCallback((rom: string | null | ((prev: string | null) => string | null)) => {
    setActiveModal((prev) => {
      const currentRom = prev?.type === "eden_keys" ? prev.romPath : null;
      const nextRom = typeof rom === "function" ? rom(currentRom) : rom;
      return nextRom ? { type: "eden_keys", romPath: nextRom } : (prev?.type === "eden_keys" ? null : prev);
    });
  }, []);

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGameRunning, setIsGameRunning] = useState(false);
  const prevSectionRef = useRef<Section>(section);
  // Timestamp of the last game exit: confirm/open inputs within the grace
  // window are ignored so a button held while quitting can't pop the detail modal.
  const lastGameExitRef = useRef<number>(0);
  const EXIT_INPUT_GRACE_MS = 500;
  const exitedRecently = useCallback(
    () => Date.now() - lastGameExitRef.current < EXIT_INPUT_GRACE_MS,
    []
  );

  useEffect(() => {
    const handleLaunch = () => {
      setIsGameRunning(true);
      setSelectedGame(null); // Ensure detail modal is closed so it cannot capture keys while playing
    };
    const handleClose = () => {
      lastGameExitRef.current = Date.now();
      setIsGameRunning(false);
      setInGamePauseOpen(false);
    };
    window.addEventListener("game-launched", handleLaunch);
    window.addEventListener("game-closed", handleClose);
    return () => {
      window.removeEventListener("game-launched", handleLaunch);
      window.removeEventListener("game-closed", handleClose);
    };
  }, []);

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

  // Listen to in-game pause overlay requests from background hotkey listener
  useEffect(() => {
    const unlistenOpen = onInGamePauseOpen((payload) => {
      const activeRom = getActiveLaunchedRomPath();
      const runningGame =
        (payload.game_id ? games.find((g) => g.id === payload.game_id) : null) ||
        (activeRom ? games.find((g) => g.rom_path === activeRom) : null) ||
        selectedGame ||
        null;
      setActiveModal({
        type: "in_game_pause",
        game: runningGame,
        screenshotPath: payload.screenshot_path || null,
      });
    });

    const unlistenClose = onInGamePauseClose(() => {
      setActiveModal((prev) => (prev?.type === "in_game_pause" ? null : prev));
    });

    return () => {
      unlistenOpen.then((fn) => fn());
      unlistenClose.then((fn) => fn());
    };
  }, [games, selectedGame]);

  useEffect(() => {
    return onEdenKeysRequired((romPath) => setEdenKeysRom(romPath));
  }, []);

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
    debouncedQuery,
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
      const userConfigured = localStorage.getItem("newgameplus_user_profile_configured");
      if (!userConfigured || currentProfile === "Por defecto") {
        setCreateUserOpen(true);
        return;
      }
      const completed = localStorage.getItem("newgameplus_onboarding_completed");
      if (!completed && folders.length === 0 && games.length === 0) {
        setOnboardingOpen(true);
      }
    }
  }, [loaded, currentProfile, folders.length, games.length]);

  const handleCreateUserComplete = useCallback(
    async (chosenName: string) => {
      setCreateUserOpen(false);
      const updatedProfiles = profiles.includes(chosenName)
        ? profiles
        : [...profiles.filter((p) => p !== "Por defecto" && p !== currentProfile), chosenName];
      await handleProfilesChange(updatedProfiles, chosenName);

      const completed = localStorage.getItem("newgameplus_onboarding_completed");
      if (!completed && folders.length === 0 && games.length === 0) {
        setOnboardingOpen(true);
      }
    },
    [profiles, currentProfile, handleProfilesChange, folders.length, games.length]
  );

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
      return resolveSettingsOptions(t).slice(0, 8);
    }
    return searchSettingsOptions(settingsSearchQuery, t);
  }, [settingsSearchQuery, t, i18n.language]);

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
      } else if (section === "home" && layoutStyle === "arcade") {
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
      } else if (section === "home" && layoutStyle === "arcade") {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      } else if (currentFocusedGame && !exitedRecently()) {
        setSelectedGame(currentFocusedGame);
      }
    },
    onCancel: () => {
      if (scanCompletedResult) {
        dismissScanCompleted();
      } else if (activeModal) {
        if (activeModal.type === "onboarding") {
          handleCloseOnboarding();
        } else {
          setActiveModal(null);
        }
      } else if (section !== "home") {
        setSection("home");
      }
    },
    onFavorite: async () => {
      if (section === "home" && layoutStyle === "arcade" && !selectedGame) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
        return;
      }
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
      if (section === "home" && layoutStyle === "arcade" && !selectedGame) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "f" }));
        return;
      }
      const target = selectedGame ?? currentFocusedGame;
      if (target) {
        try {
          await launchGame(target.rom_path);
        } catch (e) {
          console.error("Launch failed:", e);
          const msg = e instanceof Error ? e.message : String(e);
          window.dispatchEvent(
            new CustomEvent("app-error", { detail: t("common.launchError", { msg }) })
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
      } else if (section === "home" && layoutStyle === "arcade" && !selectedGame) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
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
      } else if (section === "home" && layoutStyle === "arcade" && !selectedGame) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
      } else {
        handleNextTab();
      }
    },
    onToggleSidebar: () => setSidebarCollapsed((v) => !v),
    onToggleMenu: () => setSection((s) => (s === "settings" ? "home" : "settings")),
  }, !isGameRunning && !inGamePauseOpen);

  // Global keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (isGameRunning || inGamePauseOpen || selectedGame) return;

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
      } else if (e.key === "Enter" && currentFocusedGame && !exitedRecently()) {
        e.preventDefault();
        setSelectedGame(currentFocusedGame);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedGame, currentFocusedGame, moveFocus, exitedRecently]);

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
          sidebarCollapsed || layoutStyle === "immersive" || layoutStyle === "arcade" ? "sidebar-collapsed" : ""
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
              <Suspense fallback={null}>
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
              </Suspense>
            )}

            {loaded === true && section === "home" && (
              <HomeView
                games={games}
                setGames={setGames}
                featured={featured}
                layoutStyle={layoutStyle}
                handleLayoutStyleChange={handleLayoutStyleChange}
                searchQuery={debouncedQuery}
                searchResults={searchResults}
                homeRows={homeRows}
                homeFocus={homeFocus}
                showNavFocus={showNavFocus}
                flatFocusIdx={flatFocusIdx}
                onSelectGame={setSelectedGame}
                onFavoriteChanged={handleFavoriteChanged}
                onOpenSettings={() => setSection("settings")}
                onOpenOnboarding={() => setOnboardingOpen(true)}
              />
            )}

            {loaded === true && section === "library" && (
              <LibraryView
                availableCompanies={availableCompanies}
                selectedCompany={selectedCompany}
                setSelectedCompany={setSelectedCompany}
                librarySections={librarySections}
                libraryGames={libraryGames}
                onSelectGame={setSelectedGame}
                onFavoriteChanged={handleFavoriteChanged}
                showNavFocus={showNavFocus}
                flatFocusIdx={flatFocusIdx}
              />
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
                    games={searchResults.slice(0, 60)}
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

            {loaded === true && (section === "genres" || (section === "genre" && selectedGenre)) && (
              <GenresView
                section={section}
                effectiveCompany={effectiveCompany}
                genreList={genreList}
                selectedGenre={selectedGenre}
                activeGenreGames={activeGenreGames}
                activeGenreSections={activeGenreSections}
                onSelectGenre={handleSelectGenre}
                onBackToGenres={() => setSection("genres")}
                onSelectGame={setSelectedGame}
                onFavoriteChanged={handleFavoriteChanged}
                showNavFocus={showNavFocus}
                flatFocusIdx={flatFocusIdx}
              />
            )}
          </main>
        </div>

        <Suspense fallback={null}>
          {selectedGame && (
            <GameDetailModal
              game={selectedGame}
              initialAction={selectedGameAction}
              onClose={() => {
                setSelectedGame(null);
                setSelectedGameAction(null);
              }}
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

          {castModalOpen && (
            <CastModal isOpen={castModalOpen} onClose={() => setCastModalOpen(false)} />
          )}

          {createUserOpen && (
            <CreateUserModal
              isOpen={createUserOpen}
              currentProfile={currentProfile}
              existingProfiles={profiles}
              onComplete={handleCreateUserComplete}
            />
          )}

          {onboardingOpen && (
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
          )}

          {inGamePauseOpen && (
            <InGameOverlayModal
              isOpen={inGamePauseOpen}
              game={inGameActiveGame}
              screenshotPath={inGameScreenshot}
              onClose={() => setInGamePauseOpen(false)}
            />
          )}

          {edenKeysRom !== null && (
            <EdenKeysModal
              romPath={edenKeysRom}
              onClose={() => setEdenKeysRom(null)}
              onPlay={(romPath) => {
                setEdenKeysRom(null);
                launchGame(romPath).catch((e) => {
                  console.error("Launch failed:", e);
                  const msg = e instanceof Error ? e.message : String(e);
                  window.dispatchEvent(
                    new CustomEvent("app-error", { detail: t("common.launchError", { msg }) })
                  );
                });
              }}
            />
          )}
        </Suspense>

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

        <ControllerHUD
          section={section}
          hasModalOpen={activeModal !== null || !!scanCompletedResult || createUserOpen}
          selectedGameId={activeModal?.type === "game_detail" ? activeModal.game.id : null}
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
