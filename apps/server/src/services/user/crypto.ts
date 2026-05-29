import type { CryptoCode, CryptoHolding, CurrencyCode } from "@finance-twa/shared-types";
import { CRYPTO_CODES } from "@finance-twa/shared-types";

const CRYPTO_CODE_SET = new Set<CryptoCode>(CRYPTO_CODES);

/** Keep only valid crypto codes with positive amounts, one entry per coin. */
export function sanitizeHoldings(holdings: unknown): CryptoHolding[] {
  if (!Array.isArray(holdings)) return [];
  const bySymbol = new Map<CryptoCode, number>();
  for (const holding of holdings) {
    if (!holding || typeof holding !== "object") continue;
    const symbol = (holding as CryptoHolding).symbol;
    if (!CRYPTO_CODE_SET.has(symbol)) continue;
    const amount = Number((holding as CryptoHolding).amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    bySymbol.set(symbol, Number(((bySymbol.get(symbol) ?? 0) + amount).toFixed(8)));
  }
  return [...bySymbol.entries()].map(([symbol, amount]) => ({ symbol, amount }));
}

/**
 * Total fiat (USD) valuation of crypto holdings. `rates` are "coins per 1 USD",
 * so the USD value of an amount is `amount / rate`.
 */
export function cryptoHoldingsTotalUsd(
  holdings: CryptoHolding[] | undefined,
  rates: Record<CurrencyCode, number>,
): number {
  if (!holdings || holdings.length === 0) return 0;
  const total = holdings.reduce((sum, holding) => {
    const rate = rates[holding.symbol];
    if (!rate) return sum;
    return sum + holding.amount / rate;
  }, 0);
  return Number(total.toFixed(2));
}
