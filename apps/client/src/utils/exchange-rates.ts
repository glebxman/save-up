import type { CryptoCode, CryptoHolding, CurrencyCode } from "@finance-twa/shared-types";
import { DEFAULT_EXCHANGE_RATES } from "@finance-twa/shared-types";

export const EXCHANGE_RATES: Record<CurrencyCode, number> = { ...DEFAULT_EXCHANGE_RATES };

export function setGlobalRates(rates: Record<CurrencyCode, number>) {
  Object.assign(EXCHANGE_RATES, DEFAULT_EXCHANGE_RATES, rates);
}

export function getConversionRate(from: CurrencyCode, to: CurrencyCode): number {
  if (from === to) return 1;

  const fromRate = EXCHANGE_RATES[from] || DEFAULT_EXCHANGE_RATES[from];
  const toRate = EXCHANGE_RATES[to] || DEFAULT_EXCHANGE_RATES[to];

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
  const rate = rates[symbol] || DEFAULT_EXCHANGE_RATES[symbol];
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
