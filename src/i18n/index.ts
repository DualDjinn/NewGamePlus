import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import esTranslation from "./locales/es.json";
import enTranslation from "./locales/en.json";

const savedLanguage = localStorage.getItem("gameflix_language") || "es";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: {
        translation: esTranslation,
      },
      en: {
        translation: enTranslation,
      },
    },
    lng: savedLanguage,
    fallbackLng: "es",
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export const changeAppLanguage = (lang: "es" | "en") => {
  i18n.changeLanguage(lang);
  localStorage.setItem("gameflix_language", lang);
};

export default i18n;
