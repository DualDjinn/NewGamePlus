import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Game, Section } from "../types";
import { getPlatformCompany, getPlatformDisplayName, PLATFORM_COLORS } from "../lib/platforms";
import { getLocalizedGenreName, normalizeGenre } from "../lib/genreLocalization";

export const OTHER_TITLES = "___other___";

interface UseGenreCatalogProps {
  games: Game[];
  section: Section;
  sortGames: (list: Game[]) => Game[];
  recentlyPlayed: Game[];
}

export function useGenreCatalog({
  games,
  section,
  sortGames,
  recentlyPlayed,
}: UseGenreCatalogProps) {
  const { t, i18n } = useTranslation();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [randomHomeCategories, setRandomHomeCategories] = useState<string[]>([]);

  const effectiveCompany = section === "home" ? "all" : selectedCompany;

  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    for (const g of games) {
      set.add(getPlatformCompany(g.platform));
    }
    const priority = [
      "PlayStation",
      "Nintendo",
      "PC",
      "Sega",
      "Arcade",
      "SNK",
      "Atari",
      "NEC",
      "Bandai",
      "Coleco",
      "Otros",
    ];
    return priority
      .filter((c) => set.has(c))
      .concat(Array.from(set).filter((c) => !priority.includes(c)));
  }, [games]);

  const genreList = useMemo(() => {
    const map: Record<string, { count: number; imagePath?: string | null; topGameName?: string }> = {};
    const targetGames =
      effectiveCompany === "all"
        ? games
        : games.filter((g) => getPlatformCompany(g.platform) === effectiveCompany);

    for (const g of targetGames) {
      if (g.genre) {
        const canonical = normalizeGenre(g.genre);
        if (!map[canonical]) {
          map[canonical] = { count: 0, imagePath: null };
        }
        map[canonical].count += 1;

        const currentImg = map[canonical].imagePath;
        const candidateImg = g.hero_path || g.cover_path;

        if (!currentImg && candidateImg) {
          map[canonical].imagePath = candidateImg;
          map[canonical].topGameName = g.display_name || g.name;
        } else if (g.hero_path && (!currentImg || currentImg === g.cover_path)) {
          map[canonical].imagePath = g.hero_path;
          map[canonical].topGameName = g.display_name || g.name;
        }
      }
    }
    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        count: data.count,
        imagePath: data.imagePath,
        topGameName: data.topGameName,
      }))
      .sort((a, b) => b.count - a.count);
  }, [games, effectiveCompany]);

  const activeGenreGames = useMemo(() => {
    if (!selectedGenre) return [];
    const targetCanonical = normalizeGenre(selectedGenre);
    let list = games.filter((g) => normalizeGenre(g.genre) === targetCanonical);
    if (effectiveCompany !== "all") {
      list = list.filter((g) => getPlatformCompany(g.platform) === effectiveCompany);
    }
    return sortGames(list);
  }, [games, selectedGenre, effectiveCompany, sortGames]);

  // Agrupación de juegos del género seleccionado por plataforma
  const activeGenreSections = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const game of activeGenreGames) {
      const plat = game.platform || "Otros";
      if (!map.has(plat)) {
        map.set(plat, []);
      }
      map.get(plat)!.push(game);
    }
    return Array.from(map.entries())
      .map(([platform, items]) => ({
        platform,
        displayName: getPlatformDisplayName(platform),
        color: PLATFORM_COLORS[platform.toUpperCase()] || "var(--accent)",
        games: items,
      }))
      .sort((a, b) => b.games.length - a.games.length);
  }, [activeGenreGames]);

  const selectRandomHomeCategories = useCallback(() => {
    if (games.length === 0) return;

    const genreCounts = new Map<string, number>();
    let noGenreCount = 0;
    for (const g of games) {
      if (g.genre && g.genre.trim()) {
        const cat = g.genre.trim();
        genreCounts.set(cat, (genreCounts.get(cat) || 0) + 1);
      } else {
        noGenreCount++;
      }
    }

    let candidates = Array.from(genreCounts.keys());
    if (noGenreCount > 0 && candidates.length < 8) {
      candidates.push(OTHER_TITLES);
    }

    if (candidates.length === 0) {
      const platSet = new Set(games.map((g) => g.platform).filter(Boolean));
      candidates = Array.from(platSet);
    }

    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    setRandomHomeCategories(shuffled.slice(0, 8));
  }, [games]);

  const homeRows = useMemo(() => {
    const rows: { id: string; title: string; games: Game[] }[] = [];
    if (recentlyPlayed.length > 0) {
      rows.push({ id: "recent", title: t("library.recent"), games: recentlyPlayed });
    }

    for (const cat of randomHomeCategories) {
      const isOther = cat === OTHER_TITLES;
      const catGames = isOther
        ? games.filter((g) => !g.genre || !g.genre.trim())
        : games.filter((g) => g.genre?.trim() === cat);

      if (catGames.length > 0) {
        rows.push({
          id: `cat-${cat}`,
          title: isOther ? t("library.otherTitles") : getLocalizedGenreName(cat, t),
          games: sortGames(catGames),
        });
      }
    }
    return rows;
  }, [recentlyPlayed, randomHomeCategories, games, sortGames, t, i18n.language]);

  return {
    selectedGenre,
    setSelectedGenre,
    selectedCompany,
    setSelectedCompany,
    effectiveCompany,
    availableCompanies,
    genreList,
    activeGenreGames,
    activeGenreSections,
    randomHomeCategories,
    selectRandomHomeCategories,
    homeRows,
  };
}
