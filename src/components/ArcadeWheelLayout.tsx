import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Game } from "../types";
import { launchGame, getCoverUrl, findGameVideo, toggleFavorite } from "../lib/tauri";
import { playWheelTick } from "../lib/bootSound";
import { normalizeGenre, getLocalizedGenreName } from "../lib/genreLocalization";
import { PLATFORM_COLORS, getPlatformCompany, getPlatformDisplayName } from "../lib/platforms";
import { ConsoleIcon } from "./ConsoleIcon";
import "./ArcadeWheelLayout.css";

interface Props {
  games: Game[];
  initialCategoryType?: "platforms" | "genres";
  onSelectGame: (game: Game) => void;
  onFavoriteChanged?: (gameId: string, isFav: boolean) => void;
}

const GENRE_ICONS: Record<string, string> = {
  Action: "⚔️",
  Adventure: "🗺️",
  Platformer: "🍄",
  Platform: "🍄",
  "Role-Playing": "📜",
  RPG: "📜",
  Fighting: "🥊",
  Racing: "🏎️",
  Sports: "⚽",
  Puzzle: "🧩",
  Shooter: "🚀",
  Strategy: "♟️",
  Simulation: "✈️",
  Arcade: "🕹️",
  Horror: "👻",
  "Beat 'em up": "💥",
  Music: "🎵",
  Party: "🎉",
  Sandbox: "🌍",
};

