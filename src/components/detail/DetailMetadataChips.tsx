import { useTranslation } from "react-i18next";
import type { Game, GameMetadata } from "../../types";
import { getLocalizedGenreName } from "../../lib/genreLocalization";

interface DetailMetadataChipsProps {
  game: Game;
  metadata: GameMetadata | null;
  metaLoading: boolean;
}

export default function DetailMetadataChips({
  game,
  metadata,
  metaLoading,
}: DetailMetadataChipsProps) {
  const { t } = useTranslation();
  return (
    <div className="modal-row-metadata">
      {metaLoading ? (
        <div className="modal-meta-loading">{t("common.loadingInfo")}</div>
      ) : (
        <div className="modal-meta-chips">
          {metadata?.release_year && (
            <span className="modal-meta-chip">
              <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <span>{metadata.release_year}</span>
            </span>
          )}
          {(metadata?.genre || game.genre) && (
            <span className="modal-meta-chip">
              <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>{getLocalizedGenreName(metadata?.genre || game.genre, t)}</span>
            </span>
          )}
          {metadata?.developer && (
            <span className="modal-meta-chip">
              <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              <span>{metadata.developer}</span>
            </span>
          )}
          {metadata?.publisher && metadata.publisher !== metadata?.developer && (
            <span className="modal-meta-chip">
              <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
                <path d="M9 22v-4h6v4"/>
                <path d="M8 6h.01"/>
                <path d="M16 6h.01"/>
                <path d="M8 10h.01"/>
                <path d="M16 10h.01"/>
              </svg>
              <span>{metadata.publisher}</span>
            </span>
          )}
          {metadata?.region && (
            <span className="modal-meta-chip">
              <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" x2="22" y1="12" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>{metadata.region}</span>
            </span>
          )}
          {metadata?.rating && (
            <span className="modal-meta-chip">
              <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>{metadata.rating}</span>
            </span>
          )}
          {metadata?.franchise && (
            <span className="modal-meta-chip">
              <svg className="modal-chip-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" x2="10" y1="12" y2="12"/>
                <line x1="8" x2="8" y1="10" y2="14"/>
                <line x1="15" x2="15.01" y1="13" y2="13"/>
                <line x1="18" x2="18.01" y1="11" y2="11"/>
                <rect width="20" height="12" x="2" y="6" rx="6"/>
              </svg>
              <span>{metadata.franchise}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
