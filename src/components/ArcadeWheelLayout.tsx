import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { Game, GameMetadata, GameAchievementProgress } from "../types";
import {
  launchGame,
  getCoverUrl,
  findGameVideo,
  toggleFavorite,
  getGameMetadata,
  scrapeGameVideo,
  getScreenscraperConfig,
  onScrapeVideoProgress,
  getRACredentials,
  getGameAchievements,
  refreshGameAchievements,
} from "../lib/tauri";
import { playWheelTick } from "../lib/bootSound";
import { PLATFORM_COLORS, getPlatformDisplayName, getPlatformLogo } from "../lib/platforms";
import { ConsoleIcon } from "./ConsoleIcon";
import {
  WheelAchievementsCard,
  WheelVideoPlayer,
  WheelMetadataCard,
  WheelQuickEditMenu,
} from "./wheel";
import FixMatchModal from "./FixMatchModal";
import HeroPickerModal from "./HeroPickerModal";
import LogoPickerModal from "./LogoPickerModal";
import NetplayModal from "./NetplayModal";
import "./ArcadeWheelLayout.css";

interface Props {
  games: Game[];
  initialCategoryType?: string;
  onSelectGame?: (game: Game) => void;
  onFavoriteChanged?: (gameId: string, isFav: boolean) => void;
  onGameUpdated?: (updatedGame: Game) => void;
  onHeroChanged?: (gameId: string, heroPath: string | null) => void;
  onLogoChanged?: (gameId: string, logoPath: string | null) => void;
  onOpenSettings?: () => void;
  onBack?: () => void;
}

