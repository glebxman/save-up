import i18n from "@/i18n";

import type { CurrencyCode } from "@finance-twa/shared-types";
import { getStoredCurrency } from "@/hooks/useCurrency";

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

const currencySymbols: Record<CurrencyCode, string> = {
  UZS: "so'm",
  RUB: "₽",
  USD: "$",
  EUR: "€",
  KZT: "₸",
  TRY: "₺",
  GBP: "£",
  CNY: "¥",
};

const currencyLocales: Record<CurrencyCode, string> = {
  UZS: "uz-UZ",
  RUB: "ru-RU",
  USD: "en-US",
  EUR: "de-DE",
  KZT: "kk-KZ",
  TRY: "tr-TR",
  GBP: "en-GB",
  CNY: "zh-CN",
};

export function formatMoney(value: number, currency?: CurrencyCode): string {
  const curr = currency ?? getStoredCurrency();
  const locale = currencyLocales[curr];
  const symbol = currencySymbols[curr];

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: curr === "UZS" ? 0 : 2,
  }).format(value);

  return `${formatted} ${symbol}`;
}

export function getCurrencySymbol(currency?: CurrencyCode): string {
  const curr = currency ?? getStoredCurrency();
  return currencySymbols[curr];
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

export function formatInputWithРазделителями(value: string): string {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";

  const number = parseInt(digitsOnly, 10);
  return number.toLocaleString("ru-RU");
}

export function parseFormattedInput(value: string): number {
  const digitsOnly = value.replace(/\D/g, "");
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
}
