import { useTranslation } from "react-i18next";
import type { GameAchievementProgress } from "../../types";
import AchievementList from "../AchievementList";

interface WheelAchievementsCardProps {
  hasRACredentials: boolean;
  achievementsLoading: boolean;
  achievements: GameAchievementProgress | null;
  onRefresh: () => void;
}

export function WheelAchievementsCard({
  hasRACredentials,
  achievementsLoading,
  achievements,
  onRefresh,
}: WheelAchievementsCardProps) {
  const { t } = useTranslation();

  return (
    <div className="osu-row-achievements">
      {hasRACredentials ? (
        achievementsLoading ? (
          <div className="osu-achievements-loading">
            <span className="osu-btn-spinner" />
            <span>{t("achievements.loading")}</span>
          </div>
        ) : achievements && achievements.total > 0 ? (
          <AchievementList
            progress={achievements}
            onRefresh={onRefresh}
            refreshing={achievementsLoading}
          />
        ) : (
          <div className="osu-no-achievements-notice">
            <div className="osu-no-achievements-icon-wrap">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>
            <div className="osu-no-achievements-info">
              <span className="osu-no-achievements-title">RetroAchievements</span>
              <span className="osu-no-achievements-desc">
                {t("achievements.noSet")}
              </span>
            </div>
            <button
              type="button"
              className="osu-no-achievements-retry-btn"
              onClick={onRefresh}
              disabled={achievementsLoading}
              title={t("achievements.retryTitle")}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              <span>{t("common.retrySync")}</span>
            </button>
          </div>
        )
      ) : (
        <div className="osu-no-achievements-notice not-configured">
          <div className="osu-no-achievements-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>
          <div className="osu-no-achievements-info">
            <span className="osu-no-achievements-title">RetroAchievements</span>
              <span className="osu-no-achievements-desc">
                {t("achievements.loginHint")}
              </span>
          </div>
        </div>
      )}
    </div>
  );
}
