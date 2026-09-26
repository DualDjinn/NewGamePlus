import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
import AchievementList from "./AchievementList";
import FixMatchModal from "./FixMatchModal";
import HeroPickerModal from "./HeroPickerModal";
import LogoPickerModal from "./LogoPickerModal";
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

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Accordion State:
  // Normal mode (no search): strictly ONE console open at a time (or null if closed)
  const [openConsole, setOpenConsole] = useState<string | null>(() => {
    return games[0]?.platform || null;
  });

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

  // Edit Menu State (1. Editar datos, 2. Galeria de Hero, 3. Buscar Logo, 4. Descargar Gameplay)
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [showFixMatchModal, setShowFixMatchModal] = useState(false);
  const [showHeroPickerModal, setShowHeroPickerModal] = useState(false);
  const [showLogoPickerModal, setShowLogoPickerModal] = useState(false);

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
    if (!searchQuery.trim()) return games;
    const q = searchQuery.toLowerCase().trim();
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
  }, [games, searchQuery]);

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
      if (searchQuery.trim().length > 0) {
        return !searchCollapsedConsoles.has(platform);
      }
      return openConsole === platform;
    },
    [searchQuery, searchCollapsedConsoles, openConsole]
  );

  // Toggle console collapse / expand
  const toggleConsole = useCallback(
    (platform: string) => {
      if (searchQuery.trim().length > 0) {
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
        // Single accordion toggle: clicking the open console collapses it; clicking another opens it
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
    [searchQuery, groupedConsoles]
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
    const isSearching = searchQuery.trim().length > 0;
    prevSearchRef.current = searchQuery;

    if (wasSearching && !isSearching) {
      setSearchCollapsedConsoles(new Set());
      if (activeGame?.platform) {
        setOpenConsole(activeGame.platform);
      }
    }
  }, [searchQuery, activeGame?.platform]);

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

  // Navigation: Navigate up/down through visible games, crossing into next/previous console seamlessly
  const navigateGame = useCallback(
    (delta: number) => {
      if (groupedConsoles.length === 0) return;

      // In search mode, visibleGames spans all matching consoles simultaneously
      if (searchQuery.trim().length > 0) {
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

      // Normal mode: Single console accordion
      if (!openConsole) {
        const first = groupedConsoles[0];
        if (first) {
          setOpenConsole(first[0]);
          if (first[1].length > 0) {
            setSelectedGameId(first[1][0].id);
            playWheelTick(0.28);
          }
        }
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
    [groupedConsoles, openConsole, activeGame?.id, visibleGames, searchQuery]
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
        if (searchQuery.trim().length > 0) {
          setSearchCollapsedConsoles((prev) => {
            const next = new Set(prev);
            next.delete(chosen.platform);
            return next;
          });
        }
      }
      playWheelTick(0.38);
    }
  }, [filteredGames, searchQuery]);

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

  // Global Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement;

      // If edit options menu is open, handle its dedicated shortcuts
      if (isEditMenuOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          setIsEditMenuOpen(false);
          return;
        }
        if (e.key === "1") {
          e.preventDefault();
          setIsEditMenuOpen(false);
          setShowFixMatchModal(true);
          return;
        }
        if (e.key === "2") {
          e.preventDefault();
          setIsEditMenuOpen(false);
          setShowHeroPickerModal(true);
          return;
        }
        if (e.key === "3") {
          e.preventDefault();
          setIsEditMenuOpen(false);
          setShowLogoPickerModal(true);
          return;
        }
        if (e.key === "4") {
          e.preventDefault();
          setIsEditMenuOpen(false);
          handleDownloadVideo();
          return;
        }
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

      // If user is typing inside the search input, allow normal typing
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
        handlePlayGame();
      } else if (e.key === " " || e.key.toLowerCase() === "i" || e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (activeGame) setIsEditMenuOpen((prev) => !prev);
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
    handleDownloadVideo,
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
        showLogoPickerModal
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
                  {/* Left Column: Hero Banner + Meta Tags + Actions (65%) */}
                  <div className="osu-top-col-hero">
                    {/* Hero Banner (Clean artwork) */}
                    <div className="osu-hero-banner-wrap">
                      {globalBg && (
                        <div
                          className="osu-hero-banner-img"
                          style={{ backgroundImage: `url(${globalBg})` }}
                        />
                      )}
                      <div className="osu-hero-banner-gradient" />

                      {/* Fallback title if game has no hero image */}
                      {!activeGame.hero_path && (
                        <div className="osu-banner-text-box">
                          <h2 className="osu-banner-title">
                            {activeGame.display_name || metadata?.display_name || activeGame.name}
                          </h2>
                        </div>
                      )}
                    </div>

                    {/* Metadata Chips (Year, Genre, Dev, Publisher, Region, Playtime) */}
                    <div className="osu-meta-tags-row">
                      {(metadata?.release_year || activeGame.release_year) && (
                        <span className="osu-meta-pill year">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                            <line x1="16" x2="16" y1="2" y2="6"/>
                            <line x1="8" x2="8" y1="2" y2="6"/>
                            <line x1="3" x2="21" y1="10" y2="10"/>
                          </svg>
                          <span>{metadata?.release_year || activeGame.release_year}</span>
                        </span>
                      )}

                      {(metadata?.genre || activeGame.genre) && (
                        <span className="osu-meta-pill genre">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                          </svg>
                          <span>{metadata?.genre || activeGame.genre}</span>
                        </span>
                      )}

                      {(metadata?.developer || activeGame.developer) && (
                        <span className="osu-meta-pill dev">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 18 22 12 16 6"/>
                            <polyline points="8 6 2 12 8 18"/>
                          </svg>
                          <span>{metadata?.developer || activeGame.developer}</span>
                        </span>
                      )}

                      {metadata?.publisher && metadata.publisher !== (metadata?.developer || activeGame.developer) && (
                        <span className="osu-meta-pill pub">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
                            <path d="M9 22v-4h6v4"/>
                            <path d="M8 6h.01"/>
                            <path d="M16 6h.01"/>
                          </svg>
                          <span>{metadata.publisher}</span>
                        </span>
                      )}

                      {metadata?.region && (
                        <span className="osu-meta-pill region">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="2" x2="22" y1="12" y2="12"/>
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                          </svg>
                          <span>{metadata.region}</span>
                        </span>
                      )}

                      {metadata?.franchise && (
                        <span className="osu-meta-pill franchise">
                          <span>🏷️ {metadata.franchise}</span>
                        </span>
                      )}

                      <span className="osu-meta-pill time">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{formattedPlaytime}</span>
                      </span>
                    </div>

                    {/* Play Button & Favorite Toggle */}
                    <div className="osu-showcase-actions">
                      <button
                        type="button"
                        className="osu-btn-play-large"
                        onClick={() => handlePlayGame()}
                        title={t("arcade.playShortcut", "[ Enter / Botón A ]")}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>{t("hero.playNow", "JUGAR AHORA").toUpperCase()}</span>
                      </button>

                      <button
                        type="button"
                        className={`osu-btn-favorite ${activeGame.favorite ? "active" : ""}`}
                        onClick={() => handleToggleFav()}
                        title={t("arcade.favoriteTooltip", "Alternar favorito (Tecla F / Botón Y)")}
                      >
                        {activeGame.favorite ? "★" : "☆"}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: RetroAchievements Section (35%) */}
                  <div className="osu-top-col-achievements">
                    <div className="osu-row-achievements">
                      {hasRACredentials ? (
                        achievementsLoading ? (
                          <div className="osu-achievements-loading">
                            <span className="osu-btn-spinner" />
                            <span>{t("gameDetail.loadingAchievements", "Cargando logros de RetroAchievements...")}</span>
                          </div>
                        ) : achievements && achievements.total > 0 ? (
                          <AchievementList
                            progress={achievements}
                            onRefresh={handleRefreshAchievements}
                            refreshing={achievementsLoading}
                          />
                        ) : (
                          <div className="osu-no-achievements-notice">
                            <div className="osu-no-achievements-icon-wrap">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                                <path d="M4 22h16"/>
                                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                              </svg>
                            </div>
                            <div className="osu-no-achievements-info">
                              <span className="osu-no-achievements-title">RetroAchievements</span>
                              <span className="osu-no-achievements-desc">
                                Este juego no cuenta actualmente con un set de logros publicado en RetroAchievements.
                              </span>
                            </div>
                            <button
                              type="button"
                              className="osu-no-achievements-retry-btn"
                              onClick={handleRefreshAchievements}
                              disabled={achievementsLoading}
                              title="Reintentar consultar logros en RetroAchievements"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                <path d="M21 3v5h-5" />
                                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                <path d="M3 21v-5h5" />
                              </svg>
                              <span>{t("common.retry", "Reintentar / Sincronizar")}</span>
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="osu-no-achievements-notice not-configured">
                          <div className="osu-no-achievements-icon-wrap">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                              <path d="M4 22h16"/>
                              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
                            </svg>
                          </div>
                          <div className="osu-no-achievements-info">
                            <span className="osu-no-achievements-title">RetroAchievements</span>
                            <span className="osu-no-achievements-desc">
                              Inicia sesión en Configuración &gt; Integraciones para sincronizar tus logros y medallas.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: Large Wide Video Preview Monitor (CRT Frame) */}
              <div className="osu-video-bottom-card">
                <div className="osu-video-wrapper">
                  {videoSrc ? (
                    <video
                      ref={videoRef}
                      key={videoSrc}
                      src={getCoverUrl(videoSrc)}
                      className="osu-snap-video"
                      autoPlay
                      loop
                      playsInline
                      muted={isVideoMuted}
                      onLoadedMetadata={(e) => {
                        e.currentTarget.volume = videoVolume;
                      }}
                    />
                  ) : activeGame.cover_path ? (
                    <div className="osu-video-cover-fallback">
                      <div
                        className="osu-cover-fallback-bg"
                        style={{ backgroundImage: `url(${getCoverUrl(activeGame.cover_path)})` }}
                        aria-hidden="true"
                      />
                      <img
                        src={getCoverUrl(activeGame.cover_path)}
                        alt={activeGame.display_name || metadata?.display_name || activeGame.name}
                        className="osu-cover-fallback-img"
                      />
                    </div>
                  ) : (
                    <div className="osu-video-standby">
                      <div className="osu-standby-grid" />
                      <span className="osu-standby-text">
                        {t("arcade.previewBadgeFallback", "PREVIEW")}
                      </span>
                    </div>
                  )}

                  {/* Floating Game Logo Overlay (Top-Left of Preview) */}
                  {activeGame.logo_path && (
                    <div className="osu-video-logo-overlay">
                      <img
                        src={getCoverUrl(activeGame.logo_path)}
                        alt={activeGame.display_name || metadata?.display_name || activeGame.name}
                        className="osu-video-logo-img"
                      />
                    </div>
                  )}

                  <div className="osu-crt-scanlines" aria-hidden="true" />

                  <div className={`osu-media-badge-tag ${videoSrc ? "is-video" : "is-cover"}`}>
                    <span className="osu-rec-dot" /> {videoSrc ? t("arcade.previewBadgeVideo", "VIDEO SNAP") : t("arcade.previewBadgeCover", "PORTADA")}
                  </div>
                </div>
              </div>
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
                  : `${filteredGames.length} juegos en biblioteca`}
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
                  title="Limpiar búsqueda"
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
                <p>No se encontraron juegos para "{searchQuery}"</p>
              </div>
            ) : (
              groupedConsoles.map(([platform, platformGames]) => {
                const isExpanded = isConsoleOpen(platform);
                const brandColor = PLATFORM_COLORS[platform] || "#00f0ff";
                const platName = getPlatformDisplayName(platform);
                const logoUrl = getPlatformLogo(platform);

                return (
                  <div key={platform} className="osu-console-group">
                    {/* Console Header Card (Option A: Logo Hero) */}
                    <div
                      className={`osu-group-header ${isExpanded ? "expanded" : "collapsed"}`}
                      style={{
                        "--console-color": brandColor,
                        "--console-color-glow": `${brandColor}55`,
                      } as React.CSSProperties}
                      onClick={() => toggleConsole(platform)}
                      title={`${platName} (${isExpanded ? "contraer" : "expandir"})`}
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
                            {platformGames.length === 1 ? "juego" : "juegos"}
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
                              onClick={() => {
                                if (isSelected) {
                                  handlePlayGame(game);
                                } else {
                                  setSelectedGameId(game.id);
                                  if (game.platform && game.platform !== openConsole && !searchQuery.trim()) {
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

      {/* ========================================================
          EDIT OPTIONS MODAL (4 Selections requested by user)
         ======================================================== */}
      {isEditMenuOpen && activeGame && (
        <div
          className="osu-edit-modal-backdrop"
          onClick={() => setIsEditMenuOpen(false)}
        >
          <div
            className="osu-edit-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="osu-edit-modal-header">
              <div className="osu-edit-modal-title-wrap">
                <div
                  className="osu-edit-modal-badge"
                  style={{
                    backgroundColor: `${activeBrandColor}22`,
                    borderColor: `${activeBrandColor}66`,
                    color: activeBrandColor,
                  }}
                >
                  <ConsoleIcon platform={activeGame.platform} size={15} />
                  <span>{getPlatformDisplayName(activeGame.platform)}</span>
                </div>
                <h3 className="osu-edit-modal-title">
                  {activeGame.display_name || metadata?.display_name || activeGame.name}
                </h3>
              </div>
              <button
                type="button"
                className="osu-edit-modal-close"
                onClick={() => setIsEditMenuOpen(false)}
                title="Cerrar (Esc)"
              >
                ✕
              </button>
            </div>

            <div className="osu-edit-modal-list">
              {/* Option 1: Editar datos */}
              <button
                type="button"
                className="osu-edit-item-card"
                onClick={() => {
                  setIsEditMenuOpen(false);
                  setShowFixMatchModal(true);
                }}
              >
                <div className="osu-edit-item-num">1</div>
                <div className="osu-edit-item-icon icon-data">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <path d="M9 9h6v6H9z" />
                    <path d="m21 15-3-3 3-3" />
                  </svg>
                </div>
                <div className="osu-edit-item-content">
                  <div className="osu-edit-item-title-row">
                    <span className="osu-edit-item-title">Editar datos</span>
                  </div>
                  <span className="osu-edit-item-desc">
                    Identificar juego, cambiar título, año y carátulas en bases de datos
                  </span>
                </div>
                <div className="osu-edit-item-arrow">›</div>
              </button>

              {/* Option 2: Galeria de Hero */}
              <button
                type="button"
                className="osu-edit-item-card"
                onClick={() => {
                  setIsEditMenuOpen(false);
                  setShowHeroPickerModal(true);
                }}
              >
                <div className="osu-edit-item-num">2</div>
                <div className="osu-edit-item-icon icon-hero">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                  </svg>
                </div>
                <div className="osu-edit-item-content">
                  <div className="osu-edit-item-title-row">
                    <span className="osu-edit-item-title">Galería de Hero</span>
                    {activeGame.hero_path && (
                      <span className="osu-edit-tag-ok">✓ Banner activo</span>
                    )}
                  </div>
                  <span className="osu-edit-item-desc">
                    Buscar y seleccionar fondos hero panorámicos HD en SteamGridDB
                  </span>
                </div>
                <div className="osu-edit-item-arrow">›</div>
              </button>

              {/* Option 3: Buscar Logo */}
              <button
                type="button"
                className="osu-edit-item-card"
                onClick={() => {
                  setIsEditMenuOpen(false);
                  setShowLogoPickerModal(true);
                }}
              >
                <div className="osu-edit-item-num">3</div>
                <div className="osu-edit-item-icon icon-logo">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7V4h16v3" />
                    <path d="M9 20h6" />
                    <path d="M12 4v16" />
                  </svg>
                </div>
                <div className="osu-edit-item-content">
                  <div className="osu-edit-item-title-row">
                    <span className="osu-edit-item-title">Buscar Logo</span>
                    {activeGame.logo_path && (
                      <span className="osu-edit-tag-ok">✓ Logo activo</span>
                    )}
                  </div>
                  <span className="osu-edit-item-desc">
                    Buscar y seleccionar logos transparentes en SteamGridDB
                  </span>
                </div>
                <div className="osu-edit-item-arrow">›</div>
              </button>

              {/* Option 4: Descargar Gameplay */}
              <button
                type="button"
                className={`osu-edit-item-card ${scrapingVideo ? "loading" : ""}`}
                onClick={() => {
                  setIsEditMenuOpen(false);
                  handleDownloadVideo();
                }}
                disabled={scrapingVideo}
              >
                <div className="osu-edit-item-num">4</div>
                <div className="osu-edit-item-icon icon-video">
                  {scrapingVideo ? (
                    <span className="osu-btn-spinner" />
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect width="14" height="14" x="1" y="5" rx="2" ry="2" />
                    </svg>
                  )}
                </div>
                <div className="osu-edit-item-content">
                  <div className="osu-edit-item-title-row">
                    <span className="osu-edit-item-title">Descargar Gameplay</span>
                    {videoSrc && !scrapingVideo && (
                      <span className="osu-edit-tag-video">✓ Video listo</span>
                    )}
                    {scrapingVideo && (
                      <span className="osu-edit-tag-downloading">{downloadProgress}%</span>
                    )}
                  </div>
                  <span className="osu-edit-item-desc">
                    {videoSrc
                      ? "Volver a descargar video de gameplay desde ScreenScraper.fr"
                      : "Descargar clip de video de gameplay desde ScreenScraper.fr"}
                  </span>
                </div>
                <div className="osu-edit-item-arrow">›</div>
              </button>
            </div>

            <div className="osu-edit-modal-footer">
              <span className="osu-edit-hint">Atajos: [ 1 - 4 ] Seleccionar opción • [ Esc ] Cerrar</span>
            </div>
          </div>
        </div>
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
    </div>
  );
}