export default function ArcadeWheelLayout({
  games,
  onSelectGame,
  onFavoriteChanged,
  onGameUpdated,
  onHeroChanged,
  onLogoChanged,
  onOpenSettings,
}: Props) {
  const { t } = useTranslation();

  // Search State (immediate input state + debounced deferred filtering)
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const deferredSearchQuery = useDeferredValue(debouncedSearchQuery);

  // Accordion State:
  // Normal mode (no search): strictly ONE console open at a time (or null = all collapsed).
  // Entry starts fully collapsed: wheel/arrows move the console cursor first.
  const [openConsole, setOpenConsole] = useState<string | null>(null);

  // Console cursor: when NO console is open, wheel/arrows move between consoles
  // (previewing each one's first game) instead of diving into games.
  const [focusedConsole, setFocusedConsole] = useState<string | null>(null);

  // Search mode: tracks consoles manually collapsed by the user during search
  const [searchCollapsedConsoles, setSearchCollapsedConsoles] = useState<Set<string>>(new Set());

  // Selected Game State
  const [selectedGameId, setSelectedGameId] = useState<string | null>(() => {
    return games[0]?.id || null;
  });

  // Metadata, Scraping & RetroAchievements State
  const [metadata, setMetadata] = useState<GameMetadata | null>(null);
  const [scrapingVideo, setScrapingVideo] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Edit Menu State (FixMatch, HeroPicker, LogoPicker, ScreenScraper, Quick Title Rename)
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [showFixMatchModal, setShowFixMatchModal] = useState(false);
  const [showHeroPickerModal, setShowHeroPickerModal] = useState(false);
  const [showLogoPickerModal, setShowLogoPickerModal] = useState(false);
  const [showNetplayModal, setShowNetplayModal] = useState(false);
  const [netplayCoreName, setNetplayCoreName] = useState("");

  const [hasRACredentials, setHasRACredentials] = useState(false);
  const [achievements, setAchievements] = useState<GameAchievementProgress | null>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(false);

  // Video Gameplay State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(() => {
    return localStorage.getItem("gameflix_preview_video_muted") === "true";
  });
  const [videoVolume, setVideoVolume] = useState<number>(() => {
    const val = localStorage.getItem("gameflix_preview_video_volume");
    return val !== null ? parseFloat(val) : 0.7;
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const headerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const carouselScrollRef = useRef<HTMLDivElement | null>(null);
  const lastNavTimeRef = useRef<number>(0);
  const prevSearchRef = useRef<string>(searchQuery);

  // Check RA credentials once
  useEffect(() => {
    getRACredentials()
      .then((creds) => setHasRACredentials(!!creds))
      .catch(() => setHasRACredentials(false));
  }, []);

  // Sync audio settings from custom event dispatched by Settings
  useEffect(() => {
    const handleAudioSettingsChange = (e: CustomEvent<{ muted?: boolean; volume?: number }>) => {
      if (e.detail) {
        if (typeof e.detail.muted === "boolean") {
          setIsVideoMuted(e.detail.muted);
        }
        if (typeof e.detail.volume === "number") {
          setVideoVolume(e.detail.volume);
          if (videoRef.current) {
            videoRef.current.volume = e.detail.volume;
          }
        }
      }
    };
    window.addEventListener("preview-audio-settings-changed", handleAudioSettingsChange as EventListener);
    return () => {
      window.removeEventListener("preview-audio-settings-changed", handleAudioSettingsChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = videoVolume;
    }
  }, [videoVolume, videoSrc]);

  // Pause preview video while a game is actively running
  useEffect(() => {
    const handleGameLaunched = () => {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    };
    const handleGameClosed = () => {
      if (videoRef.current && videoSrc) {
        videoRef.current.play().catch(() => {});
      }
    };
    window.addEventListener("game-launched", handleGameLaunched);
    window.addEventListener("game-closed", handleGameClosed);
    return () => {
      window.removeEventListener("game-launched", handleGameLaunched);
      window.removeEventListener("game-closed", handleGameClosed);
    };
  }, [videoSrc]);

  // Real-time Search Filtering (No Dropdown list, filters carousel directly)
  const filteredGames = useMemo(() => {
    if (!deferredSearchQuery.trim()) return games;
    const q = deferredSearchQuery.toLowerCase().trim();
    return games.filter((g) => {
      const title = (g.display_name || g.name || "").toLowerCase();
      const plat = (g.platform || "").toLowerCase();
      const dev = (g.developer || "").toLowerCase();
      const pub = (g.publisher || "").toLowerCase();
      const genre = (g.genre || "").toLowerCase();
      return (
        title.includes(q) ||
        plat.includes(q) ||
        dev.includes(q) ||
        pub.includes(q) ||
        genre.includes(q)
      );
    });
  }, [games, deferredSearchQuery]);

  // Group filtered games by console/platform (osu! Beatmap Sets / Stars grouping style)
  const groupedConsoles = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const g of filteredGames) {
      const plat = g.platform || "OTHER";
      if (!map.has(plat)) map.set(plat, []);
      map.get(plat)!.push(g);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredGames]);

  // Accordion open checker:
  // - If search is active: all matching consoles are open by default (unless manually collapsed)
  // - If search is empty: strictly only openConsole is open (single accordion)
  const isConsoleOpen = useCallback(
    (platform: string) => {
      if (deferredSearchQuery.trim().length > 0) {
        return !searchCollapsedConsoles.has(platform);
      }
      return openConsole === platform;
    },
    [deferredSearchQuery, searchCollapsedConsoles, openConsole]
  );

  // Toggle console collapse / expand
  const toggleConsole = useCallback(
    (platform: string) => {
      if (deferredSearchQuery.trim().length > 0) {
        setSearchCollapsedConsoles((prev) => {
          const next = new Set(prev);
          if (next.has(platform)) {
            next.delete(platform);
          } else {
            next.add(platform);
          }
          return next;
        });
      } else {
        // Single accordion toggle: clicking the open console collapses it; clicking another opens it.
        // The cursor follows so collapsing drops into console mode from this console.
        setFocusedConsole(platform);
        setOpenConsole((prev) => {
          const nextPlat = prev === platform ? null : platform;
          if (nextPlat) {
            const platGames = groupedConsoles.find(([p]) => p === nextPlat)?.[1];
            if (platGames && platGames.length > 0) {
              setSelectedGameId(platGames[0].id);
            }
          }
          return nextPlat;
        });
      }
      playWheelTick(0.25);
    },
    [deferredSearchQuery, groupedConsoles]
  );

  // Active game resolution
  const activeGame: Game | null = useMemo(() => {
    if (filteredGames.length === 0) return null;
    const found = filteredGames.find((g) => g.id === selectedGameId);
    return found || filteredGames[0] || null;
  }, [filteredGames, selectedGameId]);

  // Keep selectedGameId in sync with activeGame
  useEffect(() => {
    if (activeGame && activeGame.id !== selectedGameId) {
      setSelectedGameId(activeGame.id);
    }
  }, [activeGame, selectedGameId]);

  // When search transitions from active to empty, reset openConsole to active game's platform
  useEffect(() => {
    const wasSearching = prevSearchRef.current.trim().length > 0;
    const isSearching = deferredSearchQuery.trim().length > 0;
    prevSearchRef.current = deferredSearchQuery;

    if (wasSearching && !isSearching) {
      setSearchCollapsedConsoles(new Set());
      if (activeGame?.platform) {
        setOpenConsole(activeGame.platform);
      }
    }
  }, [deferredSearchQuery, activeGame?.platform]);

  // Flattened list of currently visible games (inside open consoles)
  const visibleGames = useMemo(() => {
    const list: Game[] = [];
    for (const [platform, platformGames] of groupedConsoles) {
      if (isConsoleOpen(platform)) {
        list.push(...platformGames);
      }
    }
    return list;
  }, [groupedConsoles, isConsoleOpen]);

  // Fetch detailed metadata whenever active game changes
  useEffect(() => {
    let cancelled = false;
    if (!activeGame) {
      setMetadata(null);
      return;
    }
    getGameMetadata(activeGame.rom_path)
      .then((meta) => {
        if (!cancelled && meta) setMetadata(meta);
      })
      .catch(() => {
        if (!cancelled) setMetadata(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeGame?.rom_path]);

  const raRequestIdRef = useRef(0);

  // Fetch RetroAchievements for active game
  useEffect(() => {
    if (!hasRACredentials || !activeGame) {
      setAchievements(null);
      setAchievementsLoading(false);
      return;
    }

    const currentReqId = ++raRequestIdRef.current;
    setAchievementsLoading(true);
    setAchievements(null);

    getGameAchievements(activeGame.rom_path)
      .then((ach) => {
        if (currentReqId === raRequestIdRef.current) {
          setAchievements(ach);
          setAchievementsLoading(false);
        }
      })
      .catch((err) => {
        console.error("RetroAchievements fetch failed:", err);
        if (currentReqId === raRequestIdRef.current) {
          setAchievements(null);
          setAchievementsLoading(false);
        }
      });
  }, [activeGame?.rom_path, hasRACredentials]);

  const handleRefreshAchievements = useCallback(async () => {
    if (!activeGame) return;
    const currentReqId = ++raRequestIdRef.current;
    setAchievementsLoading(true);
    try {
      const refreshed = await refreshGameAchievements(activeGame.rom_path);
      if (currentReqId === raRequestIdRef.current) {
        setAchievements(refreshed);
      }
    } catch (e) {
      console.error("Refresh achievements failed:", e);
    } finally {
      if (currentReqId === raRequestIdRef.current) {
        setAchievementsLoading(false);
      }
    }
  }, [activeGame]);

  // Check for local video snap whenever active game changes
  useEffect(() => {
    let isCancelled = false;
    if (!activeGame) {
      setVideoSrc(null);
      return;
    }

    findGameVideo(activeGame.rom_path, activeGame.id)
      .then((path) => {
        if (!isCancelled) {
          setVideoSrc(path);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setVideoSrc(null);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeGame]);

  // Listen to video scrape download progress
  useEffect(() => {
    const unlisten = onScrapeVideoProgress((payload) => {
      if (activeGame && payload.game_id === activeGame.id) {
        setDownloadProgress(payload.percent);
      }
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [activeGame]);

  // Auto-update video preview if newly scraped/downloaded
  useEffect(() => {
    const handleGameVideoUpdated = (
      e: CustomEvent<{ gameId: string; videoPath?: string | null; logoPath?: string | null }>
    ) => {
      if (activeGame && e.detail && e.detail.gameId === activeGame.id) {
        if (e.detail.videoPath) {
          setVideoSrc(e.detail.videoPath);
        } else {
          findGameVideo(activeGame.rom_path, activeGame.id).then((path) => {
            if (path) setVideoSrc(path);
          });
        }
      }
    };
    window.addEventListener("game-video-updated", handleGameVideoUpdated as EventListener);
    return () => {
      window.removeEventListener("game-video-updated", handleGameVideoUpdated as EventListener);
    };
  }, [activeGame]);

  // Download video gameplay via ScreenScraper
  const handleDownloadVideo = useCallback(async () => {
    if (!activeGame) return;
    setScrapingVideo(true);
    setDownloadProgress(3);
    try {
      const cfg = await getScreenscraperConfig();
      if (!cfg.has_dev_credentials) {
        window.dispatchEvent(
          new CustomEvent("app-error", {
            detail: "Configura tus credenciales de ScreenScraper en Configuración > Integraciones",
          })
        );
        return;
      }

      const res = await scrapeGameVideo(
        activeGame.id,
        activeGame.rom_path,
        activeGame.platform,
        activeGame.display_name || metadata?.display_name || activeGame.name,
        !activeGame.logo_path
      );

      if (res.success) {
        setDownloadProgress(100);
        if (res.video_path) {
          setVideoSrc(res.video_path);
        }
        window.dispatchEvent(
          new CustomEvent("game-video-updated", {
            detail: {
              gameId: activeGame.id,
              videoPath: res.video_path,
              logoPath: res.logo_path,
            },
          })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent("app-error", {
            detail: res.message || "No se pudo descargar el gameplay",
          })
        );
      }
    } catch (err) {
      const msg = typeof err === "string" ? err : err instanceof Error ? err.message : "Error al descargar gameplay";
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: msg,
        })
      );
    } finally {
      setScrapingVideo(false);
    }
  }, [activeGame, metadata?.display_name]);

  // Keep the focused console header visible while moving between consoles
  // (normal mode only; search mode navigates games across consoles instead)
  useEffect(() => {
    if (openConsole || !focusedConsole || deferredSearchQuery.trim().length > 0) return;
    const headerEl = headerRefs.current.get(focusedConsole);
    if (headerEl) {
      headerEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [focusedConsole, openConsole, deferredSearchQuery]);

  // Auto-scroll selected card into view
  useEffect(() => {
    if (!activeGame?.id) return;
    const cardEl = cardRefs.current.get(activeGame.id);
    if (cardEl) {
      cardEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  }, [activeGame?.id]);

  // Console-level navigation: used when NO console is open (all collapsed).
  // Moves the cursor between consoles, previewing each one's first game in
  // the showcase. Wraps around like game navigation does.
  const navigateConsole = useCallback(
    (delta: number) => {
      if (groupedConsoles.length === 0) return;
      const currentIdx = focusedConsole
        ? groupedConsoles.findIndex(([p]) => p === focusedConsole)
        : -1;
      const nextIdx =
        currentIdx < 0
          ? delta > 0
            ? 0
            : groupedConsoles.length - 1
          : (currentIdx + delta + groupedConsoles.length) % groupedConsoles.length;
      const next = groupedConsoles[nextIdx];
      if (!next) return;
      setFocusedConsole(next[0]);
      if (next[1].length > 0) {
        setSelectedGameId(next[1][0].id);
      }
      playWheelTick(0.28);
    },
    [groupedConsoles, focusedConsole]
  );

  // Navigation: Navigate up/down through visible games, crossing into next/previous console seamlessly
  const navigateGame = useCallback(
    (delta: number) => {
      if (groupedConsoles.length === 0) return;

      // In search mode, visibleGames spans all matching consoles simultaneously
      if (deferredSearchQuery.trim().length > 0) {
        if (visibleGames.length === 0) return;
        const currentIndex = visibleGames.findIndex((g) => g.id === activeGame?.id);
        let nextIndex = currentIndex + delta;
        if (nextIndex < 0) nextIndex = visibleGames.length - 1;
        if (nextIndex >= visibleGames.length) nextIndex = 0;
        const nextGame = visibleGames[nextIndex];
        if (nextGame) {
          setSelectedGameId(nextGame.id);
          playWheelTick(0.28);
        }
        return;
      }

      // Normal mode with no console open: move the console cursor (not into games)
      if (!openConsole) {
        navigateConsole(delta);
        return;
      }

      const currentConsoleIdx = groupedConsoles.findIndex(([p]) => p === openConsole);
      const currentPlatGames = currentConsoleIdx >= 0 ? groupedConsoles[currentConsoleIdx][1] : [];

      if (currentPlatGames.length === 0) {
        // Find next console with games
        let nextIdx = (currentConsoleIdx + (delta > 0 ? 1 : -1) + groupedConsoles.length) % groupedConsoles.length;
        const nextPlat = groupedConsoles[nextIdx];
        if (nextPlat) {
          setOpenConsole(nextPlat[0]);
          if (nextPlat[1].length > 0) {
            setSelectedGameId(nextPlat[1][0].id);
          }
          playWheelTick(0.28);
        }
        return;
      }

      const currentIndex = currentPlatGames.findIndex((g) => g.id === activeGame?.id);
      const nextIndex = currentIndex + delta;

      // Case 1: Within the current console games
      if (nextIndex >= 0 && nextIndex < currentPlatGames.length) {
        setSelectedGameId(currentPlatGames[nextIndex].id);
        playWheelTick(0.28);
        return;
      }

      // Case 2: Crossed bottom boundary -> Switch to NEXT console, close current
      if (delta > 0 && nextIndex >= currentPlatGames.length) {
        let nextConsoleIdx = (currentConsoleIdx + 1) % groupedConsoles.length;
        for (let i = 0; i < groupedConsoles.length; i++) {
          const candidate = groupedConsoles[nextConsoleIdx];
          if (candidate && candidate[1].length > 0) {
            setOpenConsole(candidate[0]);
            setSelectedGameId(candidate[1][0].id); // First game of next console
            playWheelTick(0.32);
            return;
          }
          nextConsoleIdx = (nextConsoleIdx + 1) % groupedConsoles.length;
        }
      }

      // Case 3: Crossed top boundary -> Switch to PREVIOUS console, close current
      if (delta < 0 && nextIndex < 0) {
        let prevConsoleIdx = (currentConsoleIdx - 1 + groupedConsoles.length) % groupedConsoles.length;
        for (let i = 0; i < groupedConsoles.length; i++) {
          const candidate = groupedConsoles[prevConsoleIdx];
          if (candidate && candidate[1].length > 0) {
            setOpenConsole(candidate[0]);
            setSelectedGameId(candidate[1][candidate[1].length - 1].id); // Last game of previous console
            playWheelTick(0.32);
            return;
          }
          prevConsoleIdx = (prevConsoleIdx - 1 + groupedConsoles.length) % groupedConsoles.length;
        }
      }
    },
    [groupedConsoles, openConsole, activeGame?.id, visibleGames, deferredSearchQuery, navigateConsole]
  );

  // Random Game Selection (osu! Random Button)
  const handleRandomGame = useCallback(() => {
    if (filteredGames.length === 0) return;
    const randomIndex = Math.floor(Math.random() * filteredGames.length);
    const chosen = filteredGames[randomIndex];
    if (chosen) {
      setSelectedGameId(chosen.id);
      if (chosen.platform) {
        setOpenConsole(chosen.platform);
        if (deferredSearchQuery.trim().length > 0) {
          setSearchCollapsedConsoles((prev) => {
            const next = new Set(prev);
            next.delete(chosen.platform);
            return next;
          });
        }
      }
      playWheelTick(0.38);
    }
  }, [filteredGames, deferredSearchQuery]);

  // Launch Game
  const handlePlayGame = useCallback(
    async (gameToPlay?: Game | null) => {
      const target = gameToPlay || activeGame;
      if (!target) return;
      try {
        await launchGame(target.rom_path);
      } catch (err) {
        console.error("Failed to launch game:", err);
      }
    },
    [activeGame]
  );

  // Toggle Favorite
  const handleToggleFav = useCallback(
    async (gameToFav?: Game | null) => {
      const target = gameToFav || activeGame;
      if (!target) return;
      try {
        const newFav = await toggleFavorite(target.id);
        onFavoriteChanged?.(target.id, newFav);
      } catch (err) {
        console.error("Failed to toggle favorite:", err);
      }
    },
    [activeGame, onFavoriteChanged]
  );

  // Launch Netplay
  const handleNetplay = useCallback(() => {
    if (!activeGame) return;
    const plat = (activeGame.platform || "").toUpperCase();
    const unsupportedPlatforms = ["3DS", "SWITCH", "PS2", "PS3", "GAMECUBE", "WII", "PC"];
    if (unsupportedPlatforms.includes(plat)) {
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: `Netplay no está disponible para ${plat}. Funciona con emuladores de RetroArch (SNES, NES, GBA, Genesis, Arcade, PS1, etc.).`,
        })
      );
      return;
    }

    const core = activeGame.core_name;
    if (!core) {
      window.dispatchEvent(
        new CustomEvent("app-error", {
          detail: "No se ha configurado un core de RetroArch para este juego.",
        })
      );
      return;
    }

    setNetplayCoreName(core);
    setShowNetplayModal(true);
  }, [activeGame]);

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;

      // If user is typing inside search input, allow normal typing
      if (isInputFocused) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          e.preventDefault();
          searchInputRef.current?.blur();
          if (e.key === "Enter" && activeGame) {
            handlePlayGame();
          }
        }
        return;
      }

      // If edit options menu or modals are open, they handle their own dedicated shortcuts
      if (
        isEditMenuOpen ||
        showFixMatchModal ||
        showHeroPickerModal ||
        showLogoPickerModal ||
        showNetplayModal
      ) {
        return;
      }

      // Handle Escape
      if (e.key === "Escape") {
        e.preventDefault();
        if (searchQuery) {
          setSearchQuery("");
        }
        return;
      }

      // osu! Typing Behavior: Typing alphanumeric keys automatically focuses search!
      if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        /[a-zA-Z0-9 ]/.test(e.key)
      ) {
        searchInputRef.current?.focus();
        return;
      }

      const now = Date.now();
      if (now - lastNavTimeRef.current < 70) {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          return;
        }
      }

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        lastNavTimeRef.current = now;
        navigateGame(-1);
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        lastNavTimeRef.current = now;
        navigateGame(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeGame?.platform && isConsoleOpen(activeGame.platform)) {
          toggleConsole(activeGame.platform);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (activeGame?.platform && !isConsoleOpen(activeGame.platform)) {
          toggleConsole(activeGame.platform);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeGame?.platform && !isConsoleOpen(activeGame.platform)) {
          // Focused console is closed: open it first (selects its first game).
          // A second Enter once inside plays the game.
          setFocusedConsole(activeGame.platform);
          setOpenConsole(activeGame.platform);
          const platGames = groupedConsoles.find(([p]) => p === activeGame.platform)?.[1];
          if (platGames && platGames.length > 0) {
            setSelectedGameId(platGames[0].id);
          }
          playWheelTick(0.3);
        } else {
          handlePlayGame();
        }
      } else if (e.key === " " || e.key.toLowerCase() === "i" || e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (activeGame) {
          setIsEditMenuOpen((prev) => !prev);
        }
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        handleToggleFav();
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleRandomGame();
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        setIsVideoMuted((v) => !v);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    searchQuery,
    activeGame,
    isConsoleOpen,
    toggleConsole,
    navigateGame,
    handlePlayGame,
    handleToggleFav,
    handleRandomGame,
    onSelectGame,
    isEditMenuOpen,
    groupedConsoles,
  ]);

  // Mouse Wheel Navigation across Games (Smooth Ratchet Feel)
  const wheelAccumulatorRef = useRef<number>(0);
  const lastWheelTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleWindowWheel = (e: WheelEvent) => {
      // Don't intercept if any modal or editing menu is open
      if (
        isEditMenuOpen ||
        showFixMatchModal ||
        showHeroPickerModal ||
        showLogoPickerModal ||
        showNetplayModal
      ) {
        return;
      }

      // If hovering over scrollable achievements list or text inputs, let them scroll naturally
      const target = e.target as HTMLElement | null;
      if (target?.closest(".achievement-items-col, .osu-top-col-achievements, input, textarea")) {
        return;
      }

      // Check if mouse is over carousel or general arcade showcase area
      const isOverInteractiveArea = !!target?.closest(
        ".osu-carousel-section, .osu-carousel-scroll, .osu-game-card, .osu-group-header, .osu-showcase-section, .osu-video-bottom-card"
      );

      if (!isOverInteractiveArea) {
        return;
      }

      // Intercept and navigate games
      e.preventDefault();

      const now = Date.now();
      // Reset accumulator if user stopped scrolling for > 180ms
      if (now - lastWheelTimeRef.current > 180) {
        wheelAccumulatorRef.current = 0;
      }

      wheelAccumulatorRef.current += e.deltaY;
      const THRESHOLD = 35; // Responsive notch threshold
      const MIN_INTERVAL = 60; // ms minimum between game changes

      if (
        Math.abs(wheelAccumulatorRef.current) >= THRESHOLD &&
        now - lastWheelTimeRef.current >= MIN_INTERVAL
      ) {
        const delta = wheelAccumulatorRef.current > 0 ? 1 : -1;
        navigateGame(delta);
        wheelAccumulatorRef.current = 0;
        lastWheelTimeRef.current = now;
      }
    };

    window.addEventListener("wheel", handleWindowWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWindowWheel);
    };
  }, [
    navigateGame,
    isEditMenuOpen,
    showFixMatchModal,
    showHeroPickerModal,
    showLogoPickerModal,
    showNetplayModal,
  ]);

  // Formatted playtime
  const formattedPlaytime = useMemo(() => {
    const secs = activeGame?.play_time_secs;
    if (!secs || secs <= 0) return t("hero.notPlayed", "Sin jugar");
    if (secs < 60) return "< 1 min";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
  }, [activeGame?.play_time_secs, t]);

  // Global background image (hero banner or cover fallback)
  const globalBg = useMemo(() => {
    if (!activeGame) return "";
    return getCoverUrl(activeGame.hero_path || activeGame.cover_path);
  }, [activeGame]);

  // Platform brand color for active game
  const activeBrandColor = activeGame?.platform
    ? PLATFORM_COLORS[activeGame.platform] || "#00f0ff"
    : "#00f0ff";

  return (
    <div className="osu-arcade-layout">
      {/* Fullscreen Atmospheric Background Hero */}
      {globalBg && (
        <div
          className="osu-global-backdrop"
          style={{ backgroundImage: `url(${globalBg})` }}
          aria-hidden="true"
        />
      )}
      <div className="osu-vignette-overlay" aria-hidden="true" />

      {/* Main Two-Panel Content Zone (Left: 65%, Right: 35%) */}
      <div className="osu-main-stage">
        {/* ========================================================
            LEFT PANEL: Full Game Detail (Top) + Large Video (Bottom)
           ======================================================== */}
        <section className="osu-showcase-panel">
          {activeGame ? (
            <div className="osu-showcase-card">
              {/* TOP SECTION: Full Detail Card (Tools + Hero + Meta + Achievements + Play) */}
              <div className="osu-detail-top-card">
                {/* Row 1: Platform Badge & Action Tool Buttons */}
                <div className="osu-detail-tools-row">
                  <div
                    className="osu-platform-badge"
                    style={{
                      borderColor: `${activeBrandColor}88`,
                      backgroundColor: `${activeBrandColor}22`,
                      color: activeBrandColor,
                    }}
                  >
                    <ConsoleIcon platform={activeGame.platform} size={15} />
                    <span>{getPlatformDisplayName(activeGame.platform)}</span>
                  </div>

                  <div className="osu-detail-tools-actions">
                    <button
                      type="button"
                      className="osu-tool-btn osu-btn-edit-main"
                      onClick={() => setIsEditMenuOpen(true)}
                      title="Opciones de edición del juego (Tecla E)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                      <span>{t("common.edit", "Editar")}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Split Row: Left (65% Hero + Meta + Play) & Right (35% RetroAchievements) */}
                <div className="osu-top-split-row">
                  <WheelMetadataCard
                    activeGame={activeGame}
                    metadata={metadata}
                    globalBg={globalBg}
                    formattedPlaytime={formattedPlaytime}
                    onPlayGame={() => handlePlayGame()}
                    onToggleFavorite={() => handleToggleFav()}
                    onNetplay={handleNetplay}
                  />

                  <div className="osu-top-col-achievements">
                    <WheelAchievementsCard
                      hasRACredentials={hasRACredentials}
                      achievementsLoading={achievementsLoading}
                      achievements={achievements}
                      onRefresh={handleRefreshAchievements}
                    />
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: Large Wide Video Preview Monitor (CRT Frame) */}
              <WheelVideoPlayer
                videoSrc={videoSrc}
                activeGame={activeGame}
                metadata={metadata}
                videoRef={videoRef}
                isVideoMuted={isVideoMuted}
                videoVolume={videoVolume}
              />
            </div>
          ) : (
            <div className="osu-empty-showcase">
              <span className="osu-empty-icon">🎮</span>
              <p>{t("arcade.emptyGames", "No hay juegos disponibles en esta selección.")}</p>
            </div>
          )}
        </section>

        {/* ========================================================
            RIGHT PANEL: osu! Song Select Carousel & Search (35%)
           ======================================================== */}
        <section className="osu-carousel-section">

          {/* Top Search Bar (osu! Search Style - No Dropdown) */}
          <div className="osu-search-bar-container">
            <div className="osu-search-meta-row">
              <span className="osu-search-count">
                {searchQuery.trim()
                  ? t("arcade.matchesCount", { count: filteredGames.length })
                  : t("arcade.libraryCount", { count: filteredGames.length })}
              </span>
            </div>

            <div className="osu-search-input-box">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("arcade.searchPlaceholder", "Buscar juego, consola o género...")}
                className="osu-search-input"
              />
              {searchQuery ? (
                <button
                  type="button"
                  className="osu-search-clear-btn"
                  onClick={() => setSearchQuery("")}
                  title={t("common.clearSearch")}
                >
                  ✕
                </button>
              ) : (
                <svg
                  className="osu-search-mag-icon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              )}
            </div>
          </div>

          {/* Carousel Scrollable List of Beatmap/Game Cards */}
          <div className="osu-carousel-scroll" ref={carouselScrollRef}>
            {groupedConsoles.length === 0 ? (
              <div className="osu-carousel-empty">
                <span>🔍</span>
                <p>{t("arcade.noResultsFor", { query: searchQuery })}</p>
              </div>
            ) : (
              groupedConsoles.map(([platform, platformGames]) => {
                const isExpanded = isConsoleOpen(platform);
                const brandColor = PLATFORM_COLORS[platform] || "#00f0ff";
                const platName = getPlatformDisplayName(platform);
                const logoUrl = getPlatformLogo(platform);

                return (
                  <div
                    key={platform}
                    className="osu-console-group"
                    style={
                      {
                        "--console-color": brandColor,
                        "--console-color-glow": `${brandColor}55`,
                      } as CSSProperties
                    }
                  >
                    {/* Console Header Card (Option A: Logo Hero) */}
                    <div
                      ref={(el) => {
                        if (el) headerRefs.current.set(platform, el);
                        else headerRefs.current.delete(platform);
                      }}
                      className={`osu-group-header ${isExpanded ? "expanded" : "collapsed"}${!isExpanded && focusedConsole === platform && !deferredSearchQuery.trim() ? " console-focused" : ""}`}
                      style={{
                        "--console-color": brandColor,
                        "--console-color-glow": `${brandColor}55`,
                      } as React.CSSProperties}
                      onClick={() => toggleConsole(platform)}
                      title={`${platName} (${isExpanded ? t("arcade.collapseConsole") : t("arcade.expandConsole")})`}
                    >
                      <div className="osu-group-header-left">
                        {logoUrl ? (
                          <div className="osu-group-logo-box">
                            <img
                              src={logoUrl}
                              alt={platName}
                              className="osu-group-logo-img"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="osu-group-fallback-row">
                            <div className="osu-group-icon-fallback">
                              <ConsoleIcon platform={platform} size={24} />
                            </div>
                            <span className="osu-group-title">{platName}</span>
                          </div>
                        )}
                      </div>

                      <div className="osu-group-header-right">
                        <span className="osu-group-count-pill">
                          <span className="osu-group-count-num">{platformGames.length}</span>
                          <span className="osu-group-count-sub">
                            {platformGames.length === 1 ? t("common.game", "juego") : t("common.games", "juegos")}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Console Game Cards (Only rendered when console is expanded) */}
                    {isExpanded && (
                      <div className="osu-cards-container">
                        {platformGames.map((game) => {
                          const isSelected = activeGame?.id === game.id;
                          const coverUrl = getCoverUrl(game.cover_path);
                          const heroUrl = getCoverUrl(game.hero_path || game.cover_path);

                          return (
                            <div
                              key={game.id}
                              ref={(el) => {
                                if (el) cardRefs.current.set(game.id, el);
                                else cardRefs.current.delete(game.id);
                              }}
                              className={`osu-game-card ${isSelected ? "selected" : ""}`}
                              style={
                                {
                                  "--console-color": brandColor,
                                  "--console-color-glow": `${brandColor}55`,
                                } as CSSProperties
                              }
                              onClick={() => {
                                if (isSelected) {
                                  handlePlayGame(game);
                                } else {
                                  setSelectedGameId(game.id);
                                  if (game.platform && game.platform !== openConsole && !deferredSearchQuery.trim()) {
                                    setOpenConsole(game.platform);
                                  }
                                  playWheelTick(0.25);
                                }
                              }}
                            >
                              {/* Left Disc / Pip Indicator */}
                              <div
                                className={`osu-card-pip ${isSelected ? "active" : ""}`}
                                style={{
                                  borderColor: isSelected ? "#ffd700" : `${brandColor}88`,
                                  backgroundColor: isSelected ? "#ffd700" : "transparent",
                                }}
                              >
                                <span className="osu-pip-inner" />
                              </div>

                              {/* Game Info Details */}
                              <div className="osu-card-body">
                                <div className="osu-card-title-row">
                                  <span className="osu-card-title">
                                    {game.display_name || game.name}
                                  </span>
                                  {game.favorite && (
                                    <span className="osu-card-fav-star">★</span>
                                  )}
                                </div>
                              </div>

                              {/* Right Angled Slice Image (Cover / Hero) */}
                              <div className="osu-card-angled-slice">
                                {heroUrl || coverUrl ? (
                                  <div
                                    className="osu-card-slice-img"
                                    style={{
                                      backgroundImage: `url(${heroUrl || coverUrl})`,
                                    }}
                                  />
                                ) : (
                                  <div
                                    className="osu-card-slice-fallback"
                                    style={{ backgroundColor: `${brandColor}44` }}
                                  />
                                )}
                                <div className="osu-card-slice-fade" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ========================================================
          BOTTOM BAR: osu! Song Select Action Bar (Random & Options)
         ======================================================== */}
      <footer className="osu-bottom-bar">
        {/* Actions: Random (Teal/Cyan) & Options (Purple) */}
        <div className="osu-bottom-center">
          <button
            type="button"
            className="osu-bottom-btn osu-btn-random"
            onClick={handleRandomGame}
            title={t("arcade.randomGame", "Elegir un juego al azar (Tecla R)")}
          >
            <svg
              className="osu-btn-icon"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="16 3 21 3 21 8" />
              <line x1="4" y1="20" x2="21" y2="3" />
              <polyline points="21 16 21 21 16 21" />
              <line x1="15" y1="15" x2="21" y2="21" />
              <line x1="4" y1="4" x2="9" y2="9" />
            </svg>
            <span>{t("arcade.randomGame", "Random")}</span>
          </button>

          <button
            type="button"
            className="osu-bottom-btn osu-btn-options"
            onClick={onOpenSettings}
            title={t("arcade.options", "Abrir configuración")}
          >
            <svg
              className="osu-btn-icon"
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>{t("arcade.options", "Options")}</span>
          </button>
        </div>

        {/* Right Actions: Key Hints */}
        <div className="osu-bottom-hints">
          <span>▲▼ {t("arcade.hintWheelGames", "Navegar")}</span>
          <span>◄► {t("arcade.hintWheelConsoles", "Consolas")}</span>
          <span>{t("arcade.hintPlay", "[A/Enter] Jugar")}</span>
          <span>{t("arcade.hintFav", "[Y/F] Favorito")}</span>
        </div>
      </footer>

      {/* EDIT OPTIONS MODAL */}
      {activeGame && (
        <WheelQuickEditMenu
          isOpen={isEditMenuOpen}
          onClose={() => setIsEditMenuOpen(false)}
          activeGame={activeGame}
          metadata={metadata}
          activeBrandColor={activeBrandColor}
          onOpenFixMatch={() => setShowFixMatchModal(true)}
          onOpenHeroPicker={() => setShowHeroPickerModal(true)}
          onOpenLogoPicker={() => setShowLogoPickerModal(true)}
          onDownloadVideo={handleDownloadVideo}
          scrapingVideo={scrapingVideo}
          downloadProgress={downloadProgress}
          videoSrc={videoSrc}
          onGameUpdated={onGameUpdated}
        />
      )}

      {/* Standalone FixMatch / Edit Data Modal */}
      {showFixMatchModal && activeGame && (
        <FixMatchModal
          game={activeGame}
          onClose={() => setShowFixMatchModal(false)}
          onMatchApplied={(updatedGame) => {
            setShowFixMatchModal(false);
            onGameUpdated?.(updatedGame);
          }}
        />
      )}

      {/* Standalone Hero Gallery Modal */}
      {showHeroPickerModal && activeGame && (
        <HeroPickerModal
          game={activeGame}
          isOpen={showHeroPickerModal}
          onClose={() => setShowHeroPickerModal(false)}
          onHeroSelected={(newHeroPath) => {
            setShowHeroPickerModal(false);
            onHeroChanged?.(activeGame.id, newHeroPath);
          }}
        />
      )}

      {/* Standalone Logo Search Modal */}
      {showLogoPickerModal && activeGame && (
        <LogoPickerModal
          game={activeGame}
          isOpen={showLogoPickerModal}
          onClose={() => setShowLogoPickerModal(false)}
          onLogoSelected={(newLogoPath) => {
            setShowLogoPickerModal(false);
            onLogoChanged?.(activeGame.id, newLogoPath);
          }}
        />
      )}

      {/* Standalone Netplay Modal */}
      {showNetplayModal && activeGame && (
        <NetplayModal
          isOpen={showNetplayModal}
          onClose={() => setShowNetplayModal(false)}
          game={activeGame}
          coreName={netplayCoreName}
        />
      )}
    </div>
  );
}
