import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGenreCatalog } from "../useGenreCatalog";
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
    name: "Final Fantasy VI",
    platform: "SNES",
    rom_path: "/roms/ff6.sfc",
    genre: "RPG",
    hero_path: "/heroes/ff6.jpg",
  }),
  makeGame({
    id: "2",
    name: "Chrono Trigger",
    platform: "SNES",
    rom_path: "/roms/ct.sfc",
    genre: "Role-Playing",
  }),
  makeGame({
    id: "3",
    name: "Street Fighter II",
    platform: "SNES",
    rom_path: "/roms/sf2.sfc",
    genre: "Fighting",
  }),
  makeGame({
    id: "4",
    name: "Tekken 3",
    platform: "PS1",
    rom_path: "/roms/tekken3.chd",
    genre: "Fighting",
  }),
];

describe("useGenreCatalog", () => {
  const sortGames = (list: Game[]) => [...list].sort((a, b) => a.name.localeCompare(b.name));

  it("should merge RPG and Role-Playing into a single canonical genre", () => {
    const { result } = renderHook(() =>
      useGenreCatalog({
        games: mockGames,
        section: "genres",
        sortGames,
        recentlyPlayed: [],
      })
    );

    const rpgCategory = result.current.genreList.find((g) => g.name === "Role-Playing");
    expect(rpgCategory).toBeDefined();
    expect(rpgCategory?.count).toBe(2);
    // Should prioritize the game with hero_path
    expect(rpgCategory?.imagePath).toBe("/heroes/ff6.jpg");

    const fightingCategory = result.current.genreList.find((g) => g.name === "Fighting");
    expect(fightingCategory).toBeDefined();
    expect(fightingCategory?.count).toBe(2);
  });

  it("should filter activeGenreGames when selectedGenre is active", () => {
    const { result } = renderHook(() =>
      useGenreCatalog({
        games: mockGames,
        section: "genre",
        sortGames,
        recentlyPlayed: [],
      })
    );

    act(() => {
      result.current.setSelectedGenre("Role-Playing");
    });

    expect(result.current.activeGenreGames.length).toBe(2);
    expect(result.current.activeGenreGames.map((g) => g.id)).toEqual(["2", "1"]); // Sorted alphabetically by name: Chrono Trigger, Final Fantasy VI
  });

  it("should separate activeGenreSections by platform", () => {
    const { result } = renderHook(() =>
      useGenreCatalog({
        games: mockGames,
        section: "genre",
        sortGames,
        recentlyPlayed: [],
      })
    );

    act(() => {
      result.current.setSelectedGenre("Fighting");
    });

    expect(result.current.activeGenreSections.length).toBe(2); // SNES and PS1
    const platforms = result.current.activeGenreSections.map((s) => s.platform);
    expect(platforms).toContain("SNES");
    expect(platforms).toContain("PS1");
  });

  it("should list availableCompanies correctly", () => {
    const { result } = renderHook(() =>
      useGenreCatalog({
        games: mockGames,
        section: "genres",
        sortGames,
        recentlyPlayed: [],
      })
    );

    expect(result.current.availableCompanies).toContain("Nintendo");
    expect(result.current.availableCompanies).toContain("PlayStation");
  });
});
