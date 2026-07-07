import { useEffect, useState } from "react";

import type { CurrencyCode } from "@finance-twa/shared-types";
import {
  CURRENCY_SYMBOLS,
  CURRENCY_LOCALES,
  CURRENCY_CHANGE_EVENT,
  SUPPORTED_CURRENCIES,
  getStoredCurrency,
  isCurrencyCode,
  setStoredCurrency,
} from "../utils/currency";

export { getStoredCurrency, SUPPORTED_CURRENCIES };

export function useCurrency() {
  const [currency, setCurrencyState] = useState<CurrencyCode>(getStoredCurrency());

  useEffect(() => {
    const onCurrencyChange = (event: Event) => {
      const nextCurrency = (event as CustomEvent<unknown>).detail;
      if (isCurrencyCode(nextCurrency)) {
        setCurrencyState(nextCurrency);
      }
    };

    window.addEventListener(CURRENCY_CHANGE_EVENT, onCurrencyChange);
    return () => window.removeEventListener(CURRENCY_CHANGE_EVENT, onCurrencyChange);
  }, []);

  const setCurrency = (newCurrency: CurrencyCode) => {
    setStoredCurrency(newCurrency);
    setCurrencyState(newCurrency);
  };

  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSymbol = (): string => {
    return CURRENCY_SYMBOLS[currency];
  };

  return {
    currency,
    setCurrency,
    formatAmount,
    getSymbol,
  };
}
