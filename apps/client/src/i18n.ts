import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ru from "./locales/ru.json";
import uz from "./locales/uz.json";

export const LANGUAGE_STORAGE_KEY = "finance-twa.language";
export const SUPPORTED_LANGUAGES = ["en", "ru", "uz"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function getInitialLanguage(): AppLanguage {
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (stored && SUPPORTED_LANGUAGES.includes(stored as AppLanguage)) {
    return stored as AppLanguage;
  }

  const browserLanguage = window.navigator.language.slice(0, 2) as AppLanguage;

  if (SUPPORTED_LANGUAGES.includes(browserLanguage)) {
    return browserLanguage;
  }

  return "en";
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      uz: { translation: uz },
    },
    lng: getInitialLanguage(),
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

void i18n.on("languageChanged", (language: string) => {
  if (SUPPORTED_LANGUAGES.includes(language as AppLanguage)) {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }
});

export default i18n;
