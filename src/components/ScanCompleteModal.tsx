import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "../hooks/useFocusTrap";
import "./ScanCompleteModal.css";

export interface ScanCompleteResult {
  totalGames: number;
  coresInstalled: string[];
  coresNeeded: string[];
}

interface ScanCompleteModalProps {
  isOpen: boolean;
  result: ScanCompleteResult | null;
  onGoToLibrary: () => void;
  onClose: () => void;
}

export default function ScanCompleteModal({
  isOpen,
  result,
  onGoToLibrary,
  onClose,
}: ScanCompleteModalProps) {
  const { t } = useTranslation();
  const trapRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !result) return null;

  const { totalGames, coresInstalled, coresNeeded } = result;

  return (
    <div
      className="scan-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="scan-modal-card" ref={trapRef}>
        <div className="scan-modal-icon-badge" aria-hidden="true">
          🎮
        </div>

        <h2 id="scan-modal-title" className="scan-modal-title">
          {t("scan.completedTitle", "¡Escaneo Completado!")}
        </h2>
        <p className="scan-modal-desc">
          {t(
            "scan.completedDesc",
            "La biblioteca ha sido actualizada en segundo plano sin interrumpir tu navegación."
          )}
        </p>

        <div className="scan-modal-stats">
          <div className="scan-modal-stat-row">
            <span className="scan-modal-stat-label">
              {t("scan.totalIndexed", "Juegos detectados / indexados")}
            </span>
            <span className="scan-modal-stat-value">{totalGames}</span>
          </div>

          {coresInstalled.length > 0 && (
            <div className="scan-modal-cores-notice">
              ✓ {t("scan.coresInstalled", { count: coresInstalled.length, defaultValue: `${coresInstalled.length} núcleo(s) de emulación listos` })}
            </div>
          )}

          {coresNeeded.length > 0 && (
            <div className="scan-modal-cores-notice warn">
              ⚠️ {t("scan.coresNeeded", { count: coresNeeded.length, defaultValue: `${coresNeeded.length} plataformas requieren configuración adicional de núcleos` })}
            </div>
          )}
        </div>

        <div className="scan-modal-actions">
          <button
            type="button"
            className="scan-modal-btn-secondary"
            onClick={onClose}
          >
            {t("common.stayHere", "Permanecer aquí")}
          </button>
          <button
            type="button"
            className="scan-modal-btn-primary"
            onClick={onGoToLibrary}
            autoFocus
          >
            {t("scan.exploreLibrary", "Explorar Biblioteca")}
          </button>
        </div>
      </div>
    </div>
  );
}
