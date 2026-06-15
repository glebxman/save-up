import type { SupportedLanguage } from "@finance-twa/shared-types";
import { SUPPORTED_LANGUAGES as SHARED_SUPPORTED_LANGUAGES } from "@finance-twa/shared-types";
import en from "../locales/en.json" with { type: "json" };
import ru from "../locales/ru.json" with { type: "json" };
import uz from "../locales/uz.json" with { type: "json" };
import kk from "../locales/kk.json" with { type: "json" };
import zh from "../locales/zh.json" with { type: "json" };
import ja from "../locales/ja.json" with { type: "json" };
import ko from "../locales/ko.json" with { type: "json" };
import tr from "../locales/tr.json" with { type: "json" };
import es from "../locales/es.json" with { type: "json" };
import fr from "../locales/fr.json" with { type: "json" };
import de from "../locales/de.json" with { type: "json" };

export type SupportedLang = SupportedLanguage;

export const SUPPORTED_LANGUAGES: SupportedLang[] = SHARED_SUPPORTED_LANGUAGES;

export const LANGUAGE_LABELS: Record<SupportedLang, string> = {
  en: "English",
  ru: "Русский",
  uz: "O'zbek",
  kk: "Қазақша",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  tr: "Türkçe",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
};

export const LANGUAGE_FLAGS: Record<SupportedLang, string> = {
  en: "🇬🇧",
  ru: "🇷🇺",
  uz: "🇺🇿",
  kk: "🇰🇿",
  zh: "🇨🇳",
  ja: "🇯🇵",
  ko: "🇰🇷",
  tr: "🇹🇷",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
};

const LOCALES: Record<SupportedLang, Record<string, string>> = {
  en, ru, uz, kk, zh, ja, ko, tr, es, fr, de,
};

export function getBotMessage(key: string, lang: SupportedLang | string): string {
  const safeLang = (LOCALES[lang as SupportedLang] ? lang : "en") as SupportedLang;
  return LOCALES[safeLang]?.[key] ?? LOCALES["en"]?.[key] ?? "";
}

export function formatAmount(amount: number, lang: string): string {
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  return amount.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

import type { ExpenseCategory } from "@finance-twa/shared-types";

const CATEGORY_EMOJI_MAP: Record<string, string> = {
  food: "🍔",
  taxi: "🚕",
  entertainment: "🎬",
  shopping: "🛍",
  utilities: "🏠",
  health: "💊",
  education: "📚",
  other: "📦",
};

export function getCategoryEmoji(category: ExpenseCategory | string): string {
  return CATEGORY_EMOJI_MAP[category] ?? "📦";
}
