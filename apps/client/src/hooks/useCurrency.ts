import { useEffect, useState } from "react";

import type { CurrencyCode } from "@finance-twa/shared-types";

const STORAGE_KEY = "save-up:currency";
const DEFAULT_CURRENCY: CurrencyCode = "UZS";

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

export function getStoredCurrency(): CurrencyCode {
  try {
    return (localStorage.getItem(STORAGE_KEY) as CurrencyCode) || DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

export function useCurrency() {
  const [currency, setCurrencyState] = useState<CurrencyCode>(getStoredCurrency());

  useEffect(() => {
    const stored = getStoredCurrency();
    if (stored !== currency) {
      setCurrencyState(stored);
    }
  }, []);

  const setCurrency = (newCurrency: CurrencyCode) => {
    try {
      localStorage.setItem(STORAGE_KEY, newCurrency);
      setCurrencyState(newCurrency);
    } catch {
      // noop
    }
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat(currencyLocales[currency], {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSymbol = (): string => {
    return currencySymbols[currency];
  };

  return {
    currency,
    setCurrency,
    formatAmount,
    getSymbol,
  };
}

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  "UZS",
  "RUB",
  "USD",
  "EUR",
  "KZT",
  "TRY",
  "GBP",
  "CNY",
];
