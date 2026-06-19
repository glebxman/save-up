/**
 * Public API for the finance hook layer.
 *
 * Consumers SHOULD prefer the specific domain hooks below — `useStatus`,
 * `useReports`, `useTransactionMutations`, etc. They keep components from
 * subscribing to mutations they don't use, which cuts re-renders.
 *
 * The aggregated `useFinance(...)` hook is kept for backwards compatibility
 * with the existing pages (Dashboard, Report, Settings). New code should not
 * use it — pull only what you need from the focused hooks.
 */

import { useFinanceContext } from "./_internal";
import { useAccountMutations } from "./useAccount";
import { useNotifications } from "./useNotifications";
import { useRecurringMutations } from "./useRecurring";
import { useReports } from "./useReports";
import { useStatus } from "./useStatus";
import { useSubscription } from "./useSubscription";
import { useTransactionMutations } from "./useTransactions";
import { useUserPreferences } from "./useUserPreferences";
import { useVoice } from "./useVoice";

export { useDebts } from "./useDebts";
export { useAccountMutations } from "./useAccount";
export { useNotifications } from "./useNotifications";
export { useRecurringMutations } from "./useRecurring";
export { useReports } from "./useReports";
export { useStatus } from "./useStatus";
export { useSubscription } from "./useSubscription";
export { useTransactionMutations } from "./useTransactions";
export { useUserPreferences } from "./useUserPreferences";
export { useVoice } from "./useVoice";

interface UseFinanceOptions {
  reportMonthKey?: string;
}

/**
 * Aggregated hook: matches the legacy useFinance(...) shape exactly.
 * Existing callers continue to work unchanged.
 */
export function useFinance(options: UseFinanceOptions = {}) {
  const { telegramId } = useFinanceContext();
  const { statusQuery, status } = useStatus();
  const { reportQuery, breakdownQuery, dailyTrendQuery, report, breakdown, dailyTrend } = useReports({
    monthKey: options.reportMonthKey,
  });
  const transactions = useTransactionMutations();
  const account = useAccountMutations();
  const recurring = useRecurringMutations();
  const prefs = useUserPreferences();
  const notifications = useNotifications();
  const voice = useVoice();
  const subscription = useSubscription();

  return {
    telegramId,
    status,
    report,
    breakdown,
    dailyTrend,
    statusQuery,
    reportQuery,
    breakdownQuery,
    dailyTrendQuery,
    ...transactions,
    ...account,
    ...recurring,
    ...prefs,
    ...notifications,
    ...voice,
    ...subscription,
  };
}
