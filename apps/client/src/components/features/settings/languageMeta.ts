import type { AppLanguage } from "@/i18n";

import ruFlagUrl from "@/assets/ru.svg";
import ukFlagUrl from "@/assets/uk.svg";
import uzbFlagUrl from "@/assets/uzb.svg";

/**
 * Emoji fallbacks for languages we don't ship a custom flag image for.
 * Telegram WebView renders these inconsistently, but they're a reasonable
 * placeholder for the "other languages" list.
 */
export const LANGUAGE_FLAGS: Record<AppLanguage, string> = {
  en: "🇬🇧",
  de: "🇩🇪",
  es: "🇪🇸",
  fr: "🇫🇷",
  ja: "🇯🇵",
  kk: "🇰🇿",
  ko: "🇰🇷",
  ru: "🇷🇺",
  tr: "🇹🇷",
  uz: "🇺🇿",
  zh: "🇨🇳",
};

/**
 * Static SVG flags for the primary languages — they always look right in
 * Telegram regardless of system emoji support.
 */
export const LANGUAGE_FLAG_URLS: Partial<Record<AppLanguage, string>> = {
  en: ukFlagUrl,
  ru: ruFlagUrl,
  uz: uzbFlagUrl,
};
