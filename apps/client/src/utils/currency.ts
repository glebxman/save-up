import type { CurrencyCode } from "@finance-twa/shared-types";
import { getTelegramUserId } from "@finance-twa/shared-utils";

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  UZS: "so'm",
  RUB: "₽",
  USD: "$",
  EUR: "€",
  KZT: "₸",
  TRY: "₺",
  GBP: "£",
  CNY: "¥",
  BTC: "BTC",
  ETH: "ETH",
  TON: "TON",
  USDT: "USDT",
  NOTCOIN: "NOT",
};

export const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  UZS: "uz-UZ",
  RUB: "ru-RU",
  USD: "en-US",
  EUR: "de-DE",
  KZT: "kk-KZ",
  TRY: "tr-TR",
  GBP: "en-GB",
  CNY: "zh-CN",
  BTC: "en-US",
  ETH: "en-US",
  TON: "en-US",
  USDT: "en-US",
  NOTCOIN: "en-US",
};

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  "UZS", "RUB", "USD", "EUR", "KZT", "TRY", "GBP", "CNY",
];

export const CURRENCY_CHANGE_EVENT = "save-up:currency-change";

function getStorageKey(): string {
  const userId = getTelegramUserId();
  return userId ? `save-up:${userId}:currency` : "save-up:currency";
}

const DEFAULT_CURRENCY: CurrencyCode = "UZS";

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && value in CURRENCY_SYMBOLS;
}

export function getStoredCurrency(): CurrencyCode {
  try {
    const stored = localStorage.getItem(getStorageKey());
    return isCurrencyCode(stored) ? stored : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function setStoredCurrency(currency: CurrencyCode): void {
  if (!isCurrencyCode(currency)) return;

  try {
    localStorage.setItem(getStorageKey(), currency);
  } catch {
    // noop
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CURRENCY_CHANGE_EVENT, { detail: currency }));
  }
}
