import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import ja from "./locales/ja.json";
import kk from "./locales/kk.json";
import ko from "./locales/ko.json";
import ru from "./locales/ru.json";
import tr from "./locales/tr.json";
import uz from "./locales/uz.json";
import zh from "./locales/zh.json";

export const LANGUAGE_STORAGE_KEY = "finance-twa.language";
export const PRIMARY_LANGUAGES = ["en", "ru", "uz"] as const;
export const OTHER_LANGUAGES = ["kk", "zh", "ja", "ko", "tr", "es", "fr", "de"] as const;
export const SUPPORTED_LANGUAGES = [...PRIMARY_LANGUAGES, ...OTHER_LANGUAGES] as const;

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
      de: { translation: de },
      es: { translation: es },
      fr: { translation: fr },
      ja: { translation: ja },
      kk: { translation: kk },
      ko: { translation: ko },
      ru: { translation: ru },
      tr: { translation: tr },
      uz: { translation: uz },
      zh: { translation: zh },
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
