import React from "react";
import type { SaveSlot } from "../lib/tauri";
import "./GameDetailModal.css";

interface SlotListProps {
  slots: SaveSlot[];
  selectedSlot?: number;
  onSelectSlot?: (slotNum: number) => void;
  onLoad?: (file: string) => void;
  onDelete?: (file: string) => void;
  disabled?: boolean;
}

export const SlotList: React.FC<SlotListProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
  onLoad,
  onDelete,
  disabled = false,
}) => {
  const allSlots = [1, 2, 3, 4, 5];

  const formatDateTime = (timestampSecs: number) => {
    if (!timestampSecs) return "";
    const d = new Date(timestampSecs * 1000);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "";
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  };

  return (
    <div className="save-list" role="grid" aria-label="Ranuras de guardado">
      {allSlots.map((num) => {
        const fileName = `slot_${num}.state`;
        const slotData = slots.find((s) => s.file === fileName);
        const isSelected = selectedSlot === num;
        const hasSave = !!slotData;

        return (
          <div
            key={num}
            className={`save-cell ${isSelected ? "save-selected" : ""} ${
              !hasSave ? "save-cell-empty" : ""
            }`}
            onClick={() => onSelectSlot && onSelectSlot(num)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectSlot && onSelectSlot(num);
              }
            }}
          >
            <div className="save-cell-header">
              <span className="save-slot-title">Ranura {num}</span>
              {hasSave && (
                <span className="save-size">{formatSize(slotData.size)}</span>
              )}
            </div>

            <div className="save-thumb-wrapper">
              {slotData?.thumbnail ? (
                <img
                  src={slotData.thumbnail}
                  alt={`Captura Ranura ${num}`}
                  className="save-thumb"
                  loading="lazy"
                />
              ) : (
                <div className="save-thumb-placeholder">
                  <span className="save-empty-icon">💾</span>
                  <span className="save-empty-text">
                    {hasSave ? "Sin miniatura" : "Ranura libre"}
                  </span>
                </div>
              )}
            </div>

            <div className="save-cell-info">
              {hasSave ? (
                <span className="save-date">
                  {formatDateTime(slotData.modified)}
                </span>
              ) : (
                <span className="save-empty-label">Vacía</span>
              )}
            </div>

            {hasSave && (
              <div className="save-cell-actions">
                {onLoad && (
                  <button
                    type="button"
                    className="save-btn-load"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      onLoad(fileName);
                    }}
                    title={`Cargar Ranura ${num}`}
                  >
                    📂 Cargar
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="save-btn-delete"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(fileName);
                    }}
                    title={`Eliminar Ranura ${num}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SlotList;
