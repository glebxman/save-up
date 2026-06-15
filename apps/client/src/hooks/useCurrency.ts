import { useState } from "react";

import type { CurrencyCode } from "@finance-twa/shared-types";
import {
  CURRENCY_SYMBOLS,
  CURRENCY_LOCALES,
  SUPPORTED_CURRENCIES,
  getStoredCurrency,
  setStoredCurrency,
} from "../utils/currency";

export { getStoredCurrency, SUPPORTED_CURRENCIES };

export function useCurrency() {
  const [currency, setCurrencyState] = useState<CurrencyCode>(getStoredCurrency());

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
