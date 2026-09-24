import { describe, it, expect } from "vitest";
import { searchSettingsOptions } from "../settingsSearch";

describe("settingsSearch", () => {
  it("should return empty array for blank query", () => {
    expect(searchSettingsOptions("")).toEqual([]);
    expect(searchSettingsOptions("   ")).toEqual([]);
  });

  it("should find audio device option when searching 'audio' or 'parlantes'", () => {
    const results = searchSettingsOptions("audio");
    expect(results.length).toBeGreaterThan(0);
    const hasAudio = results.some((r) => r.id === "sound-output-device");
    expect(hasAudio).toBe(true);
  });

  it("should find Citra/3DS options when searching 'citra' or '3ds'", () => {
    const results = searchSettingsOptions("citra");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].tab).toBe("graphics");
    expect(results[0].graphicsConsole).toBe("citra");
  });

  it("should find RetroAchievements when searching 'logros'", () => {
    const results = searchSettingsOptions("logros");
    expect(results.some((r) => r.id === "integrations-ra")).toBe(true);
  });

  it("should prioritize exact title matches first", () => {
    const results = searchSettingsOptions("Volumen de Emulación");
    expect(results[0].id).toBe("sound-emulation-volume");
  });
});
