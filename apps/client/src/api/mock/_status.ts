import type { CurrencyCode, Status, User } from "@finance-twa/shared-types";
import { DEFAULT_EXCHANGE_RATES } from "@finance-twa/shared-types";

import { calculateDailyLimit, getMonthKey, roundAmount } from "./_helpers";
import { getTransactionsForUser } from "./_db";
import { cryptoHoldingsTotalUsd } from "@/utils/exchange-rates";

const FALLBACK_RATES = DEFAULT_EXCHANGE_RATES;

export async function getMockExchangeRates(): Promise<Record<CurrencyCode, number>> {
  try {
    const response = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=USD");
    const data = await response.json();
    if (data && data.data && data.data.rates) {
      const rates: Partial<Record<CurrencyCode, number>> = { ...FALLBACK_RATES };
      const codes: CurrencyCode[] = ["USD", "UZS", "RUB", "EUR", "KZT", "TRY", "GBP", "CNY", "BTC", "ETH", "TON", "USDT"];
      for (const code of codes) {
        const value = data.data.rates[code];
        rates[code] = value ? parseFloat(value) : FALLBACK_RATES[code];
      }
      return rates as Record<CurrencyCode, number>;
    }
  } catch (error) {
    console.error("Mock: Failed to fetch exchange rates:", error);
  }
  return FALLBACK_RATES;
}

export async function buildStatus(user: User): Promise<Status> {
  const monthlyExp = getTransactionsForUser(user.telegramId)
    .filter((tx) => !tx.deletedAt && tx.type === "expense" && tx.monthKey === getMonthKey())
    .reduce((sum, tx) => roundAmount(sum + tx.amount), 0);

  const rates = await getMockExchangeRates();

  // Crypto accounts derive their balance (in USD) from their holdings, valued
  // at the latest rates. Cash/card accounts keep their stored balance.
  const accounts = (user.accounts ?? []).map((acc) =>
    acc.type === "crypto"
      ? { ...acc, balance: roundAmount(cryptoHoldingsTotalUsd(acc.holdings, rates)) }
      : acc,
  );

  const nextUser: User = { ...user, monthlyExp, accounts };

  return {
    user: nextUser,
    dailyLimit: calculateDailyLimit(nextUser.balance),
    rates,
    ratesUpdatedAt: new Date().toISOString(),
  };
}

export function getLedgerBalanceForUser(telegramId: number): number {
  // re-import to avoid circular deps for getTransactionImpact
  const txs = getTransactionsForUser(telegramId).filter((t) => !t.deletedAt);
  let total = 0;
  for (const tx of txs) {
    if (tx.type === "income") total = roundAmount(total + tx.amount - (tx.savingsAmt ?? 0));
    else if (tx.type === "expense") total = roundAmount(total - tx.amount);
    else if (tx.type === "transfer_to_savings") total = roundAmount(total - tx.amount);
    else if (tx.type === "transfer_from_savings") total = roundAmount(total + tx.amount);
  }
  return total;
}
