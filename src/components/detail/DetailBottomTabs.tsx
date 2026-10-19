import type { GameAchievementProgress } from "../../types";
import type { SaveSlot } from "../../lib/tauri";
import AchievementList from "../AchievementList";
import SlotList from "../SlotList";

interface DetailBottomTabsProps {
  bottomTab: "saves" | "achievements";
  setBottomTab: (tab: "saves" | "achievements") => void;
  hasRACredentials: boolean;
  saveSlots: SaveSlot[];
  onLoadSlot: (file: string) => void;
  onDeleteSlot: (file: string) => void;
  achievements: GameAchievementProgress | null;
  achievementsLoading: boolean;
  onRefreshAchievements: () => void;
}

export default function DetailBottomTabs({
  bottomTab,
  setBottomTab,
  hasRACredentials,
  saveSlots,
  onLoadSlot,
  onDeleteSlot,
  achievements,
  achievementsLoading,
  onRefreshAchievements,
}: DetailBottomTabsProps) {
  return (
    <div className="modal-row-achievements" style={{ display: "flex", flexDirection: "column" }}>
      <div className="modal-row-tabs" style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        {hasRACredentials && (
          <button
            type="button"
            className={`modal-row-tab-btn ${bottomTab === "achievements" ? "active" : ""}`}
            style={{
              background: bottomTab === "achievements" ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.05)",
              border: bottomTab === "achievements" ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.1)",
              color: bottomTab === "achievements" ? "#ffffff" : "#94a3b8",
              padding: "4px 12px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            onClick={() => setBottomTab("achievements")}
          >
            🏆 RetroAchievements
          </button>
        )}
        <button
          type="button"
          className={`modal-row-tab-btn ${bottomTab === "saves" ? "active" : ""}`}
          style={{
            background: bottomTab === "saves" ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.05)",
            border: bottomTab === "saves" ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.1)",
            color: bottomTab === "saves" ? "#ffffff" : "#94a3b8",
            padding: "4px 12px",
            borderRadius: "8px",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={() => setBottomTab("saves")}
        >
          💾 Partidas Guardadas ({saveSlots.length})
        </button>
      </div>

      {bottomTab === "saves" ? (
        <div style={{ overflowY: "auto", flex: 1, paddingRight: "4px" }}>
          <SlotList
            slots={saveSlots}
            onLoad={onLoadSlot}
            onDelete={onDeleteSlot}
          />
        </div>
      ) : hasRACredentials ? (
        achievementsLoading ? (
          <div className="achievements-loading-box">
            <span className="meta-loading">Cargando logros de RetroAchievements...</span>
          </div>
        ) : achievements && achievements.total > 0 ? (
          <AchievementList
            progress={achievements}
            onRefresh={onRefreshAchievements}
            refreshing={achievementsLoading}
          />
        ) : (
          <div className="no-achievements-notice">
            <div className="no-achievements-icon-wrap">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                <path d="M4 22h16"/>
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
              </svg>
            </div>
            <div className="no-achievements-info">
              <span className="no-achievements-title">RetroAchievements</span>
              <span className="no-achievements-desc">
                Este juego no cuenta actualmente con un set de logros publicado en RetroAchievements.
              </span>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}
