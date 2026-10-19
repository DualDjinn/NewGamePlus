import { useTranslation } from "react-i18next";
import type { Game, GameMetadata } from "../../types";

interface DetailHeroBannerProps {
  heroSrc: string;
  color: string;
  logoSrc: string;
  currentGame: Game;
  metadata: GameMetadata | null;
  isEditingTitle: boolean;
  editedTitle: string;
  setEditedTitle: (val: string) => void;
  titleSaving: boolean;
  onStartEditTitle: () => void;
  onSaveTitle: () => void;
  onCancelEditTitle: () => void;
  onRestoreTitle: () => void;
}

export default function DetailHeroBanner({
  heroSrc,
  color,
  logoSrc,
  currentGame,
  metadata,
  isEditingTitle,
  editedTitle,
  setEditedTitle,
  titleSaving,
  onStartEditTitle,
  onSaveTitle,
  onCancelEditTitle,
  onRestoreTitle,
}: DetailHeroBannerProps) {
  const { t } = useTranslation();
  const displayName = currentGame.display_name || metadata?.display_name || currentGame.name;

  return (
    <div className="modal-row-hero-title">
      {heroSrc ? (
        <img src={heroSrc} alt="" className="modal-hero-bg-img" />
      ) : (
        <div
          className="modal-hero-fallback-bg"
          style={{ background: `radial-gradient(ellipse at center, ${color}44 0%, rgba(18, 22, 28, 0.95) 75%)` }}
        />
      )}
      <div className="modal-hero-vignette" />

      <div className="modal-hero-content">
        {isEditingTitle ? (
          <div className="modal-title-edit-wrap">
            <input
              type="text"
              className="modal-title-edit-input"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") onSaveTitle();
                if (e.key === "Escape") onCancelEditTitle();
              }}
              autoFocus
              onFocus={(e) => e.target.select()}
              placeholder={t("gameDetail.editNamePh")}
            />
            <div className="modal-title-edit-actions">
              <button
                type="button"
                className="modal-title-btn-save"
                onClick={onSaveTitle}
                disabled={titleSaving || !editedTitle.trim()}
                title={t("gameDetail.saveNameTitle")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{t("common.save")}</span>
              </button>
              <button
                type="button"
                className="modal-title-btn-cancel"
                onClick={onCancelEditTitle}
                disabled={titleSaving}
                title={t("common.cancel")}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
              {currentGame.custom_title && (
                <button
                  type="button"
                  className="modal-title-btn-restore"
                  onClick={onRestoreTitle}
                  disabled={titleSaving}
                  title={t("gameDetail.restoreTitle")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6" />
                    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                  <span>Restaurar original</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="modal-title-wrap">
            {logoSrc ? (
              <div className="modal-title-logo-wrap" title={displayName}>
                <img
                  src={logoSrc}
                  alt={displayName}
                  className="modal-title-logo-img"
                />
              </div>
            ) : (
              <h2 className="modal-title">
                {displayName}
              </h2>
            )}
            <button
              type="button"
              className="modal-btn-edit-title"
              onClick={onStartEditTitle}
              title="Modificar nombre mostrado manualmente"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
