import { useMemo, memo } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import type { Game, Section } from "../types";
import { getCoverUrl } from "../lib/tauri";
import { getGenreTheme } from "../lib/genreThemes";
import { getLocalizedGenreName } from "../lib/genreLocalization";
import GameCard from "../components/GameCard";

interface GenreCardItem {
  name: string;
  count: number;
  imagePath?: string | null;
  topGameName?: string | null;
}

interface GenreSectionItem {
  platform: string;
  displayName: string;
  color: string;
  games: Game[];
}

interface GenresViewProps {
  section: Section;
  effectiveCompany: string;
  genreList: GenreCardItem[];
  selectedGenre: string | null;
  activeGenreGames: Game[];
  activeGenreSections: GenreSectionItem[];
  onSelectGenre: (genreName: string) => void;
  onBackToGenres: () => void;
  onSelectGame: (game: Game) => void;
  onFavoriteChanged: (gameId: string, isFav: boolean) => void;
  showNavFocus: boolean;
  flatFocusIdx: number;
}

function GenresView({
  section,
  effectiveCompany,
  genreList,
  selectedGenre,
  activeGenreGames,
  activeGenreSections,
  onSelectGenre,
  onBackToGenres,
  onSelectGame,
  onFavoriteChanged,
  showNavFocus,
  flatFocusIdx,
}: GenresViewProps) {
  const { t } = useTranslation();

  // Pre-calcular mapa O(1) para calculo de foco gamepad en lugar de busqueda lineal O(N^2)
  const activeGenreIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < activeGenreGames.length; i++) {
      map.set(activeGenreGames[i].id, i);
    }
    return map;
  }, [activeGenreGames]);

  if (section === "genre" && selectedGenre) {
    return (
      <div className="library-container">
        <div className="genre-view-header">
          <button
            type="button"
            className="genre-back-btn"
            onClick={onBackToGenres}
            aria-label={t("genres.backToGenres")}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>{t("genres.backToGenres")}</span>
          </button>

          <div className="genre-view-title-wrap">
            <h2 className="genre-view-title">
              {effectiveCompany !== "all"
                ? `${getLocalizedGenreName(selectedGenre, t)} • ${effectiveCompany}`
                : getLocalizedGenreName(selectedGenre, t)}
            </h2>
            <span className="genre-view-count">
              {t("library.totalGames", { count: activeGenreGames.length })}
            </span>
          </div>
        </div>

        {activeGenreSections.length > 0 ? (
          <div className="library-sections-list">
            {activeGenreSections.map((sec) => {
              return (
                <div key={sec.platform} className="library-platform-block">
                  <div className="library-platform-header">
                    <div className="library-platform-title-group">
                      <span
                        className="library-platform-indicator"
                        style={{ backgroundColor: sec.color }}
                      />
                      <h2 className="library-platform-title">{sec.displayName}</h2>
                      <span className="library-platform-count">
                        {t("common.gamesCount", { count: sec.games.length })}
                      </span>
                    </div>
                  </div>

                  <div className="library-grid">
                    {sec.games.map((game) => {
                      const globalIdx = activeGenreIndexMap.get(game.id) ?? -1;
                      return (
                        <GameCard
                          key={game.id}
                          game={game}
                          onSelect={onSelectGame}
                          onFavoriteChanged={onFavoriteChanged}
                          focused={showNavFocus && flatFocusIdx === globalIdx}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: "#555", textAlign: "center", padding: "48px" }}>
            {t("genres.noGamesInGenre")}{" "}
            {effectiveCompany !== "all" ? t("genres.forCompany", { company: effectiveCompany }) : ""}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="genres-container">
      <div className="genres-header">
        <div className="genres-header-info">
          <h1 className="genres-title">
            {t("genres.title")}
            {effectiveCompany !== "all" && (
              <span className="genres-company-badge">{effectiveCompany}</span>
            )}
          </h1>
          <p className="genres-subtitle">{t("genres.subtitle")}</p>
        </div>
      </div>

      {genreList.length > 0 ? (
        <div className="genre-cards-grid">
          {genreList.map((g) => {
            const itemTheme = getGenreTheme(g.name);
            const bgSrc = g.imagePath ? getCoverUrl(g.imagePath) : "";
            const localizedGenreName = getLocalizedGenreName(g.name, t);
            return (
              <button
                key={g.name}
                className="modern-genre-card"
                style={
                  {
                    "--genre-color": itemTheme.color,
                    "--genre-glow": itemTheme.glow,
                    "--genre-gradient": itemTheme.gradient,
                  } as React.CSSProperties
                }
                onClick={() => onSelectGenre(g.name)}
              >
                <div className="modern-genre-card-inner">
                  {bgSrc ? (
                    <img src={bgSrc} alt="" className="modern-genre-card-bg" loading="lazy" />
                  ) : (
                    <div className="modern-genre-fallback-bg" />
                  )}
                  <div className="modern-genre-card-overlay" />

                  <div className="modern-genre-card-top">
                    <span className="modern-genre-count-badge">
                      {t("library.totalGames", { count: g.count })}
                    </span>
                  </div>

                  <div className="modern-genre-card-bottom">
                    <span className="modern-genre-name">{localizedGenreName}</span>
                    {g.topGameName && (
                      <span className="modern-genre-featured-label" title={g.topGameName}>
                        {t("genres.featured", { name: g.topGameName })}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <p style={{ color: "#777", textAlign: "center", padding: "60px 0" }}>
          {t("genres.noGenresAvailable")}{" "}
          {effectiveCompany !== "all" ? t("genres.forCompany", { company: effectiveCompany }) : ""}
        </p>
      )}
    </div>
  );
}

export default memo(GenresView);
