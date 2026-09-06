import type { GameAchievementProgress } from "../types";
import "./AchievementList.css";

interface Props {
  progress: GameAchievementProgress;
  onRefresh: () => void;
  refreshing: boolean;
}

export default function AchievementList({ progress, onRefresh, refreshing }: Props) {
  const sortedAchievements = [...progress.achievements].sort((a, b) => {
    if (a.date_earned && !b.date_earned) return -1;
    if (!a.date_earned && b.date_earned) return 1;
    if (a.date_earned && b.date_earned) {
      return new Date(b.date_earned).getTime() - new Date(a.date_earned).getTime();
    }
    return a.points - b.points;
  });

  const totalPoints = progress.achievements.reduce((acc, ach) => acc + (ach.points || 0), 0);
  const earnedPoints = progress.achievements.reduce(
    (acc, ach) => (ach.date_earned ? acc + (ach.points || 0) : acc),
    0
  );

  const pct = Math.min(100, Math.max(0, Math.round(progress.completion_pct || 0)));
  // SVG circle math: r=34 => circumference = 2 * PI * 34 ~= 213.63
  const circumference = 213.63;
  const strokeDashoffset = circumference * (1 - pct / 100);

  return (
    <div className="achievement-horizontal-layout">
      {/* Panel Izquierdo: Resumen Glass con Porcentaje Circular Fijo */}
      <div className="achievement-summary-card">
        <div className="achievement-summary-header">
          <svg
            className="achievement-header-svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
          <span>RetroAchievements</span>
        </div>

        <div className="achievement-ring-box">
          <svg className="achievement-ring-svg" viewBox="0 0 88 88">
            <circle
              cx="44"
              cy="44"
              r="34"
              className="ring-bg"
            />
            <circle
              cx="44"
              cy="44"
              r="34"
              className="ring-fill"
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
              }}
            />
          </svg>
          <div className="achievement-ring-center">
            <span className="achievement-ring-pct">{pct}%</span>
          </div>
        </div>

        <div className="achievement-summary-stats">
          <div className="summary-stat-count">
            <span className="stat-count-unlocked">{progress.unlocked}</span>
            <span className="stat-count-total"> / {progress.total} logros</span>
          </div>
          {totalPoints > 0 && (
            <div className="summary-stat-points">
              <span className="stat-points-earned">{earnedPoints}</span>
              <span className="stat-points-total"> / {totalPoints} pts</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`achievement-refresh-btn ${refreshing ? "spinning" : ""}`}
          onClick={onRefresh}
          disabled={refreshing}
          title="Actualizar logros desde RetroAchievements"
        >
          <svg
            className="achievement-refresh-icon"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
          <span>{refreshing ? "Sincronizando…" : "Actualizar"}</span>
        </button>
      </div>

      {/* Panel Derecho: Lista Scrolleable de Logros */}
      <div className="achievement-list-section">
        <div className="achievement-list-header">
          <span className="achievement-list-title">Logros del Juego</span>
          <span className="achievement-list-badge">
            {progress.unlocked} de {progress.total} completados
          </span>
        </div>

        <div className="achievement-items-col">
          {sortedAchievements.map((ach) => {
            const unlocked = !!ach.date_earned;
            const badgeUrl = unlocked
              ? `https://media.retroachievements.org/Badge/${ach.badge_name}.png`
              : `https://media.retroachievements.org/Badge/${ach.badge_name}_lock.png`;

            return (
              <div key={ach.id} className={`achievement-card ${unlocked ? "unlocked" : "locked"}`}>
                <div className="achievement-badge-wrap">
                  <div className="achievement-badge-fallback" aria-hidden="true">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  </div>
                  <img
                    src={badgeUrl}
                    alt=""
                    className="achievement-badge"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  {unlocked && <div className="achievement-badge-glow" />}
                </div>

                <div className="achievement-details">
                  <div className="achievement-title-row">
                    <span className="achievement-title" title={ach.title}>
                      {ach.title}
                    </span>
                    <span className="achievement-points">{ach.points} pts</span>
                  </div>
                  <span className="achievement-desc">{ach.description}</span>
                  {unlocked && (
                    <span className="achievement-date">
                      Desbloqueado: {new Date(ach.date_earned!).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className={`achievement-status-pill ${unlocked ? "unlocked" : "locked"}`}>
                  {unlocked ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="achievement-status-svg"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  ) : (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="achievement-status-svg"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
