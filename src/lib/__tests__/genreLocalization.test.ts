import { describe, it, expect } from "vitest";
import { normalizeGenre, getLocalizedGenreName } from "../genreLocalization";

describe("genreLocalization", () => {
  describe("normalizeGenre", () => {
    it("should normalize RPG variants to canonical 'Role-Playing'", () => {
      expect(normalizeGenre("RPG")).toBe("Role-Playing");
      expect(normalizeGenre("rpg")).toBe("Role-Playing");
      expect(normalizeGenre("Role-Playing")).toBe("Role-Playing");
      expect(normalizeGenre("Role-Playing Game")).toBe("Role-Playing");
      expect(normalizeGenre("JRPG")).toBe("Role-Playing");
      expect(normalizeGenre("Action RPG")).toBe("Role-Playing");
    });

    it("should preserve standard genres cleanly", () => {
      expect(normalizeGenre("Action")).toBe("Action");
      expect(normalizeGenre("Platform")).toBe("Platform");
      expect(normalizeGenre("Fighting")).toBe("Fighting");
      expect(normalizeGenre("Shooter")).toBe("Shooter");
    });

    it("should handle empty or null values gracefully", () => {
      expect(normalizeGenre("")).toBe("");
      expect(normalizeGenre(null)).toBe("");
      expect(normalizeGenre(undefined)).toBe("");
    });
  });

  describe("getLocalizedGenreName", () => {
    it("should use translation function if available", () => {
      const mockT = (key: string) => {
        if (key === "genres.names.Role-Playing") return "Rol / RPG";
        if (key === "genres.names.Action") return "Acción";
        return key;
      };

      expect(getLocalizedGenreName("RPG", mockT as any)).toBe("Rol / RPG");
      expect(getLocalizedGenreName("Action", mockT as any)).toBe("Acción");
    });

    it("should return canonical genre when translation key is untranslated", () => {
      const mockT = (key: string) => key;
      expect(getLocalizedGenreName("CustomGenre", mockT as any)).toBe("CustomGenre");
    });
  });
});
