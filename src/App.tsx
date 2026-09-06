import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Game, Section, SortKey, LayoutStyle } from "./types";
import {
  getGames,
  getSettings,
  scanAndFetchCores,
  checkRetroarch,
  onRetroarchExited,
  onScanProgress,
  onSetupStatus,
  onCoversUpdated,
  savePlatformCores,
  switchProfile,
  toggleFavorite,
  getCoverUrl,
  launchGame,
  setTheme,
  setLayoutStyle,
} from "./lib/tauri";
import HeroBanner from "./components/HeroBanner";
import CategoryRow from "./components/CategoryRow";
import GameCard from "./components/GameCard";
import GameDetailModal from "./components/GameDetailModal";
import Settings from "./components/Settings";
import Sidebar from "./components/Sidebar";
import CastModal from "./components/CastModal";
import { VinylPlayer } from "./components/VinylPlayer";
import { MusicProvider } from "./context/MusicContext";
import { GearIcon, SearchIcon, CloseIcon, CastIcon } from "./components/icons";
import { useGamepad } from "./hooks/useGamepad";
import { getPlatformCompany, getPlatformDisplayName, PLATFORM_COLORS } from "./lib/platforms";
import { getGenreTheme } from "./lib/genreThemes";
import "./App.css";

function nameMatches(g: Game, q: string): boolean {
  return (
    g.name.toLowerCase().includes(q) ||
    (g.display_name ?? "").toLowerCase().includes(q)
  );
}

