import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGameSearch, nameMatches } from "../useGameSearch";
import type { Game } from "../../types";

function makeGame(data: Partial<Game> & { id: string; name: string; platform: string; rom_path: string }): Game {
  return {
    display_name: null,
    core_name: "default_core",
    cover_path: null,
    favorite: false,
    last_played: null,
    genre: null,
    ...data,
  };
}

const mockGames: Game[] = [
  makeGame({
    id: "1",
    name: "Super Mario World",
    display_name: "Super Mario World (USA)",
    platform: "SNES",
    rom_path: "/roms/smw.sfc",
  }),
  makeGame({
    id: "2",
    name: "Super Mario 64",
    display_name: "Super Mario 64",
    platform: "N64",
    rom_path: "/roms/sm64.z64",
  }),
  makeGame({
    id: "3",
    name: "Castlevania - Symphony of the Night",
    display_name: "Castlevania: Symphony of the Night",
    platform: "PS1",
    rom_path: "/roms/sotn.chd",
  }),
  makeGame({
    id: "4",
    name: "Sonic the Hedgehog",
    display_name: "Sonic the Hedgehog",
    platform: "MEGA_DRIVE",
    rom_path: "/roms/sonic.md",
  }),
];

describe("useGameSearch", () => {
  describe("nameMatches", () => {
    it("should match by base name or display_name case-insensitively", () => {
      expect(nameMatches(mockGames[0], "mario")).toBe(true);
      expect(nameMatches(mockGames[0], "MARIO")).toBe(true);
      expect(nameMatches(mockGames[0], "usa")).toBe(true);
      expect(nameMatches(mockGames[0], "zelda")).toBe(false);
    });
  });

  describe("hook execution", () => {
    const sortGames = (list: Game[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));

    it("should return empty searchResults when query is empty", () => {
      const { result } = renderHook(() =>
        useGameSearch({
          games: mockGames,
          sortGames,
          selectedCompany: "all",
        })
      );

      expect(result.current.searchQuery).toBe("");
      expect(result.current.searchResults).toEqual([]);
      expect(result.current.navbarSearchResults).toEqual([]);
      expect(result.current.libraryGames.length).toBe(4);
    });

    it("should filter searchResults when query changes", () => {
      const { result } = renderHook(() =>
        useGameSearch({
          games: mockGames,
          sortGames,
          selectedCompany: "all",
        })
      );

      act(() => {
        result.current.setSearchQuery("mario");
      });

      expect(result.current.searchResults.length).toBe(2);
      expect(result.current.navbarSearchResults.length).toBe(2);
      expect(result.current.searchResults.map((g) => g.id)).toContain("1");
      expect(result.current.searchResults.map((g) => g.id)).toContain("2");
    });

    it("should prioritize prefix matches in navbarSearchResults", () => {
      const { result } = renderHook(() =>
        useGameSearch({
          games: mockGames,
          sortGames,
          selectedCompany: "all",
        })
      );

      act(() => {
        result.current.setSearchQuery("super");
      });

      expect(result.current.navbarSearchResults[0].name.startsWith("Super")).toBe(true);
    });

    it("should filter libraryGames by selectedCompany", () => {
      const { result } = renderHook(() =>
        useGameSearch({
          games: mockGames,
          sortGames,
          selectedCompany: "PlayStation",
        })
      );

      expect(result.current.libraryGames.length).toBe(1);
      expect(result.current.libraryGames[0].platform).toBe("PS1");
      expect(result.current.librarySections.length).toBe(1);
      expect(result.current.librarySections[0].platform).toBe("PS1");
    });
  });
});
