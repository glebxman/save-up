import type { CurrencyCode } from "@finance-twa/shared-types";

const FALLBACK_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  UZS: 12500,
  RUB: 92,
  EUR: 0.92,
  KZT: 450,
  TRY: 32,
  GBP: 0.79,
  CNY: 7.23,
};

let cachedRates: Record<CurrencyCode, number> | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 60;

let activeFetchPromise: Promise<{ rates: Record<CurrencyCode, number>; updatedAt: number }> | null = null;

export async function getExchangeRates(force = false): Promise<{ rates: Record<CurrencyCode, number>; updatedAt: number }> {
  const now = Date.now();

  if (!force && cachedRates && (now - lastFetchTime < CACHE_TTL)) {
    return { rates: cachedRates, updatedAt: lastFetchTime };
  }

  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      const response = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=USD");

      if (!response.ok) {
        throw new Error(`Coinbase API responded with HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data && data.data && data.data.rates) {
        const rates: Partial<Record<CurrencyCode, number>> = {};
        const codes: CurrencyCode[] = ["USD", "UZS", "RUB", "EUR", "KZT", "TRY", "GBP", "CNY"];

        for (const code of codes) {
          const value = data.data.rates[code];
          rates[code] = value ? parseFloat(value) : FALLBACK_RATES[code];
        }

        cachedRates = rates as Record<CurrencyCode, number>;
        lastFetchTime = now;
        return { rates: cachedRates, updatedAt: lastFetchTime };
      }
    } catch (error) {
      console.error("Failed to fetch exchange rates:", error);
    } finally {
      activeFetchPromise = null;
    }

    return {
      rates: cachedRates || FALLBACK_RATES,
      updatedAt: lastFetchTime || now
    };
  })();

  return activeFetchPromise;
}

