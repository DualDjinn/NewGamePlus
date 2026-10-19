import { useTranslation } from "react-i18next";
import type { Game } from "../../types";

export function formatPlayTime(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "Sin jugar";
  if (seconds < 60) return "< 1 min";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
}

interface DetailLeftColumnProps {
  game: Game;
  coverSrc: string;
  color: string;
  modalFocus: string;
  onFavorite: () => void;
  onLaunch: () => void;
  onNetplay: () => void;
}

export default function DetailLeftColumn({
  game,
  coverSrc,
  color,
  modalFocus,
  onFavorite,
  onLaunch,
  onNetplay,
}: DetailLeftColumnProps) {
  const { t } = useTranslation();

  return (
    <div className="modal-left-column">
      {/* Fila 1 (70%): Cover del juego */}
      <div className="modal-left-row-cover">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={game.display_name || game.name}
            className="modal-poster-img"
          />
        ) : (
          <div className="modal-poster-placeholder">
            <span className="modal-poster-initial">
              {(game.display_name || game.name).charAt(0).toUpperCase()}
            </span>
            <span className="modal-poster-plat" style={{ color }}>
              {game.platform}
            </span>
          </div>
        )}
      </div>

      {/* Fila 2 (10%): Favorito y Tiempo jugado */}
      <div className="modal-left-row-subactions">
        <button
          type="button"
          className={`modal-btn modal-btn-fav ${game.favorite ? "active" : ""} ${modalFocus === "fav" ? "focused" : ""}`}
          onClick={onFavorite}
          title={game.favorite ? t("gameDetail.removeFavorite") : t("gameDetail.addFavorite")}
        >
          {game.favorite ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
          )}
          <span>{t("hero.favorite")}</span>
        </button>

        <div className="modal-playtime-chip" title={t("hero.timePlayed")}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="modal-playtime-val">{formatPlayTime(game.play_time_secs)}</span>
        </div>
      </div>

      {/* Fila 3 (20%): Botones JUGAR y NETPLAY */}
      <div className="modal-left-row-play">
        <button
          type="button"
          className={`modal-btn modal-btn-play ${modalFocus === "play" ? "focused" : ""}`}
          onClick={onLaunch}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>{t("hero.playNow").toUpperCase()}</span>
        </button>
        <button
          type="button"
          className={`modal-btn modal-btn-netplay ${modalFocus === "netplay" ? "focused" : ""}`}
          onClick={onNetplay}
          title={t("netplay.title")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span>{t("netplay.hostGame").toUpperCase()}</span>
        </button>
      </div>
    </div>
  );
}
