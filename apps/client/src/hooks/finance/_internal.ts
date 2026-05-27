import { startTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import type { Status } from "@/types/finance";
import { setGlobalRates } from "@/utils/exchange-rates";
import { useFinanceStore } from "@/stores/finance.store";
import { useToastStore } from "@/stores/ui.store";

import { useTelegram } from "../useTelegram";

export interface FinanceContext {
  initData: string;
  telegramId: number;
  statusKey: readonly ["status", number];
  reportBaseKey: readonly ["report", number];
  breakdownBaseKey: readonly ["categoryBreakdown", number];
  dailyTrendBaseKey: readonly ["dailyTrend", number];
  transactionsBaseKey: readonly ["transactions", number];
  /** Read live status (optimistic ?? cached). */
  liveStatus: Status | null;
  /** Apply server status to query cache and clear optimistic copy. */
  syncStatus: (status: Status) => void;
  /** Set optimistic value during a mutation. */
  setOptimisticStatus: (status: Status | null) => void;
  /** Invalidate report/breakdown/trend/transactions queries (status optionally). */
  invalidateRelated: (options?: { refreshStatus?: boolean }) => void;
  notifySuccess: (message: string) => void;
  notifyError: (error: unknown) => void;
}

const errorTranslationKeys = {
  "Operation would make balance negative": "feedback.errors.balanceNegative",
  "Operation would make savings negative": "feedback.errors.savingsNegative",
  "Insufficient balance for expense": "feedback.errors.insufficientBalance",
  "Insufficient balance for transfer": "feedback.errors.insufficientBalance",
  "Insufficient savings for transfer": "feedback.errors.insufficientSavings",
} as const;

function getErrorTranslationKey(message: string): string | undefined {
  return errorTranslationKeys[message as keyof typeof errorTranslationKeys];
}

/**
 * Common context every domain hook needs: initData, query keys, optimistic
 * helpers, notifications. Returned context is intentionally lightweight so
 * each domain hook can call `useFinanceContext()` once.
 */
export function useFinanceContext(): FinanceContext {
  const queryClient = useQueryClient();
  const { initData, user, hapticFeedback } = useTelegram();
  const { t } = useTranslation();
  const pushToast = useToastStore((state) => state.pushToast);
  const optimisticStatus = useFinanceStore((state) => state.optimisticStatus);
  const setOptimisticStatus = useFinanceStore((state) => state.setOptimisticStatus);

  const telegramId = user?.id ?? Number(import.meta.env.VITE_DEMO_TELEGRAM_ID ?? 1);
  const statusKey = ["status", telegramId] as const;
  const reportBaseKey = ["report", telegramId] as const;
  const breakdownBaseKey = ["categoryBreakdown", telegramId] as const;
  const dailyTrendBaseKey = ["dailyTrend", telegramId] as const;
  const transactionsBaseKey = ["transactions", telegramId] as const;

  const liveStatus = optimisticStatus ?? queryClient.getQueryData<Status>(statusKey) ?? null;

  function notifySuccess(message: string): void {
    pushToast({ tone: "success", message });
    hapticFeedback?.notificationOccurred("success");
  }

  function notifyError(error: unknown): void {
    const translationKey = error instanceof Error ? getErrorTranslationKey(error.message) : undefined;
    const message = translationKey ? t(translationKey) : t("feedback.genericError");

    pushToast({ tone: "error", message });
    hapticFeedback?.notificationOccurred("error");
  }

  function syncStatus(status: Status): void {
    startTransition(() => {
      setOptimisticStatus(null);
      queryClient.setQueryData(statusKey, status);
      setGlobalRates(status.rates);
    });
  }

  function invalidateRelated(options?: { refreshStatus?: boolean }): void {
    queryClient.invalidateQueries({ queryKey: reportBaseKey }).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: breakdownBaseKey }).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: dailyTrendBaseKey }).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: transactionsBaseKey }).catch(() => undefined);

    if (options?.refreshStatus) {
      setOptimisticStatus(null);
      queryClient.invalidateQueries({ queryKey: statusKey }).catch(() => undefined);
    }
  }

  return {
    initData,
    telegramId,
    statusKey,
    reportBaseKey,
    breakdownBaseKey,
    dailyTrendBaseKey,
    transactionsBaseKey,
    liveStatus,
    setOptimisticStatus,
    syncStatus,
    invalidateRelated,
    notifySuccess,
    notifyError,
  };
}

/**
 * Compute optimistic daily limit on the client to mirror the server formula.
 * Kept here (single source of truth) so domain hooks don't redefine it.
 */
export function computeDailyLimit(balance: number): Status["dailyLimit"] {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(lastDay - now.getDate() + 1, 1);

  return {
    daysRemaining,
    dailyLimit: Number((balance / daysRemaining).toFixed(2)),
  };
}