export default function ArcadeWheelLayout({
  games,
  initialCategoryType = "platforms",
  onSelectGame,
  onFavoriteChanged,
}: Props) {
  const { t } = useTranslation();
  const [categoryType, setCategoryType] = useState<"platforms" | "genres">(initialCategoryType);
  const [selectedCatIndex, setSelectedCatIndex] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);
  const lastNavTimeRef = useRef<number>(0);

  // Sync if parent changes initialCategoryType (e.g. from Home to Genres)
  useEffect(() => {
    if (initialCategoryType) {
      setCategoryType(initialCategoryType);
      setSelectedCatIndex(0);
      setSelectedIndex(0);
    }
  }, [initialCategoryType]);

  // Extract unique platforms
  const platforms = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      if (g.platform) set.add(g.platform);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [games]);

  // Extract unique canonical genres
  const genres = useMemo(() => {
    const map = new Map<string, number>();
    games.forEach((g) => {
      if (g.genre) {
        const canonical = normalizeGenre(g.genre);
        map.set(canonical, (map.get(canonical) || 0) + 1);
      }
    });
    const sorted = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name]) => name);
    return ["ALL", ...sorted];
  }, [games]);

  const currentCategories = categoryType === "platforms" ? platforms : genres;
  const selectedCategory = currentCategories[selectedCatIndex] || "ALL";

  // Filter games based on selected category
  const filteredGames = useMemo(() => {
    if (selectedCategory === "ALL") return games;
    if (categoryType === "platforms") {
      return games.filter((g) => g.platform === selectedCategory);
    }
    return games.filter((g) => g.genre && normalizeGenre(g.genre) === selectedCategory);
  }, [games, categoryType, selectedCategory]);

  // Safe active game
  const activeGame: Game | null = useMemo(() => {
    if (filteredGames.length === 0) return null;
    const clamped = Math.max(0, Math.min(selectedIndex, filteredGames.length - 1));
    return filteredGames[clamped] || null;
  }, [filteredGames, selectedIndex]);

  // Reset selected game index when category changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [selectedCatIndex, categoryType]);

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

  const changeIndex = useCallback(
    (delta: number) => {
      if (filteredGames.length <= 1) return;
      setSelectedIndex((prev) => {
        let next = prev + delta;
        if (next < 0) next = filteredGames.length - 1;
        if (next >= filteredGames.length) next = 0;
        playWheelTick(0.28);
        return next;
      });
    },
    [filteredGames.length]
  );

  const changeCategory = useCallback(
    (delta: number) => {
      if (currentCategories.length <= 1) return;
      setSelectedCatIndex((prev) => {
        let next = prev + delta;
        if (next < 0) next = currentCategories.length - 1;
        if (next >= currentCategories.length) next = 0;
        playWheelTick(0.35);
        return next;
      });
    },
    [currentCategories.length]
  );

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastNavTimeRef.current < 75) {
        if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          return;
        }
      }

      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault();
        lastNavTimeRef.current = now;
        changeIndex(-1);
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        lastNavTimeRef.current = now;
        changeIndex(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        lastNavTimeRef.current = now;
        changeCategory(-1);
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        lastNavTimeRef.current = now;
        changeCategory(1);
      } else if (e.key === "Tab") {
        e.preventDefault();
        setCategoryType((prev) => (prev === "platforms" ? "genres" : "platforms"));
        setSelectedCatIndex(0);
        playWheelTick(0.35);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handlePlayGame();
      } else if (e.key === " " || e.key.toLowerCase() === "i") {
        e.preventDefault();
        if (activeGame) onSelectGame(activeGame);
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        handleToggleFav();
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        setIsVideoMuted((v) => !v);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeIndex, changeCategory, handlePlayGame, handleToggleFav, onSelectGame, activeGame]);

  // Visible items for LEFT (Categories / Consoles) 3D wheel
  const visibleCategories = useMemo(() => {
    if (currentCategories.length === 0) return [];
    const radius = 5;
    const items: { category: string; index: number; diff: number }[] = [];

    for (let offset = -radius; offset <= radius; offset++) {
      let idx = selectedCatIndex + offset;
      if (currentCategories.length >= radius * 2 + 1) {
        idx = ((idx % currentCategories.length) + currentCategories.length) % currentCategories.length;
      }
      if (idx >= 0 && idx < currentCategories.length) {
        items.push({
          category: currentCategories[idx],
          index: idx,
          diff: offset,
        });
      }
    }
    return items;
  }, [currentCategories, selectedCatIndex]);

  // Visible items for RIGHT (Games) 3D wheel
  const visibleGames = useMemo(() => {
    if (filteredGames.length === 0) return [];
    const radius = 5;
    const items: { game: Game; index: number; diff: number }[] = [];

    for (let offset = -radius; offset <= radius; offset++) {
      let idx = selectedIndex + offset;
      if (filteredGames.length >= radius * 2 + 1) {
        idx = ((idx % filteredGames.length) + filteredGames.length) % filteredGames.length;
      }
      if (idx >= 0 && idx < filteredGames.length) {
        items.push({
          game: filteredGames[idx],
          index: idx,
          diff: offset,
        });
      }
    }
    return items;
  }, [filteredGames, selectedIndex]);

  // Format playtime
  const formattedPlaytime = useMemo(() => {
    if (!activeGame?.play_time_secs) return null;
    const hours = Math.floor(activeGame.play_time_secs / 3600);
    const mins = Math.floor((activeGame.play_time_secs % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, [activeGame?.play_time_secs]);

  const globalBg = useMemo(() => {
    if (!activeGame) return "";
    return getCoverUrl(activeGame.hero_path || activeGame.cover_path);
  }, [activeGame]);

  return (
    <div className="arcade-wheel-layout">
      {/* Immersive Background Fanart with ambient glow */}
      {globalBg && (
        <div
          className="arcade-global-bg"
          style={{ backgroundImage: `url(${globalBg})` }}
          aria-hidden="true"
        />
      )}
      <div className="arcade-bg-vignette" aria-hidden="true" />

      {/* Main 3-Column Arcade Stage Container */}
      <div className="arcade-stage-container">
        {/* ========================================================
            COLUMN 1 (LEFT): Ruleta 3D de Consolas / Géneros
           ======================================================== */}
        <section
          className="arcade-wheel-section arcade-wheel-left"
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const now = Date.now();
            if (now - lastNavTimeRef.current < 85) return;
            lastNavTimeRef.current = now;
            if (e.deltaY > 0) changeCategory(1);
            else if (e.deltaY < 0) changeCategory(-1);
          }}
        >
          {/* Wheel Mode Pill Switcher */}
          <div className="arcade-wheel-top-pills">
            <button
              type="button"
              className={`arcade-pill-toggle ${categoryType === "platforms" ? "active" : ""}`}
              onClick={() => {
                setCategoryType("platforms");
                setSelectedCatIndex(0);
                playWheelTick(0.3);
              }}
            >
              <span>🎮 CONSOLAS</span>
            </button>
            <button
              type="button"
              className={`arcade-pill-toggle ${categoryType === "genres" ? "active" : ""}`}
              onClick={() => {
                setCategoryType("genres");
                setSelectedCatIndex(0);
                playWheelTick(0.3);
              }}
            >
              <span>🏷️ GÉNEROS</span>
            </button>
          </div>

          <div className="arcade-wheel-guide top" onClick={() => changeCategory(-1)}>
            <span className="arcade-arrow">▲</span>
          </div>

          <div className="arcade-wheel-viewport left-viewport">
            <div className="arcade-wheel-track">
              {visibleCategories.map(({ category: cat, index, diff }) => {
                const isSelected = diff === 0;
                const translateY = diff * 74;
                const translateZ = -Math.abs(diff) * 52;
                const rotateX = diff * 8.5;
                const rotateY = -16; // Curving into center from the left!
                const scale = isSelected ? 1.15 : Math.max(0.72, 1 - Math.abs(diff) * 0.08);
                const opacity = Math.max(0.2, 1 - Math.abs(diff) * 0.16);

                const count =
                  cat === "ALL"
                    ? games.length
                    : categoryType === "platforms"
                    ? games.filter((g) => g.platform === cat).length
                    : games.filter((g) => g.genre && normalizeGenre(g.genre) === cat).length;

                const label =
                  cat === "ALL"
                    ? categoryType === "platforms"
                      ? "TODAS LAS CONSOLAS"
                      : "TODOS LOS GÉNEROS"
                    : categoryType === "platforms"
                    ? getPlatformDisplayName(cat)
                    : getLocalizedGenreName(cat, t);

                const brandColor =
                  categoryType === "platforms"
                    ? PLATFORM_COLORS[cat] || "var(--accent, #00f0ff)"
                    : "#00f0ff";

                return (
                  <div
                    key={`${cat}-${diff}`}
                    className={`arcade-wheel-item arcade-cat-item ${isSelected ? "selected" : ""}`}
                    style={{
                      transform: `translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
                      opacity,
                      zIndex: 100 - Math.abs(diff),
                    }}
                    onClick={() => {
                      setSelectedCatIndex(index);
                      playWheelTick(0.25);
                    }}
                  >
                    {isSelected && <div className="arcade-wheel-reticle left-reticle" />}

                    <div
                      className="arcade-wheel-card arcade-cat-card"
                      style={{ borderLeftColor: brandColor }}
                    >
                      <div
                        className="arcade-cat-icon-badge"
                        style={{ background: `${brandColor}22`, borderColor: `${brandColor}66` }}
                      >
                        {cat === "ALL" ? (
                          <span className="arcade-all-star">✨</span>
                        ) : categoryType === "platforms" ? (
                          <ConsoleIcon platform={cat} size={22} />
                        ) : (
                          <span className="arcade-genre-symbol">{GENRE_ICONS[cat] || "🏷️"}</span>
                        )}
                      </div>

                      <div className="arcade-cat-card-info">
                        <span className="arcade-cat-card-name" title={label}>
                          {label}
                        </span>
                        <div className="arcade-cat-card-sub">
                          <span className="arcade-cat-count-pill">{count} JUEGOS</span>
                          {categoryType === "platforms" && cat !== "ALL" && (
                            <span className="arcade-cat-company">{getPlatformCompany(cat)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="arcade-wheel-guide bottom" onClick={() => changeCategory(1)}>
            <span className="arcade-arrow">▼</span>
          </div>
        </section>

        {/* ========================================================
            COLUMN 2 (CENTER): Arcade Showcase Monitor & Big HUD
           ======================================================== */}
        <main className="arcade-showcase-section">
          {activeGame ? (
            <div className="arcade-showcase-panel">
              {/* Arcade CRT Screen Bezel (Expanded Size) */}
              <div className="arcade-monitor-frame">
                <div className="arcade-monitor-bezel">
                  <div className="arcade-monitor-screen">
                    {/* CRT Scanline Overlay */}
                    <div className="arcade-crt-scanlines" aria-hidden="true" />
                    <div className="arcade-crt-reflection" aria-hidden="true" />

                    {/* Video Player or Ken Burns Fallback */}
                    {videoSrc ? (
                      <video
                        key={videoSrc}
                        src={getCoverUrl(videoSrc)}
                        className="arcade-snap-video"
                        autoPlay
                        loop
                        playsInline
                        muted={isVideoMuted}
                      />
                    ) : (
                      <div className="arcade-snap-kenburns">
                        {globalBg && (
                          <div
                            className="arcade-kenburns-img"
                            style={{ backgroundImage: `url(${globalBg})` }}
                          />
                        )}
                        <div className="arcade-kenburns-gradient" />
                        {activeGame.logo_path && (
                          <img
                            src={getCoverUrl(activeGame.logo_path)}
                            alt=""
                            className="arcade-kenburns-logo"
                          />
                        )}
                        <div className="arcade-snap-watermark">
                          <span className="arcade-pulse-dot" /> ARCADE PREVIEW
                        </div>
                      </div>
                    )}

                    {/* Top Monitor Status Badges */}
                    <div className="arcade-monitor-hud">
                      <span className="arcade-hud-badge rec">
                        <span className="arcade-rec-dot" /> {videoSrc ? "VIDEO SNAP" : "PREVIEW"}
                      </span>
                      {videoSrc && (
                        <button
                          type="button"
                          className="arcade-sound-toggle-btn"
                          onClick={() => setIsVideoMuted((v) => !v)}
                          title={isVideoMuted ? "Activar audio" : "Silenciar audio"}
                        >
                          {isVideoMuted ? "🔇 MUDO" : "🔊 AUDIO"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Metadata & Arcade HUD */}
              <div className="arcade-game-meta">
                <div className="arcade-meta-header">
                  <div className="arcade-platform-badge">
                    <ConsoleIcon platform={activeGame.platform} size={18} />
                    <span>{activeGame.platform}</span>
                  </div>
                  {activeGame.release_year && (
                    <span className="arcade-meta-pill year">{activeGame.release_year}</span>
                  )}
                  {activeGame.genre && (
                    <span className="arcade-meta-pill genre">
                      {getLocalizedGenreName(activeGame.genre, t)}
                    </span>
                  )}
                  {formattedPlaytime && (
                    <span className="arcade-meta-pill time">⏱ {formattedPlaytime}</span>
                  )}
                </div>

                <h1 className="arcade-game-title">
                  {activeGame.display_name || activeGame.name}
                </h1>

                {activeGame.developer && (
                  <p className="arcade-meta-dev">
                    Desarrollado por <strong>{activeGame.developer}</strong>
                    {activeGame.publisher && ` • ${activeGame.publisher}`}
                  </p>
                )}

                {/* Primary Action Button Bar */}
                <div className="arcade-action-bar">
                  <button
                    type="button"
                    className="arcade-btn-primary"
                    onClick={() => handlePlayGame()}
                  >
                    <span className="arcade-btn-icon">▶</span>
                    <span className="arcade-btn-text">PRESS START / JUGAR</span>
                    <span className="arcade-btn-shortcut">[ Enter / Botón A ]</span>
                  </button>

                  <button
                    type="button"
                    className="arcade-btn-secondary"
                    onClick={() => onSelectGame(activeGame)}
                    title="Ver detalles, logros y carátulas (Espacio / Botón X)"
                  >
                    <span>ℹ DETALLES</span>
                  </button>

                  <button
                    type="button"
                    className={`arcade-btn-icon-round ${activeGame.favorite ? "active" : ""}`}
                    onClick={() => handleToggleFav()}
                    title="Alternar favorito (Tecla F / Botón Y)"
                  >
                    {activeGame.favorite ? "★" : "☆"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="arcade-empty-stage">
              <span className="arcade-empty-icon">🕹️</span>
              <p>No hay juegos disponibles en esta selección.</p>
            </div>
          )}
        </main>

        {/* ========================================================
            COLUMN 3 (RIGHT): Ruleta 3D de Juegos
           ======================================================== */}
        <section
          className="arcade-wheel-section arcade-wheel-right"
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const now = Date.now();
            if (now - lastNavTimeRef.current < 85) return;
            lastNavTimeRef.current = now;
            if (e.deltaY > 0) changeIndex(1);
            else if (e.deltaY < 0) changeIndex(-1);
          }}
        >
          {/* Wheel Header Badge */}
          <div className="arcade-wheel-top-pills right-header">
            <span className="arcade-games-count-badge">
              🎮 JUEGOS ({filteredGames.length})
            </span>
          </div>

          <div className="arcade-wheel-guide top" onClick={() => changeIndex(-1)}>
            <span className="arcade-arrow">▲</span>
          </div>

          <div className="arcade-wheel-viewport right-viewport">
            <div className="arcade-wheel-track">
              {visibleGames.map(({ game, index, diff }) => {
                const isSelected = diff === 0;
                const translateY = diff * 74;
                const translateZ = -Math.abs(diff) * 52;
                const rotateX = diff * 8.5;
                const rotateY = 16; // Curving into center from the right!
                const scale = isSelected ? 1.15 : Math.max(0.72, 1 - Math.abs(diff) * 0.08);
                const opacity = Math.max(0.2, 1 - Math.abs(diff) * 0.16);

                const logoUrl = getCoverUrl(game.logo_path);
                const coverUrl = getCoverUrl(game.cover_path);

                return (
                  <div
                    key={`${game.id}-${diff}`}
                    className={`arcade-wheel-item arcade-game-item ${isSelected ? "selected" : ""}`}
                    style={{
                      transform: `translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`,
                      opacity,
                      zIndex: 100 - Math.abs(diff),
                    }}
                    onClick={() => {
                      if (isSelected) {
                        handlePlayGame(game);
                      } else {
                        setSelectedIndex(index);
                        playWheelTick(0.25);
                      }
                    }}
                  >
                    {isSelected && <div className="arcade-wheel-reticle right-reticle" />}

                    <div className="arcade-wheel-card">
                      {logoUrl ? (
                        <div className="arcade-wheel-logo-box">
                          <img
                            src={logoUrl}
                            alt={game.display_name || game.name}
                            className="arcade-wheel-logo-img"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="arcade-wheel-badge-box">
                          {coverUrl && (
                            <img
                              src={coverUrl}
                              alt=""
                              className="arcade-wheel-thumb-img"
                              loading="lazy"
                            />
                          )}
                          <div className="arcade-wheel-text-wrap">
                            <span className="arcade-wheel-title">
                              {game.display_name || game.name}
                            </span>
                            <span className="arcade-wheel-platform-tag">
                              {game.platform}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="arcade-wheel-guide bottom" onClick={() => changeIndex(1)}>
            <span className="arcade-arrow">▼</span>
          </div>
        </section>
      </div>

      {/* Arcade Footer Instructions */}
      <footer className="arcade-bottom-hints">
        <span>◄► Ruleta {categoryType === "platforms" ? "Consolas" : "Géneros"} (LB / RB)</span>
        <span>▲▼ Ruleta Juegos (Joystick / Flechas)</span>
        <span>[A] Jugar</span>
        <span>[X] Detalles</span>
        <span>[Y] Favorito</span>
        <span>[M] Audio Video</span>
        <span>[Tab] {categoryType === "platforms" ? "Ver Géneros" : "Ver Consolas"}</span>
      </footer>
    </div>
  );
}
