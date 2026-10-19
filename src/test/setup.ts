import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import esTranslation from "../i18n/locales/es.json";

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock getGamepads
if (!navigator.getGamepads) {
  Object.defineProperty(navigator, "getGamepads", {
    value: () => [],
    writable: true,
  });
}

function lookup(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);
}

function interpolate(template: string, options?: Record<string, unknown>): string {
  if (!options) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, name: string) => {
    const v = options[name];
    return v === undefined || v === null ? "" : String(v);
  });
}

// Test i18n mock resolving the real Spanish catalog (mirrors i18next behavior
// for the features used: defaultValue, _one/_other plurals, {{interpolation}}).
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (typeof options === "string") return options;
      const opts = (options && typeof options === "object" ? options : {}) as Record<string, unknown>;
      if (opts.defaultValue !== undefined && lookup(esTranslation, key) === undefined) {
        return interpolate(String(opts.defaultValue), opts);
      }
      if (opts.label) return opts.label;
      let resolved: unknown = lookup(esTranslation, key);
      if (opts.count !== undefined) {
        const n = Number(opts.count);
        const pluralKey = `${key}_${n === 1 ? "one" : "other"}`;
        const plural = lookup(esTranslation, pluralKey);
        if (typeof plural === "string") resolved = plural;
      }
      if (typeof resolved === "string") return interpolate(resolved, opts);
      if (opts.query) return `No se encontraron resultados para "${opts.query}"`;
      if (opts.count !== undefined) return `${opts.count} juegos`;
      return key;
    },
    i18n: {
      language: "es",
      changeLanguage: () => Promise.resolve(),
    },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: () => {},
  },
}));
