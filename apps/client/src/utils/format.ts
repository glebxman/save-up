import i18n from "@/i18n";

import type { CurrencyCode } from "@finance-twa/shared-types";
import { CURRENCY_SYMBOLS, CURRENCY_LOCALES, getStoredCurrency } from "./currency";

const localeMap = {
  de: "de-DE",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  ja: "ja-JP",
  kk: "kk-KZ",
  ko: "ko-KR",
  ru: "ru-RU",
  tr: "tr-TR",
  uz: "uz-UZ",
  zh: "zh-CN",
} as const;

export function formatMoney(value: number, currency?: CurrencyCode): string {
  const curr = currency ?? getStoredCurrency();
  const locale = CURRENCY_LOCALES[curr];
  const symbol = CURRENCY_SYMBOLS[curr];

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: curr === "UZS" ? 0 : 2,
  }).format(value);

  return `${formatted} ${symbol}`;
}

export function getCurrencySymbol(currency?: CurrencyCode): string {
  const curr = currency ?? getStoredCurrency();
  return CURRENCY_SYMBOLS[curr];
}

export function formatDateTime(value: string): string {
  const language = (i18n.resolvedLanguage ?? "en").slice(0, 2) as keyof typeof localeMap;
  const locale = localeMap[language] ?? localeMap.en;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function toDateInputValue(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function formatGroupedNumber(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";

  const language = (i18n.resolvedLanguage ?? "en").slice(0, 2) as keyof typeof localeMap;
  const locale = localeMap[language] ?? localeMap.en;
  const number = parseInt(digitsOnly, 10);
  return number.toLocaleString(locale);
}

export function parseFormattedInput(value: string): number {
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}

export function getMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseAmount(value: string): number {
  const digits = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = Number(digits);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
