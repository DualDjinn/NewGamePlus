import { describe, it, expect } from "vitest";
import { getPlatformCompany, getPlatformDisplayName, PLATFORM_COLORS, getPlatformLogo } from "../platforms";

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

  describe("getPlatformLogo", () => {
    it("should return the correct logo image path for supported consoles", () => {
      expect(getPlatformLogo("snes")).toBe("/logos/Nintendo/SNES.png");
      expect(getPlatformLogo("GBA")).toBe("/logos/Nintendo/GBA.png");
      expect(getPlatformLogo("3DS")).toBe("/logos/Nintendo/3DS.png");
      expect(getPlatformLogo("GAMECUBE")).toBe("/logos/Nintendo/NGC.png");
      expect(getPlatformLogo("PS1")).toBe("/logos/Playstation/PS1.png");
      expect(getPlatformLogo("PS2")).toBe("/logos/Playstation/ps2.png");
      expect(getPlatformLogo("mega_drive")).toBe("/logos/Sega/SMD.png");
      expect(getPlatformLogo("mame")).toBe("/logos/Mame/Mame.png");
      expect(getPlatformLogo("neogeo")).toBe("/logos/NeoGeo/NeoGeo.png");
      expect(getPlatformLogo("pc")).toBe("/logos/PC/PC.png");
    });

    it("should return null for platforms without a dedicated logo", () => {
      expect(getPlatformLogo("unknown_platform")).toBeNull();
      expect(getPlatformLogo("")).toBeNull();
    });
  });
});
