import { useTranslation } from "react-i18next";
import type { Game } from "../../types";
import { ConsoleIcon } from "../ConsoleIcon";

interface DetailToolsBarProps {
  game: Game;
  color: string;
  modalFocus: string;
  currentGame: Game;
  heroSrc: string;
  logoSrc: string;
  hasVideo: boolean;
  scrapingHero: boolean;
  scrapingLogo: boolean;
  scrapingVideo: boolean;
  downloadProgress: number;
  onOpenFixMatch: () => void;
  onOpenHeroPicker: () => void;
  onOpenLogoPicker: () => void;
  onAutoDownloadHero: () => void;
  onAutoDownloadLogo: () => void;
  onDownloadVideo: () => void;
}

export default function DetailToolsBar({
  game,
  color,
  modalFocus,
  currentGame,
  heroSrc,
  logoSrc,
  hasVideo,
  scrapingHero,
  scrapingLogo,
  scrapingVideo,
  downloadProgress,
  onOpenFixMatch,
  onOpenHeroPicker,
  onOpenLogoPicker,
  onAutoDownloadHero,
  onAutoDownloadLogo,
  onDownloadVideo,
}: DetailToolsBarProps) {
  const { t } = useTranslation();

  const hasHero = Boolean(currentGame.hero_path || heroSrc);
  const hasLogo = Boolean(currentGame.logo_path || logoSrc);

  return (
    <div className="modal-row-tags-tools">
      <div className="modal-platform-badge-wrap">
        <span className="modal-platform-pill" style={{ borderColor: color, color }}>
          <ConsoleIcon platform={game.platform} size={14} />
          <span>{game.platform}</span>
        </span>
      </div>

      <div className="modal-action-tools">
        {/* Fix Match / Editar */}
        <button
          type="button"
          className={`modal-tool-btn ${modalFocus === "fix-match" ? "focused" : ""}`}
          onClick={onOpenFixMatch}
          title={t("gameDetail.fixMatch")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M9 9h6v6H9z" />
            <path d="m21 15-3-3 3-3" />
          </svg>
          <span>{t("common.edit")}</span>
        </button>

        {/* Hero: Auto Download + Manual Picker */}
        <div className="modal-tool-group">
          <button
            type="button"
            className={`modal-tool-btn modal-asset-btn ${hasHero ? "has-asset" : ""} ${scrapingHero ? "downloading" : ""} ${modalFocus === "hero-auto" ? "focused" : ""}`}
            onClick={onAutoDownloadHero}
            disabled={scrapingHero}
                  title={hasHero ? t("gameDetail.heroAutoUpdateTitle") : t("gameDetail.heroAutoDownloadTitle")}
          >
            <span className="modal-btn-content">
              {scrapingHero ? (
                <>
                  <span className="modal-btn-spinner" />
                  <span>{t("gameDetail.searchingHero", "Buscando...")}</span>
                </>
              ) : hasHero ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{t("gameDetail.heroReady", "✓ Hero")}</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>
                    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>
                    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>
                    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>
                  </svg>
                  <span>{t("gameDetail.downloadHero", "Auto Hero")}</span>
                </>
              )}
            </span>
          </button>
          <button
            type="button"
            className={`modal-tool-btn modal-tool-picker-btn ${modalFocus === "hero-picker" ? "focused" : ""}`}
            onClick={onOpenHeroPicker}
                title={t("gameDetail.heroPickTitle")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        {/* Logo: Auto Download + Manual Picker */}
        <div className="modal-tool-group">
          <button
            type="button"
            className={`modal-tool-btn modal-asset-btn ${hasLogo ? "has-asset" : ""} ${scrapingLogo ? "downloading" : ""} ${modalFocus === "logo-auto" ? "focused" : ""}`}
            onClick={onAutoDownloadLogo}
            disabled={scrapingLogo}
                  title={hasLogo ? t("gameDetail.logoAutoUpdateTitle") : t("gameDetail.logoAutoDownloadTitle")}
          >
            <span className="modal-btn-content">
              {scrapingLogo ? (
                <>
                  <span className="modal-btn-spinner" />
                  <span>{t("gameDetail.searchingLogo", "Buscando...")}</span>
                </>
              ) : hasLogo ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{t("gameDetail.logoReady", "✓ Logo")}</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 7V4h16v3" />
                    <path d="M9 20h6" />
                    <path d="M12 4v16" />
                  </svg>
                  <span>{t("gameDetail.downloadLogo", "Auto Logo")}</span>
                </>
              )}
            </span>
          </button>
          <button
            type="button"
            className={`modal-tool-btn modal-tool-picker-btn ${modalFocus === "logo-picker" ? "focused" : ""}`}
            onClick={onOpenLogoPicker}
                title={t("gameDetail.logoPickTitle")}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        {/* Gameplay Video Auto Download */}
        <button
          type="button"
          className={`modal-tool-btn modal-video-btn ${hasVideo ? "has-video" : ""} ${scrapingVideo ? "downloading" : ""} ${modalFocus === "video-downloader" ? "focused" : ""}`}
          onClick={onDownloadVideo}
          disabled={scrapingVideo}
          title={hasVideo ? "Volver a descargar gameplay video de ScreenScraper.fr" : "Descargar gameplay video de ScreenScraper.fr"}
        >
          {scrapingVideo && (
            <div
              className="modal-btn-progress-fill"
              style={{ width: `${downloadProgress}%` }}
            />
          )}
          <span className="modal-btn-content">
            {scrapingVideo ? (
              <>
                <span className="modal-btn-spinner" />
                <span>{downloadProgress > 0 ? `${downloadProgress}%` : t("gameDetail.downloadingGameplay", "Descargando...")}</span>
              </>
            ) : hasVideo ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{t("gameDetail.gameplayReady", "✓ Gameplay")}</span>
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect width="14" height="14" x="5" y="5" rx="2" ry="2" />
                </svg>
                <span>{t("gameDetail.downloadGameplay", "Gameplay")}</span>
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
