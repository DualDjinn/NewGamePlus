import { lazy, Suspense, memo, type Dispatch, type SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import type { Game, LayoutStyle } from "../types";
import HeroBanner from "../components/HeroBanner";
import CategoryRow from "../components/CategoryRow";

const ArcadeWheelLayout = lazy(() => import("../components/ArcadeWheelLayout"));

interface HomeRowItem {
  id: string;
  title: string;
  games: Game[];
}

interface HomeViewProps {
  games: Game[];
  setGames: Dispatch<SetStateAction<Game[]>>;
  featured: Game[];
  layoutStyle: LayoutStyle;
  handleLayoutStyleChange: (style: LayoutStyle) => void;
  searchQuery: string;
  searchResults: Game[];
  homeRows: HomeRowItem[];
  homeFocus: { row: number; col: number };
  showNavFocus: boolean;
  flatFocusIdx: number;
  onSelectGame: (game: Game) => void;
  onFavoriteChanged: (gameId: string, isFav: boolean) => void;
  onOpenSettings: () => void;
  onOpenOnboarding: () => void;
}

function HomeView({
  games,
  setGames,
  featured,
  layoutStyle,
  handleLayoutStyleChange,
  searchQuery,
  searchResults,
  homeRows,
  homeFocus,
  showNavFocus,
  flatFocusIdx,
  onSelectGame,
  onFavoriteChanged,
  onOpenSettings,
  onOpenOnboarding,
}: HomeViewProps) {
  const { t } = useTranslation();

  if (games.length === 0) {
    return (
      <div className="app-welcome" style={{ padding: "80px 20px", textAlign: "center" }}>
        <h1>NewGame+</h1>
        <p style={{ color: "#94a3b8", maxWidth: "480px", margin: "14px auto 24px", lineHeight: "1.5" }}>
          {t("library.emptyWelcome")}
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button className="app-welcome-btn" onClick={onOpenOnboarding}>
            {t("library.openAssistant")}
          </button>
          <button
            className="app-welcome-btn"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
            onClick={onOpenSettings}
          >
            {t("library.goToSettings")}
          </button>
        </div>
      </div>
    );
  }

  if (layoutStyle === "arcade") {
    return (
      <Suspense fallback={null}>
        <ArcadeWheelLayout
          games={games}
          initialCategoryType="platforms"
          onFavoriteChanged={onFavoriteChanged}
          onGameUpdated={(updated) => {
            setGames((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
          }}
          onHeroChanged={(gameId, newHeroPath) => {
            setGames((prev) =>
              prev.map((g) => (g.id === gameId ? { ...g, hero_path: newHeroPath } : g))
            );
          }}
          onLogoChanged={(gameId, newLogoPath) => {
            setGames((prev) =>
              prev.map((g) => (g.id === gameId ? { ...g, logo_path: newLogoPath } : g))
            );
          }}
          onOpenSettings={onOpenSettings}
          onBack={() => handleLayoutStyleChange("classic")}
        />
      </Suspense>
    );
  }

  return (
    <>
      <HeroBanner
        games={featured}
        allGames={games}
        onSelect={onSelectGame}
        onFavoriteChanged={onFavoriteChanged}
        layoutStyle={layoutStyle}
      />

      {layoutStyle === "classic" && searchQuery.trim() ? (
        <div style={{ padding: "0 48px 48px" }}>
          {searchResults.length > 0 ? (
            <CategoryRow
              title={t("search.searchResultsWithCount", { count: searchResults.length })}
              games={searchResults.slice(0, 60)}
              onSelect={onSelectGame}
              onFavoriteChanged={onFavoriteChanged}
              focusedId={showNavFocus ? searchResults[flatFocusIdx]?.id : null}
            />
          ) : (
            <p
              style={{
                color: "#777",
                padding: "32px 0",
                textAlign: "center",
                fontSize: "16px",
              }}
            >
              {t("search.noResults", { query: searchQuery })}
            </p>
          )}
        </div>
      ) : (
        homeRows.map((row, rowIdx) => {
          const isRowActive = homeFocus.row === rowIdx;
          const focusedIdInRow =
            showNavFocus && isRowActive && row.games.length > 0
              ? row.games[Math.min(homeFocus.col, row.games.length - 1)]?.id
              : null;
          return (
            <CategoryRow
              key={row.id}
              title={row.title}
              games={row.games}
              onSelect={onSelectGame}
              onFavoriteChanged={onFavoriteChanged}
              focusedId={focusedIdInRow}
            />
          );
        })
      )}
    </>
  );
}

export default memo(HomeView);
