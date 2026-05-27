import type { CurrencyCode } from "@finance-twa/shared-types";

const DEFAULT_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  UZS: 12500,
  RUB: 92,
  EUR: 0.92,
  KZT: 450,
  TRY: 32,
  GBP: 0.79,
  CNY: 7.23,
  BTC: 0.000015,
  ETH: 0.0003,
  TON: 0.15,
  USDT: 1.0,
};

export const EXCHANGE_RATES: Record<CurrencyCode, number> = { ...DEFAULT_RATES };

export function setGlobalRates(rates: Record<CurrencyCode, number>) {
  Object.assign(EXCHANGE_RATES, DEFAULT_RATES, rates);
}

export function getConversionRate(from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return 1;

  const fromRate = EXCHANGE_RATES[from] || DEFAULT_RATES[from];
  const toRate = EXCHANGE_RATES[to] || DEFAULT_RATES[to];

  return toRate / fromRate;
}
