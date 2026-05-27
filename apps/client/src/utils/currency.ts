import type { CurrencyCode } from "@finance-twa/shared-types";

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
};

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  "UZS", "RUB", "USD", "EUR", "KZT", "TRY", "GBP", "CNY",
];

const STORAGE_KEY = "save-up:currency";
const DEFAULT_CURRENCY: CurrencyCode = "UZS";

export function getStoredCurrency(): CurrencyCode {
  try {
    return (localStorage.getItem(STORAGE_KEY) as CurrencyCode) || DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function setStoredCurrency(currency: CurrencyCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, currency);
  } catch {
    // noop
  }
}
