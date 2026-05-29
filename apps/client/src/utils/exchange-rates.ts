import type { CryptoCode, CryptoHolding, CurrencyCode } from "@finance-twa/shared-types";

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
  NOTCOIN: 625,
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

/**
 * USD value of a single crypto holding.
 *
 * `rates` are expressed as "coins per 1 USD" (e.g. BTC ≈ 0.000015), so the USD
 * value of an amount is `amount / rate`.
 */
export function cryptoHoldingValueUsd(
  symbol: CryptoCode,
  amount: number,
  rates: Record<CurrencyCode, number> = EXCHANGE_RATES,
): number {
  const rate = rates[symbol] || DEFAULT_RATES[symbol];
  if (!rate) return 0;
  return amount / rate;
}

/** Total USD valuation of a list of crypto holdings. */
export function cryptoHoldingsTotalUsd(
  holdings: CryptoHolding[] | undefined,
  rates: Record<CurrencyCode, number> = EXCHANGE_RATES,
): number {
  if (!holdings || holdings.length === 0) return 0;
  return holdings.reduce(
    (sum, holding) => sum + cryptoHoldingValueUsd(holding.symbol, holding.amount, rates),
    0,
  );
}
