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

function getTelegramUserId(): number {
  if (typeof window !== "undefined") {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) {
      return tg.initDataUnsafe.user.id;
    }
  }
  if (import.meta.env.VITE_USE_MOCK_API === "true") {
    return Number(import.meta.env.VITE_DEMO_TELEGRAM_ID ?? 1);
  }
  return 0;
}

function getStorageKey(): string {
  const userId = getTelegramUserId();
  return userId ? `save-up:${userId}:currency` : "save-up:currency";
}

const DEFAULT_CURRENCY: CurrencyCode = "UZS";

export function getStoredCurrency(): CurrencyCode {
  try {
    return (localStorage.getItem(getStorageKey()) as CurrencyCode) || DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function setStoredCurrency(currency: CurrencyCode): void {
  try {
    localStorage.setItem(getStorageKey(), currency);
  } catch {
    // noop
  }
}
