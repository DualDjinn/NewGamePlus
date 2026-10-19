import { describe, it, expect } from "vitest";
import { searchSettingsOptions, resolveSettingsOptions } from "../settingsSearch";

// Minimal mock t: resolves the handful of keys used in assertions to Spanish.
const esTitles: Record<string, string> = {
  "settings.sound.ifaceVolume": "Volumen de la Interfaz & Música",
  "settings.sound.outTitle": "Dispositivo de Salida de Audio",
  "settings.sound.emuVolume": "Volumen de Emulación",
  "settings.graphics.citraTitle": "Nintendo 3DS (Core Citra)",
};
const t = ((key: string) => esTitles[key] ?? key) as never;

describe("settingsSearch", () => {
  it("should return empty array for blank query", () => {
    expect(searchSettingsOptions("", t)).toEqual([]);
    expect(searchSettingsOptions("   ", t)).toEqual([]);
  });

  it("should find audio device option when searching 'audio' or 'parlantes'", () => {
    const results = searchSettingsOptions("audio", t);
    expect(results.length).toBeGreaterThan(0);
    const hasAudio = results.some((r) => r.id === "sound-output-device");
    expect(hasAudio).toBe(true);
  });

  it("should find Citra/3DS options when searching 'citra' or '3ds'", () => {
    const results = searchSettingsOptions("citra", t);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].tab).toBe("graphics");
    expect(results[0].graphicsConsole).toBe("citra");
  });

  it("should find RetroAchievements when searching 'logros'", () => {
    const results = searchSettingsOptions("logros", t);
    expect(results.some((r) => r.id === "integrations-ra")).toBe(true);
  });

  it("should prioritize exact title matches first", () => {
    const results = searchSettingsOptions("Volumen de Emulación", t);
    expect(results[0].id).toBe("sound-emulation-volume");
  });

  it("should resolve titles through t()", () => {
    const [first] = resolveSettingsOptions(t);
    expect(first.title).toBeTruthy();
    expect(first.title).not.toContain("settings.");
  });
});
