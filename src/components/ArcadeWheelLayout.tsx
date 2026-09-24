import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Game } from "../types";
import { launchGame, getCoverUrl, findGameVideo, toggleFavorite } from "../lib/tauri";
import { playWheelTick } from "../lib/bootSound";
import { ConsoleIcon } from "./ConsoleIcon";
import "./ArcadeWheelLayout.css";

interface Props {
  games: Game[];
  onSelectGame: (game: Game) => void;
  onFavoriteChanged?: (gameId: string, isFav: boolean) => void;
}

export default function ArcadeWheelLayout({
  games,
  onSelectGame,
  onFavoriteChanged,
}: Props) {
  const { t } = useTranslation();
  const [selectedPlatform, setSelectedPlatform] = useState<string>("ALL");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(true);
  const wheelContainerRef = useRef<HTMLDivElement>(null);
  const lastNavTimeRef = useRef<number>(0);

  // Extract unique platforms
  const platforms = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      if (g.platform) set.add(g.platform);
    });
    return ["ALL", ...Array.from(set).sort()];
  }, [games]);

  // Filter games based on selected platform
  const filteredGames = useMemo(() => {
    if (selectedPlatform === "ALL") return games;
    return games.filter((g) => g.platform === selectedPlatform);
  }, [games, selectedPlatform]);

  // Safe selected game
  const activeGame: Game | null = useMemo(() => {
    if (filteredGames.length === 0) return null;
    const clamped = Math.max(0, Math.min(selectedIndex, filteredGames.length - 1));
    return filteredGames[clamped] || null;
  }, [filteredGames, selectedIndex]);

  // When platform changes, reset selected index
  useEffect(() => {
    setSelectedIndex(0);
  }, [selectedPlatform]);

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
      // Don't intercept if an input is focused
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastNavTimeRef.current < 75) {
        // Fast throttle
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
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
        // Cycle platform back
        const currIdx = platforms.indexOf(selectedPlatform);
        const prevIdx = (currIdx - 1 + platforms.length) % platforms.length;
        setSelectedPlatform(platforms[prevIdx]);
        playWheelTick(0.35);
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        // Cycle platform forward
        const currIdx = platforms.indexOf(selectedPlatform);
        const nextIdx = (currIdx + 1) % platforms.length;
        setSelectedPlatform(platforms[nextIdx]);
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
  }, [changeIndex, handlePlayGame, handleToggleFav, onSelectGame, activeGame, platforms, selectedPlatform]);

  // Mouse wheel navigation
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastNavTimeRef.current < 90) return;
      lastNavTimeRef.current = now;
      if (e.deltaY > 0) {
        changeIndex(1);
      } else if (e.deltaY < 0) {
        changeIndex(-1);
      }
    },
    [changeIndex]
  );

  // Render items within a visible window for high performance
  const visibleItems = useMemo(() => {
    if (filteredGames.length === 0) return [];
    const radius = 5;
    const items: { game: Game; index: number; diff: number }[] = [];

    for (let offset = -radius; offset <= radius; offset++) {
      let idx = selectedIndex + offset;
      if (filteredGames.length >= radius * 2 + 1) {
        // Wrap around seamlessly
        idx = (idx % filteredGames.length + filteredGames.length) % filteredGames.length;
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
    <div className="arcade-wheel-layout" onWheel={handleWheel}>
      {/* Immersive Background Fanart with ambient glow */}
      {globalBg && (
        <div
          className="arcade-global-bg"
          style={{ backgroundImage: `url(${globalBg})` }}
          aria-hidden="true"
        />
      )}
      <div className="arcade-bg-vignette" aria-hidden="true" />

      {/* Top Platform Filter Bar */}
      <div className="arcade-platform-bar">
        <div className="arcade-platform-scroll">
          {platforms.map((p) => {
            const isActive = p === selectedPlatform;
            const count =
              p === "ALL"
                ? games.length
                : games.filter((g) => g.platform === p).length;
            return (
              <button
                key={p}
                type="button"
                className={`arcade-platform-pill ${isActive ? "active" : ""}`}
                onClick={() => {
                  setSelectedPlatform(p);
                  playWheelTick(0.2);
                }}
              >
                {p !== "ALL" && (
                  <span className="arcade-platform-icon">
                    <ConsoleIcon platform={p} size={15} />
                  </span>
                )}
                <span className="arcade-platform-label">
                  {p === "ALL" ? t("catalog.all", "Todos") : p}
                </span>
                <span className="arcade-platform-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Arcade Stage Container */}
      <div className="arcade-stage-container">
        {/* Left: HyperSpin 3D Vertical Wheel */}
        <div className="arcade-wheel-section">
          <div className="arcade-wheel-guide top" onClick={() => changeIndex(-1)}>
            <span className="arcade-arrow">▲</span>
          </div>

          <div className="arcade-wheel-viewport" ref={wheelContainerRef}>
            <div className="arcade-wheel-track">
              {visibleItems.map(({ game, index, diff }) => {
                const isSelected = diff === 0;
                // Calculate 3D curved wheel transform
                const translateY = diff * 74;
                const translateZ = -Math.abs(diff) * 58;
                const rotateX = diff * 9.5;
                const rotateY = -18;
                const scale = isSelected ? 1.15 : Math.max(0.72, 1 - Math.abs(diff) * 0.08);
                const opacity = Math.max(0.18, 1 - Math.abs(diff) * 0.17);

                const logoUrl = getCoverUrl(game.logo_path);
                const coverUrl = getCoverUrl(game.cover_path);

                return (
                  <div
                    key={`${game.id}-${diff}`}
                    className={`arcade-wheel-item ${isSelected ? "selected" : ""}`}
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
                    {/* Selected Neon Reticle */}
                    {isSelected && <div className="arcade-wheel-reticle" />}

                    {/* Wheel Card Presentation */}
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
        </div>

        {/* Right: Arcade Showcase & Video Snap Monitor */}
        <div className="arcade-showcase-section">
          {activeGame ? (
            <div className="arcade-showcase-panel">
              {/* Arcade CRT / Modern Screen Bezel */}
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
                    <span className="arcade-meta-pill genre">{activeGame.genre}</span>
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
              <p>No hay juegos disponibles en esta categoría.</p>
            </div>
          )}
        </div>
      </div>

      {/* Arcade Footer Instructions */}
      <div className="arcade-bottom-hints">
        <span>▲▼ Girar Rueda (Joystick / Flechas)</span>
        <span>◄► Cambiar Plataforma (LB / RB)</span>
        <span>[A] Jugar</span>
        <span>[X] Detalles</span>
        <span>[Y] Favorito</span>
        <span>[M] Mute Video</span>
      </div>
    </div>
  );
}
