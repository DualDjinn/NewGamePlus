import { useState, useMemo, useRef } from "react";
import type { Game } from "../types";
import { getPlatformCompany, getPlatformDisplayName, PLATFORM_COLORS } from "../lib/platforms";

export function nameMatches(g: Game, q: string): boolean {
  const query = q.toLowerCase();
  return (
    g.name.toLowerCase().includes(query) ||
    (g.display_name ?? "").toLowerCase().includes(query)
  );
}

interface UseGameSearchProps {
  games: Game[];
  sortGames: (list: Game[]) => Game[];
  selectedCompany: string;
}

export function useGameSearch({
  games,
  sortGames,
  selectedCompany,
}: UseGameSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return sortGames(games.filter((g) => nameMatches(g, q)));
  }, [games, searchQuery, sortGames]);

  const navbarSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || games.length === 0) return [];

    const matches = games.filter((g) => {
      const name = g.name.toLowerCase();
      const disp = (g.display_name ?? "").toLowerCase();
      return name.includes(q) || disp.includes(q);
    });

    matches.sort((a, b) => {
      const aName = (a.display_name || a.name).toLowerCase();
      const bName = (b.display_name || b.name).toLowerCase();
      const aStarts = aName.startsWith(q);
      const bStarts = bName.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aName.localeCompare(bName);
    });

    return matches.slice(0, 6);
  }, [searchQuery, games]);

  // Biblioteca plana: todos los juegos filtrados por compañía y buscador
  const libraryGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = games;
    if (selectedCompany && selectedCompany !== "all") {
      list = list.filter((g) => getPlatformCompany(g.platform) === selectedCompany);
    }
    if (q) {
      list = list.filter((g) => nameMatches(g, q));
    }
    return sortGames(list);
  }, [games, selectedCompany, searchQuery, sortGames]);

  // Agrupación de la biblioteca por plataforma/consola
  const librarySections = useMemo(() => {
    const map = new Map<string, Game[]>();
    for (const game of libraryGames) {
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
  }, [libraryGames]);

  return {
    searchQuery,
    setSearchQuery,
    searchInputRef,
    searchDropdownOpen,
    setSearchDropdownOpen,
    searchResults,
    navbarSearchResults,
    libraryGames,
    librarySections,
  };
}
