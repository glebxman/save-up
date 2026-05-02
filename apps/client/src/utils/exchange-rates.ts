import type { CurrencyCode } from "@finance-twa/shared-types";

/**
 * Approximate exchange rates relative to USD (1 USD = rate units)
 * These are used as fallbacks if the server hasn't provided real-time rates yet.
 */
const DEFAULT_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  UZS: 12500,
  RUB: 92,
  EUR: 0.92,
  KZT: 450,
  TRY: 32,
  GBP: 0.79,
  CNY: 7.23,
};

export const EXCHANGE_RATES: Record<CurrencyCode, number> = { ...DEFAULT_RATES };

/**
 * Updates the global exchange rates used for client-side conversions.
 * Usually called when status data is received from the server.
 */
export function setGlobalRates(rates: Record<CurrencyCode, number>) {
  Object.assign(EXCHANGE_RATES, DEFAULT_RATES, rates);
}

export function getConversionRate(from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return 1;
  
  const fromRate = EXCHANGE_RATES[from] || DEFAULT_RATES[from];
  const toRate = EXCHANGE_RATES[to] || DEFAULT_RATES[to];
  
  return toRate / fromRate;
}
