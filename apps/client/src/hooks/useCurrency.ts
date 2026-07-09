import { useEffect, useState } from "react";

import type { CurrencyCode } from "@finance-twa/shared-types";
import {
  CURRENCY_CHANGE_EVENT,
  getStoredCurrency,
  isCurrencyCode,
  setStoredCurrency,
} from "../utils/currency";

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

  return {
    currency,
    setCurrency,
  };
}
