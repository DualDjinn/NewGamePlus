import { useEffect, useRef } from "react";
import type { Game } from "../types";
import { launchGame, toggleFavorite, getCoverUrl } from "../lib/tauri";
import { PLATFORM_COLORS } from "../lib/platforms";
import { ConsoleIcon } from "./ConsoleIcon";
import "./GameCard.css";

interface Props {
  game: Game;
  onSelect?: (game: Game) => void;
  onFavoriteChanged?: (gameId: string, isFav: boolean) => void;
  focused?: boolean;
}

export default function GameCard({ game, onSelect, onFavoriteChanged, focused }: Props) {
  const color = PLATFORM_COLORS[game.platform] ?? "#333";
  const displayName = game.display_name || game.name;
  const cardRef = useRef<HTMLDivElement>(null);
  const coverSrc = getCoverUrl(game.cover_path);

  useEffect(() => {
    if (focused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [focused]);

  async function handleLaunch(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await launchGame(game.rom_path);
    } catch (e) {
      console.error("Launch failed:", e);
      const msg = e instanceof Error ? e.message : String(e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: `Error al lanzar el juego: ${msg}` }));
    }
  }

  async function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const isFav = await toggleFavorite(game.id);
      onFavoriteChanged?.(game.id, isFav);
    } catch (e) {
      console.error("Favorite failed:", e);
      window.dispatchEvent(new CustomEvent("app-error", { detail: "Error al actualizar favorito" }));
    }
  }

  return (
    <div
      ref={cardRef}
      className={`game-card${focused ? " game-card-focused" : ""}`}
      tabIndex={0}
      onClick={() => onSelect?.(game)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect?.(game);
      }}
    >
      <div className="game-card-body" style={{ backgroundColor: color }}>
        {coverSrc ? (
          <img src={coverSrc} alt={displayName} className="game-card-img" loading="lazy" />
        ) : (
          <div className="game-card-placeholder">
            <span>{displayName.charAt(0).toUpperCase()}</span>
          </div>
        )}

        <button
          type="button"
          className={`game-card-fav ${game.favorite ? "active" : ""}`}
          onClick={handleFavorite}
          title={game.favorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          {game.favorite ? "♥" : "♡"}
        </button>

        <div className="game-card-overlay">
          <button type="button" className="game-card-play" onClick={handleLaunch} aria-label="Jugar" />
        </div>

        <div className="game-card-footer">
          <span className="game-card-name" title={displayName}>{displayName}</span>
          <div className="game-card-meta">
            <span className="game-card-platform-badge" style={{ borderColor: color, color }}>
              <ConsoleIcon platform={game.platform} size={10} />
              <span>{game.platform}</span>
            </span>
            {game.genre && <span className="game-card-genre-text">{game.genre}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
