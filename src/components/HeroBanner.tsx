import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Game } from "../types";
import { launchGame, getCoverUrl } from "../lib/tauri";
import { getFranchiseGames } from "../lib/franchises";
import GameCard from "./GameCard";
import "./HeroBanner.css";
import { ConsoleIcon } from "./ConsoleIcon";

interface Props {
  games: Game[];
  allGames?: Game[];
  onSelect?: (game: Game) => void;
  onFavoriteChanged?: (gameId: string, isFav: boolean) => void;
  layoutStyle?: "classic" | "immersive";
}

export default function HeroBanner({
  games,
  allGames = [],
  onSelect,
  onFavoriteChanged,
  layoutStyle = "classic",
}: Props) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const featured = useMemo(() => games.slice(0, 7), [games]);

  const next = useCallback(() => {
    setCurrent((i) => (i + 1) % featured.length);
  }, [featured.length]);

  useEffect(() => {
    if (featured.length === 0) return;
    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [next, featured.length]);

  const currentGame = featured[current];

  // Franchise recommendations for the current active hero game (max 3)
  const franchiseData = useMemo(() => {
    if (!currentGame || allGames.length === 0) return null;
    return getFranchiseGames(currentGame, allGames, 3);
  }, [currentGame, allGames]);

  if (featured.length === 0) return null;

  async function handlePlay(targetRom: string) {
    try {
      await launchGame(targetRom);
    } catch (e) {
      console.error("Launch failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: `Error al lanzar el juego: ${msg}` }));
    }
  }

  const isImmersive = layoutStyle === "immersive";

  return (
    <div className={`hero-container ${isImmersive ? "hero-immersive" : ""}`}>
      <div className={`hero-card ${isImmersive ? "hero-card-immersive" : ""}`}>

        {featured.map((g, idx) => {
          const isActive = idx === current;
          const bgPath = g.hero_path || g.cover_path;
          const src = getCoverUrl(bgPath);

          return (
            <div
              key={g.id || idx}
              className={`hero-slide ${isActive ? "active" : ""}`}
              onClick={() => onSelect?.(g)}
              aria-hidden={!isActive}
            >
              <div className="hero-bg">
                {src && (
                  <img
                    src={src}
                    alt=""
                    className="hero-bg-img"
                  />
                )}
                <div className="hero-gradient" />
              </div>

              {!isImmersive && (
                <div className="hero-content">
                  <div className="hero-badges">
                    <span className="hero-platform-badge">
                      <ConsoleIcon platform={g.platform} size={14} />
                      <span>{g.platform}</span>
                    </span>
                    {g.genre && <span className="hero-genre-badge">{g.genre}</span>}
                    {g.release_year && <span className="hero-year-badge">{g.release_year}</span>}
                    {g.favorite && <span className="hero-fav-badge">♥ {t("hero.favorite")}</span>}
                  </div>
                  {g.logo_path ? (
                    <div className="hero-logo-wrap" title={g.display_name || g.name}>
                      <img
                        src={getCoverUrl(g.logo_path)}
                        alt={g.display_name || g.name}
                        className="hero-logo-img"
                      />
                    </div>
                  ) : (
                    <h1 className="hero-title">{g.display_name || g.name}</h1>
                  )}
                  <div className="hero-actions">
                    <button
                      type="button"
                      className="hero-btn hero-btn-play"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlay(g.rom_path);
                      }}
                    >
                      ▶ {t("hero.playNow")}
                    </button>
                    <button
                      type="button"
                      className="hero-btn hero-btn-info"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect?.(g);
                      }}
                    >
                      {t("hero.details")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* En modo Inmersivo: Contenedor interactivo estructurado de arriba a abajo */}
        {isImmersive && currentGame && (
          <div className="hero-immersive-body" onClick={(e) => e.stopPropagation()}>
            <div className="hero-immersive-upper">
              <div className="hero-content">
                <div className="hero-badges">
                  <span className="hero-platform-badge">
                    <ConsoleIcon platform={currentGame.platform} size={14} />
                    <span>{currentGame.platform}</span>
                  </span>
                  {currentGame.genre && <span className="hero-genre-badge">{currentGame.genre}</span>}
                  {currentGame.release_year && <span className="hero-year-badge">{currentGame.release_year}</span>}
                  {currentGame.favorite && <span className="hero-fav-badge">♥ {t("hero.favorite")}</span>}
                </div>
                {currentGame.logo_path ? (
                  <div className="hero-logo-wrap" title={currentGame.display_name || currentGame.name}>
                    <img
                      src={getCoverUrl(currentGame.logo_path)}
                      alt={currentGame.display_name || currentGame.name}
                      className="hero-logo-img"
                    />
                  </div>
                ) : (
                  <h1 className="hero-title">{currentGame.display_name || currentGame.name}</h1>
                )}
                <div className="hero-actions">
                  <button
                    type="button"
                    className="hero-btn hero-btn-play"
                    onClick={() => handlePlay(currentGame.rom_path)}
                  >
                    ▶ {t("hero.playNow")}
                  </button>
                  <button
                    type="button"
                    className="hero-btn hero-btn-info"
                    onClick={() => onSelect?.(currentGame)}
                  >
                    {t("hero.details")}
                  </button>
                </div>
              </div>
            </div>

            {/* Fila debajo del título y botones de acción (saga o mismo género si no tiene saga, max 3) */}
            {franchiseData && franchiseData.games.length > 0 && (
              <div className="hero-franchise-section">
                <div className="hero-franchise-header">
                  <span className="hero-franchise-label">{franchiseData.label}</span>
                  <h3 className="hero-franchise-title">{franchiseData.title}</h3>
                </div>
                <div className="hero-franchise-row">
                  {franchiseData.games.slice(0, 3).map((fg) => (
                    <GameCard
                      key={fg.id}
                      game={fg}
                      onSelect={onSelect}
                      onFavoriteChanged={onFavoriteChanged}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Indicadores en esquina inferior derecha del Hero en modo Inmersivo */}
        {isImmersive && (
          <div className="hero-indicators hero-indicators-right" onClick={(e) => e.stopPropagation()}>
            {featured.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`hero-pill ${i === current ? "active" : ""}`}
                onClick={() => setCurrent(i)}
                aria-label={`Juego ${i + 1}`}
              >
                {i === current && (
                  <span key={current} className="hero-pill-progress" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Indicadores en modo Clásico (centrados debajo de la tarjeta) */}
      {!isImmersive && (
        <div className="hero-indicators" onClick={(e) => e.stopPropagation()}>
          {featured.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`hero-pill ${i === current ? "active" : ""}`}
              onClick={() => setCurrent(i)}
              aria-label={`Juego ${i + 1}`}
            >
              {i === current && (
                <span key={current} className="hero-pill-progress" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
