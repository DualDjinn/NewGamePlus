import { useTranslation } from "react-i18next";
import type { Game, GameMetadata } from "../../types";

interface WheelMetadataCardProps {
  activeGame: Game;
  metadata: GameMetadata | null;
  globalBg: string | null;
  formattedPlaytime: string;
  onPlayGame: () => void;
  onToggleFavorite: () => void;
  onNetplay?: () => void;
}

export function WheelMetadataCard({
  activeGame,
  metadata,
  globalBg,
  formattedPlaytime,
  onPlayGame,
  onToggleFavorite,
  onNetplay,
}: WheelMetadataCardProps) {
  const { t } = useTranslation();

  return (
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
          onClick={onPlayGame}
          title={t("arcade.playShortcut", "[ Enter / Botón A ]")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span>{t("hero.playNow", "JUGAR AHORA").toUpperCase()}</span>
        </button>

        {onNetplay && (
          <button
            type="button"
            className="osu-btn-netplay"
            onClick={onNetplay}
            title={t("netplay.title", "Netplay Multijugador")}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>NETPLAY</span>
          </button>
        )}

        <button
          type="button"
          className={`osu-btn-favorite ${activeGame.favorite ? "active" : ""}`}
          onClick={onToggleFavorite}
          title={t("arcade.favoriteTooltip", "Alternar favorito (Tecla F / Botón Y)")}
        >
          {activeGame.favorite ? "★" : "☆"}
        </button>
      </div>
    </div>
  );
}
