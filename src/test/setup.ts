import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

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

// Clean mock for react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (typeof options === "string") return options;
      if (options && typeof options === "object") {
        if (options.defaultValue) return options.defaultValue;
        if (options.label) return options.label;
        if (options.query) return `No se encontraron resultados para "${options.query}"`;
        if (options.count !== undefined) return `${options.count} juegos`;
      }
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
