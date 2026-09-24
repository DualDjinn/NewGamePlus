import { describe, it, expect } from "vitest";
import { getPlatformCompany, getPlatformDisplayName, PLATFORM_COLORS } from "../platforms";

describe("platforms", () => {
  describe("getPlatformCompany", () => {
    it("should classify Nintendo platforms correctly", () => {
      expect(getPlatformCompany("snes")).toBe("Nintendo");
      expect(getPlatformCompany("NES")).toBe("Nintendo");
      expect(getPlatformCompany("gba")).toBe("Nintendo");
      expect(getPlatformCompany("3DS")).toBe("Nintendo");
      expect(getPlatformCompany("GAMECUBE")).toBe("Nintendo");
    });

    it("should classify PlayStation platforms correctly", () => {
      expect(getPlatformCompany("ps1")).toBe("PlayStation");
      expect(getPlatformCompany("PS2")).toBe("PlayStation");
      expect(getPlatformCompany("ps3")).toBe("PlayStation");
      expect(getPlatformCompany("PSP")).toBe("PlayStation");
    });

    it("should classify Sega platforms correctly", () => {
      expect(getPlatformCompany("mega_drive")).toBe("Sega");
      expect(getPlatformCompany("DREAMCAST")).toBe("Sega");
      expect(getPlatformCompany("sms")).toBe("Sega");
    });

    it("should classify Arcade platforms correctly", () => {
      expect(getPlatformCompany("mame")).toBe("Arcade");
      expect(getPlatformCompany("neogeo")).toBe("Arcade");
      expect(getPlatformCompany("fbneo")).toBe("Arcade");
    });

    it("should classify PC and unknown platforms correctly", () => {
      expect(getPlatformCompany("pc")).toBe("PC");
      expect(getPlatformCompany("unknown_console")).toBe("Otros");
    });
  });

  describe("getPlatformDisplayName", () => {
    it("should return human-friendly names for recognized platforms", () => {
      expect(getPlatformDisplayName("snes")).toBe("Super Nintendo (SNES)");
      expect(getPlatformDisplayName("PS1")).toBe("PlayStation (PS1)");
      expect(getPlatformDisplayName("mame")).toBe("Arcade (MAME)");
    });

    it("should fallback to uppercase platform code for unknown platforms", () => {
      expect(getPlatformDisplayName("custom")).toBe("CUSTOM");
    });
  });

  describe("PLATFORM_COLORS", () => {
    it("should have color definitions for major platforms", () => {
      expect(PLATFORM_COLORS.SNES).toBeDefined();
      expect(PLATFORM_COLORS.PS1).toBeDefined();
      expect(PLATFORM_COLORS.MEGA_DRIVE).toBeDefined();
    });
  });
});
