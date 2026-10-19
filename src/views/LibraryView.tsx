import { useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import type { Game } from "../types";
import GameCard from "../components/GameCard";

interface LibrarySectionItem {
  platform: string;
  displayName: string;
  color: string;
  games: Game[];
}

interface LibraryViewProps {
  availableCompanies: string[];
  selectedCompany: string;
  setSelectedCompany: (company: string) => void;
  librarySections: LibrarySectionItem[];
  libraryGames: Game[];
  onSelectGame: (game: Game) => void;
  onFavoriteChanged: (gameId: string, isFav: boolean) => void;
  showNavFocus: boolean;
  flatFocusIdx: number;
}

function LibraryView({
  availableCompanies,
  selectedCompany,
  setSelectedCompany,
  librarySections,
  libraryGames,
  onSelectGame,
  onFavoriteChanged,
  showNavFocus,
  flatFocusIdx,
}: LibraryViewProps) {
  // Pre-calcular mapa O(1) de indices de juegos para eliminar busqueda O(N^2) en el bucle
  const { t } = useTranslation();
  const gameIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < libraryGames.length; i++) {
      map.set(libraryGames[i].id, i);
    }
    return map;
  }, [libraryGames]);

  return (
    <div className="library-container">
      {availableCompanies.length > 0 && (
        <div className="library-filter-pill-container">
          <div className="library-filter-pill">
            <button
              type="button"
              className={`library-filter-item ${selectedCompany === "all" ? "active" : ""}`}
              onClick={() => setSelectedCompany("all")}
            >
              {t("common.all")}
            </button>
            {availableCompanies.map((company) => (
              <button
                key={company}
                type="button"
                className={`library-filter-item ${
                  selectedCompany === company ? "active" : ""
                }`}
                onClick={() =>
                  setSelectedCompany(company === selectedCompany ? "all" : company)
                }
              >
                {company}
              </button>
            ))}
          </div>
        </div>
      )}

      {librarySections.length > 0 ? (
        <div className="library-sections-list">
          {librarySections.map((sec) => {
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
                    const globalIdx = gameIndexMap.get(game.id) ?? -1;
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
          {t("search.noGamesFound")}
        </p>
      )}
    </div>
  );
}

export default memo(LibraryView);