function App() {
  const [section, setSection] = useState<Section>("home");
  const [games, setGames] = useState<Game[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [kioskMode, setKioskMode] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loaded, setLoaded] = useState<boolean | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [scanMessage, setScanMessage] = useState("");
  const [setupStatus, setSetupStatus] = useState("");
  const [theme, setThemeState] = useState<string>("gold");
  const [layoutStyle, setLayoutStyleState] = useState<LayoutStyle>("classic");
  const [showNavFocus, setShowNavFocus] = useState(false);
  const [homeFocus, setHomeFocus] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [flatFocusIdx, setFlatFocusIdx] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [scanCores, setScanCores] = useState<{ installed: string[]; needed: string[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [profiles, setProfiles] = useState<string[]>([]);
  const [currentProfile, setCurrentProfile] = useState("Por defecto");
  const [scanProgress, setScanProgress] = useState(0);
  const [platformCores, setPlatformCores] = useState<Record<string, string>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [randomHomeCategories, setRandomHomeCategories] = useState<string[]>([]);
  const [castModalOpen, setCastModalOpen] = useState(false);
  const prevSectionRef = useRef<Section>(section);

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
    if (!searchDropdownOpen && !searchQuery) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest(".app-navbar-search")) {
        setSearchDropdownOpen(false);
        setSearchQuery("");
        searchInputRef.current?.blur();
        if (section === "search") {
          setSection("home");
        }
      }
    };
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, [searchDropdownOpen, searchQuery, section]);

  // W5: Global error toast via custom event
  useEffect(() => {
    function onError(e: CustomEvent<string>) {
      setErrorMsg(e.detail);
      setTimeout(() => setErrorMsg(""), 4000);
    }
    window.addEventListener("app-error", onError as EventListener);
    return () => window.removeEventListener("app-error", onError as EventListener);
  }, []);

  // Auto-download RetroArch on first launch
  useEffect(() => {
    checkRetroarch().catch((e) => {
      console.error("RetroArch setup failed:", e);
      setSetupStatus("Error al instalar RetroArch");
    });
  }, []);

  // Listen for setup progress
  useEffect(() => {
    const unlisten = onSetupStatus((msg) => setSetupStatus(msg));
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // W10: Load persisted data on mount
  useEffect(() => {
    async function init() {
      try {
        const [savedGames, settings] = await Promise.all([
          getGames(),
          getSettings(),
        ]);
        setFolders(settings.folders);
        setKioskMode(settings.kiosk_mode);
        setProfiles(settings.profiles.map((p) => p.name));
        setCurrentProfile(settings.current_profile);
        setPlatformCores(settings.platform_cores || {});
        if (settings.theme) {
          setThemeState(settings.theme);
        }
        if (settings.layout_style) {
          setLayoutStyleState(settings.layout_style as LayoutStyle);
        }
        if (savedGames.length > 0) {
          setGames(savedGames);
        }
      } catch (e) {
        console.error("Failed to load state:", e);
      } finally {
        setLoaded(true);
      }
    }
    init();
  }, []);

  async function handleThemeChange(newTheme: string) {
    setThemeState(newTheme);
    try {
      await setTheme(newTheme);
    } catch (e) {
      console.error("Failed to save theme:", e);
    }
  }

  async function handleLayoutStyleChange(newStyle: LayoutStyle) {
    setLayoutStyleState(newStyle);
    try {
      await setLayoutStyle(newStyle);
    } catch (e) {
      console.error("Failed to save layout style:", e);
    }
  }

  // Listen for RetroArch exit
  useEffect(() => {
    const unlisten = onRetroarchExited(() => {
      getGames().then((updatedGames) => {
        setGames(updatedGames);
        setSelectedGame((prev) => {
          if (!prev) return null;
          return updatedGames.find((g) => g.id === prev.id) ?? prev;
        });
      }).catch(console.error);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Listen for covers updated in background
  useEffect(() => {
    const unlisten = onCoversUpdated(() => {
      getGames().then((updatedGames) => {
        setGames(updatedGames);
      }).catch(console.error);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Listen for scan progress
  useEffect(() => {
    const unlisten = onScanProgress((data) => {
      const frac = data.total > 0 ? data.current / data.total : 0;
      const pct = data.phase === "scan" ? frac * 40 : data.phase === "roms" ? 40 + frac * 50 : 90 + frac * 10;
      setScanProgress(Math.round(pct));
      setScanMessage(
        data.phase === "scan"
          ? `Escaneando ${data.label}…`
          : data.phase === "roms"
            ? `Procesando ${data.current}/${data.total}: ${data.label}`
            : `Descargando core: ${data.label}`
      );
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Recommended: mix games with custom hero + favorites + recent + random
  // Shuffles within each tier for variety between sessions
  const featured = useMemo(() => {
    if (games.length === 0) return [];

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

    const withHero = shuffle(games.filter((g) => g.hero_path));
    const favs = shuffle(games.filter((g) => g.favorite));
    const recentTop = shuffle(
      [...games]
        .filter((g) => g.last_played)
        .sort((a, b) => Number(b.last_played) - Number(a.last_played))
        .slice(0, 5),
    );
    const random = shuffle(games);

    const seen = new Set<string>();
    const pool: Game[] = [];

    const pickFrom = (source: Game[], max: number) => {
      for (const g of source) {
        if (pool.length >= 7 || max <= 0) break;
        if (!seen.has(g.id)) {
          seen.add(g.id);
          pool.push(g);
          max--;
        }
      }
    };

    pickFrom(withHero, 2);  // Up to 2 games with hero art
    pickFrom(favs, 2);      // Up to 2 favorites
    pickFrom(recentTop, 1); // 1 from top 5 recently played
    pickFrom(random, 7);    // Fill remaining slots with random games

    return pool;
  }, [games]);

  const recentlyPlayed = useMemo(
    () =>
      [...games]
        .filter((g) => g.last_played)
        .sort((a, b) => Number(b.last_played) - Number(a.last_played))
        .slice(0, 10),
    [games],
  );

  const sortGames = useCallback((list: Game[]) => {
    const sorted = [...list];
    if (sortBy === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "platform") sorted.sort((a, b) => a.platform.localeCompare(b.platform));
    else if (sortBy === "last_played") sorted.sort((a, b) => Number(b.last_played ?? 0) - Number(a.last_played ?? 0));
    return sorted;
  }, [sortBy]);

  const favorites = useMemo(() => games.filter((g) => g.favorite), [games]);

  const effectiveCompany = section === "home" ? "all" : selectedCompany;

  const genreList = useMemo(() => {
    const map: Record<string, { count: number; imagePath?: string | null; topGameName?: string }> = {};
    const targetGames =
      effectiveCompany === "all"
        ? games
        : games.filter((g) => getPlatformCompany(g.platform) === effectiveCompany);

    for (const g of targetGames) {
      if (g.genre) {
        if (!map[g.genre]) {
          map[g.genre] = { count: 0, imagePath: null };
        }
        map[g.genre].count += 1;

        // Prioridad de imagen: si aún no tiene o si encontramos uno con hero_path
        const currentImg = map[g.genre].imagePath;
        const candidateImg = g.hero_path || g.cover_path;

        if (!currentImg && candidateImg) {
          map[g.genre].imagePath = candidateImg;
          map[g.genre].topGameName = g.display_name || g.name;
        } else if (g.hero_path && (!currentImg || currentImg === g.cover_path)) {
          // Si este juego tiene hero_path real, dale preferencia sobre solo cover
          map[g.genre].imagePath = g.hero_path;
          map[g.genre].topGameName = g.display_name || g.name;
        }
      }
    }
    return Object.entries(map)
      .map(([name, data]) => ({ name, count: data.count, imagePath: data.imagePath, topGameName: data.topGameName }))
      .sort((a, b) => b.count - a.count);
  }, [games, effectiveCompany]);

  const activeGenreGames = useMemo(() => {
    if (!selectedGenre) return [];
    let list = games.filter((g) => g.genre === selectedGenre);
    if (effectiveCompany !== "all") {
      list = list.filter((g) => getPlatformCompany(g.platform) === effectiveCompany);
    }
    return sortGames(list);
  }, [games, selectedGenre, effectiveCompany, sortGames]);

  // Agrupación de juegos del género seleccionado por plataforma
  const activeGenreSections = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const game of activeGenreGames) {
      const plat = game.platform || "Otros";
      if (!map.has(plat)) {
        map.set(plat, []);
      }
      map.get(plat)!.push(game);
    }
    return Array.from(map.entries())
      .map(([platform, items]) => ({
        platform,
        displayName: getPlatformDisplayName(platform),
        color: PLATFORM_COLORS[platform.toUpperCase()] || "var(--accent)",
        games: items,
      }))
      .sort((a, b) => b.games.length - a.games.length);
  }, [activeGenreGames]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return sortGames(games.filter((g) => nameMatches(g, q)));
  }, [games, searchQuery, sortGames]);

  const navbarSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || games.length === 0) return [];

    const matches = games.filter((g) => {
      const name = g.name.toLowerCase();
      const disp = (g.display_name ?? "").toLowerCase();
      return name.includes(q) || disp.includes(q);
    });

    matches.sort((a, b) => {
      const aName = (a.display_name || a.name).toLowerCase();
      const bName = (b.display_name || b.name).toLowerCase();
      const aStarts = aName.startsWith(q);
      const bStarts = bName.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aName.localeCompare(bName);
    });

    return matches.slice(0, 6);
  }, [searchQuery, games]);

  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) {
      set.add(getPlatformCompany(g.platform));
    }
    const priority = [
      "PlayStation",
      "Nintendo",
      "Sega",
      "Arcade",
      "SNK",
      "Atari",
      "NEC",
      "Bandai",
      "Coleco",
      "Otros",
    ];
    return priority
      .filter((c) => set.has(c))
      .concat(Array.from(set).filter((c) => !priority.includes(c)));
  }, [games]);

  // Biblioteca plana: todos los juegos filtrados por compañia y buscador
  const libraryGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = games;
    if (selectedCompany && selectedCompany !== "all") {
      list = list.filter((g) => getPlatformCompany(g.platform) === selectedCompany);
    }
    if (q) {
      list = list.filter((g) => nameMatches(g, q));
    }
    return sortGames(list);
  }, [games, selectedCompany, searchQuery, sortGames]);

  // Agrupación de la biblioteca por plataforma/consola
  const librarySections = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const game of libraryGames) {
      const plat = game.platform || "Otros";
      if (!map.has(plat)) {
        map.set(plat, []);
      }
      map.get(plat)!.push(game);
    }
    // Ordenar plataformas por cantidad de juegos descendente
    return Array.from(map.entries())
      .map(([platform, items]) => ({
        platform,
        displayName: getPlatformDisplayName(platform),
        color: PLATFORM_COLORS[platform.toUpperCase()] || "var(--accent)",
        games: items,
      }))
      .sort((a, b) => b.games.length - a.games.length);
  }, [libraryGames]);

  const selectRandomHomeCategories = useCallback(() => {
    if (games.length === 0) return;

    const genreCounts = new Map<string, number>();
    let noGenreCount = 0;
    for (const g of games) {
      if (g.genre && g.genre.trim()) {
        const cat = g.genre.trim();
        genreCounts.set(cat, (genreCounts.get(cat) || 0) + 1);
      } else {
        noGenreCount++;
      }
    }

    let candidates = Array.from(genreCounts.keys());
    if (noGenreCount > 0 && candidates.length < 8) {
      candidates.push("Otros títulos");
    }

    // Fallback si la biblioteca no tuviera géneros detectados
    if (candidates.length === 0) {
      const platSet = new Set(games.map((g) => g.platform).filter(Boolean));
      candidates = Array.from(platSet);
    }

    // Mezclar y elegir hasta 8 al azar
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    setRandomHomeCategories(shuffled.slice(0, 8));
  }, [games]);

  useEffect(() => {
    if (section === "home") {
      if (prevSectionRef.current !== "home" || (randomHomeCategories.length === 0 && games.length > 0)) {
        selectRandomHomeCategories();
        setHomeFocus({ row: 0, col: 0 });
      }
    }
    prevSectionRef.current = section;
  }, [section, games, selectRandomHomeCategories, randomHomeCategories.length]);

  const homeRows = useMemo(() => {
    const rows: { id: string; title: string; games: Game[] }[] = [];
    if (recentlyPlayed.length > 0) {
      rows.push({ id: "recent", title: "Jugados recientemente", games: recentlyPlayed });
    }

    for (const cat of randomHomeCategories) {
      const catGames = cat === "Otros títulos"
        ? games.filter((g) => !g.genre || !g.genre.trim())
        : games.filter((g) => g.genre?.trim() === cat);

      if (catGames.length > 0) {
        rows.push({
          id: `cat-${cat}`,
          title: cat,
          games: sortGames(catGames),
        });
      }
    }
    return rows;
  }, [recentlyPlayed, randomHomeCategories, games, sortGames]);

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
  }, [section, homeFocus, homeRows, libraryGames, favorites, searchResults, selectedGenre, activeGenreGames, flatFocusIdx]);

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

      const GRID_COLS = (section === "library" || section === "genre") ? 5 : currentList.length;

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
    [section, homeRows, libraryGames, favorites, searchResults, selectedGenre, games, sortGames],
  );

  const SECTIONS: Section[] = ["home", "library", "favorites", "genres", "settings"];

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

  const handleFavoriteChanged = useCallback((gameId: string, isFav: boolean) => {
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, favorite: isFav } : g)),
    );
    setSelectedGame((prev) =>
      prev?.id === gameId ? { ...prev, favorite: isFav } : prev,
    );
  }, []);

  // Global gamepad controller navigation
  useGamepad({
    onNavigate: (dir) => {
      setShowNavFocus(true);
      if (selectedGame) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: dir === "left" ? "ArrowLeft" : "ArrowRight" }));
      } else {
        moveFocus(dir);
      }
    },
    onConfirm: () => {
      setShowNavFocus(true);
      if (selectedGame) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
      } else if (currentFocusedGame) {
        setSelectedGame(currentFocusedGame);
      }
    },
    onCancel: () => {
      if (selectedGame) {
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
          window.dispatchEvent(new CustomEvent("app-error", { detail: `Error al lanzar el juego: ${msg}` }));
        }
      }
    },
    onPrevTab: handlePrevTab,
    onNextTab: handleNextTab,
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

  async function handleScan(f: string[]) {
    setScanning(true);
    setScanMessage("Iniciando escaneo...");
    setScanCores(null);
    setScanProgress(0);
    try {
      const result = await scanAndFetchCores(f);
      const updatedGames = await getGames();
      setGames(updatedGames);
      setLoaded(true);
      setSection("home");
      setScanMessage("");
      setScanCores({ installed: result.cores_installed, needed: result.cores_needed });
    } catch (e) {
      console.error("Scan failed:", e);
      setScanMessage("Error al escanear");
    } finally {
      setScanning(false);
      setScanProgress(0);
    }
  }

  async function handleProfilesChange(newProfiles: string[], newCurrent: string) {
    setProfiles(newProfiles);
    setCurrentProfile(newCurrent);
    try {
      const [updatedGames, updatedSettings] = await Promise.all([
        getGames(),
        getSettings(),
      ]);
      setGames(updatedGames);
      const prof = updatedSettings.profiles.find((p) => p.name === newCurrent);
      if (prof?.theme) {
        setThemeState(prof.theme);
      } else if (updatedSettings.theme) {
        setThemeState(updatedSettings.theme);
      }
      if (prof?.layout_style) {
        setLayoutStyleState(prof.layout_style as LayoutStyle);
      } else if (updatedSettings.layout_style) {
        setLayoutStyleState(updatedSettings.layout_style as LayoutStyle);
      }
    } catch (e) {
      console.error("Failed to reload state for new profile:", e);
    }
  }

  async function handlePlatformCoreChange(platform: string, core: string) {
    const next = { ...platformCores, [platform]: core };
    setPlatformCores(next);
    await savePlatformCores(next).catch(console.error);
  }

  async function handleProfileSwitch(name: string) {
    if (name === currentProfile) return;
    try {
      await switchProfile(name);
      setCurrentProfile(name);
      const [updatedGames, updatedSettings] = await Promise.all([
        getGames(),
        getSettings(),
      ]);
      setGames(updatedGames);
      const prof = updatedSettings.profiles.find((p) => p.name === name);
      if (prof?.theme) {
        setThemeState(prof.theme);
      } else if (updatedSettings.theme) {
        setThemeState(updatedSettings.theme);
      }
      if (prof?.layout_style) {
        setLayoutStyleState(prof.layout_style as LayoutStyle);
      } else if (updatedSettings.layout_style) {
        setLayoutStyleState(updatedSettings.layout_style as LayoutStyle);
      }
    } catch (e) {
      console.error("Switch profile failed:", e);
    }
  }

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

  return (
    <MusicProvider games={games}>
      <div
        className={`app ${kioskMode ? "kiosk" : ""} ${sidebarCollapsed || layoutStyle === "immersive" ? "sidebar-collapsed" : ""}`}
        data-theme={theme}
        data-layout-style={layoutStyle}
      >
        {setupStatus && (
          <div className="app-setup-banner">{setupStatus}</div>
        )}
      {errorMsg && (
        <div className="app-error-banner">{errorMsg}</div>
      )}

      {loaded === null && (
        <div className="app-welcome">
          <div className="spinner" />
          <p className="loading-text">Cargando...</p>
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
      />

      <div className="app-main">
        <header className="app-header">
          <div className="app-header-left" />

          <div className="app-header-center">
            <div className="app-navbar-search">
              <div className="app-navbar-search-box">
                <span className="app-navbar-search-icon">
                  <SearchIcon />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="app-navbar-search-input"
                  placeholder="Buscar juego en tu colección..."
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
                <div className="app-navbar-search-dropdown" role="listbox">
                  {navbarSearchResults.length > 0 ? (
                    navbarSearchResults.map((game) => {
                      const coverSrc = getCoverUrl(game.cover_path);
                      const title = game.display_name || game.name;
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
                              <span className="app-navbar-search-item-plat">{game.platform}</span>
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
                      No se encontraron juegos para "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="app-header-right">
            {layoutStyle === "immersive" ? (
              <VinylPlayer games={games} mode="navbar" />
            ) : (
              <div className="app-header-actions">
                <button
                  type="button"
                  className="app-cast-btn"
                  onClick={() => setCastModalOpen(true)}
                  title="Transmitir a TV / Dispositivo"
                  aria-label="Transmitir a TV"
                >
                  <CastIcon />
                  <span className="app-cast-btn-label">Transmitir</span>
                </button>

                <div className="app-profile-wrap">
                  <div
                    className="app-profile"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProfileDropdownOpen((v) => !v);
                    }}
                    title={`Perfil: ${currentProfile}`}
                  >
                    {currentProfile.charAt(0).toUpperCase()}
                  </div>
                  {profileDropdownOpen && (
                    <div className="app-profile-dropdown" onClick={(e) => e.stopPropagation()}>
                      <div className="app-profile-dropdown-header">Perfil actual</div>
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
                        <GearIcon /> Configuración
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="app-content">
        {section === "settings" && (
          <Settings
            onScan={handleScan}
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
          />
        )}

        {loaded === false && section !== "settings" && (
          <div className="app-welcome">
            <h1>NewGame+</h1>
            <p>Configura tus carpetas de ROMs para comenzar</p>
            <button
              className="app-welcome-btn"
              onClick={() => setSection("settings")}
            >
              Configurar
            </button>
          </div>
        )}

        {loaded === true && section === "home" && (
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
                    title={`Resultados de búsqueda (${searchResults.length})`}
                    games={searchResults}
                    onSelect={setSelectedGame}
                    onFavoriteChanged={handleFavoriteChanged}
                    focusedId={showNavFocus ? searchResults[flatFocusIdx]?.id : null}
                  />
                ) : (
                  <p style={{ color: "#777", padding: "32px 0", textAlign: "center", fontSize: "16px" }}>
                    No se encontraron resultados para "{searchQuery}"
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
                      className={`library-filter-item ${selectedCompany === company ? "active" : ""}`}
                      onClick={() => setSelectedCompany(company === selectedCompany ? "all" : company)}
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
                title="Favoritos"
                games={favorites}
                onSelect={setSelectedGame}
                onFavoriteChanged={handleFavoriteChanged}
                focusedId={showNavFocus ? favorites[flatFocusIdx]?.id : null}
              />
            ) : (
              <p style={{ color: "#555", padding: "48px", textAlign: "center" }}>
                No hay favoritos aún
              </p>
            )}
          </div>
        )}

        {loaded === true && section === "search" && (
          <div style={{ padding: "48px" }}>
            {searchResults.length > 0 ? (
              <CategoryRow
                title={`Resultados (${searchResults.length})`}
                games={searchResults}
                onSelect={setSelectedGame}
                onFavoriteChanged={handleFavoriteChanged}
                focusedId={showNavFocus ? searchResults[flatFocusIdx]?.id : null}
              />
            ) : (
              <p style={{ color: "#555", padding: "48px", textAlign: "center" }}>
                No se encontraron resultados
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
                aria-label="Volver a géneros"
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
                <span>Volver a Géneros</span>
              </button>

              <div className="genre-view-title-wrap">
                <h2 className="genre-view-title">
                  {effectiveCompany !== "all" ? `${selectedGenre} • ${effectiveCompany}` : selectedGenre}
                </h2>
                <span className="genre-view-count">
                  {activeGenreGames.length} {activeGenreGames.length === 1 ? "juego" : "juegos"}
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
                No hay juegos en este género {effectiveCompany !== "all" ? `para ${effectiveCompany}` : ""}
              </p>
            )}
          </div>
        )}

        {loaded === true && section === "genres" && (
          <div className="genres-container">
            <div className="genres-header">
              <div className="genres-header-info">
                <h1 className="genres-title">
                  Explorar Géneros
                  {effectiveCompany !== "all" && <span className="genres-company-badge">{effectiveCompany}</span>}
                </h1>
                <p className="genres-subtitle">
                  Descubrí tus juegos organizados por categorías y temáticas
                </p>
              </div>
            </div>

            {genreList.length > 0 ? (
              <div className="genre-cards-grid">
                {genreList.map((g) => {
                  const theme = getGenreTheme(g.name);
                  const bgSrc = g.imagePath ? getCoverUrl(g.imagePath) : "";
                  return (
                    <button
                      key={g.name}
                      className="modern-genre-card"
                      style={{
                        "--genre-color": theme.color,
                        "--genre-glow": theme.glow,
                        "--genre-gradient": theme.gradient,
                      } as React.CSSProperties}
                      onClick={() => handleSelectGenre(g.name)}
                    >
                      <div className="modern-genre-card-inner">
                        {bgSrc ? (
                          <img
                            src={bgSrc}
                            alt=""
                            className="modern-genre-card-bg"
                            loading="lazy"
                          />
                        ) : (
                          <div className="modern-genre-fallback-bg" />
                        )}
                        <div className="modern-genre-card-overlay" />

                        <div className="modern-genre-card-top">
                          <span className="modern-genre-count-badge">
                            {g.count} {g.count === 1 ? "juego" : "juegos"}
                          </span>
                        </div>

                        <div className="modern-genre-card-bottom">
                          <span className="modern-genre-name">{g.name}</span>
                          {g.topGameName && (
                            <span className="modern-genre-featured-label" title={g.topGameName}>
                              Destacado: {g.topGameName}
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
                No hay géneros disponibles {effectiveCompany !== "all" ? `para ${effectiveCompany}` : ""}
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
            setGames((prev) =>
              prev.map((g) => (g.id === updated.id ? updated : g))
            );
            setSelectedGame(updated);
          }}
        />
      )}

      <CastModal
        isOpen={castModalOpen}
        onClose={() => setCastModalOpen(false)}
      />
      </div>
    </MusicProvider>
  );
}

export default App;
