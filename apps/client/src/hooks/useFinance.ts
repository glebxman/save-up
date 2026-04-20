import { startTransition } from "react";

import type { SavingsPct, Status } from "@/types/finance";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "../api/methods";
import { useFinanceStore } from "../stores/finance.store";
import { useTelegram } from "./useTelegram";

function getDaysRemaining(now = new Date()): number {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  return Math.max(lastDay - now.getDate() + 1, 1);
}

function computeDailyLimit(balance: number): Status["dailyLimit"] {
  const daysRemaining = getDaysRemaining();

  return {
    daysRemaining,
    dailyLimit: Number((balance / daysRemaining).toFixed(2)),
  };
}

export function useFinance() {
  const queryClient = useQueryClient();
  const { initData, user, hapticFeedback } = useTelegram();
  const optimisticStatus = useFinanceStore((state) => state.optimisticStatus);
  const setOptimisticStatus = useFinanceStore((state) => state.setOptimisticStatus);
  const telegramId = user?.id ?? Number(import.meta.env.VITE_DEMO_TELEGRAM_ID ?? 1);
  const statusKey = ["status", telegramId] as const;
  const reportKey = ["report", telegramId] as const;

  const statusQuery = useQuery({
    queryKey: statusKey,
    enabled: !!initData,
    queryFn: () => api.initUser(initData),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const reportQuery = useQuery({
    queryKey: reportKey,
    enabled: !!initData,
    queryFn: () => api.getReport(initData),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const liveStatus = optimisticStatus ?? statusQuery.data ?? null;

  function syncStatus(status: Status): void {
    startTransition(() => {
      setOptimisticStatus(null);
      queryClient.setQueryData(statusKey, status);
    });
  }

  const addIncomeMutation = useMutation({
    mutationFn: ({ amount, savingsPct }: { amount: number; savingsPct: SavingsPct }) =>
      api.addIncome(initData, amount, savingsPct),
    onMutate: async ({ amount, savingsPct }) => {
      const current = queryClient.getQueryData<Status>(statusKey) ?? liveStatus;

      if (!current) {
        return { previous: null };
      }

      const savingsAmt = Number((amount * (savingsPct / 100)).toFixed(2));
      const balance = Number((current.user.balance + amount - savingsAmt).toFixed(2));
      const savings = Number((current.user.savings + savingsAmt).toFixed(2));

      setOptimisticStatus({
        ...current,
        user: {
          ...current.user,
          balance,
          savings,
          savingsPct,
        },
        dailyLimit: computeDailyLimit(balance),
      });

      return { previous: current };
    },
    onError: (_error, _variables, context) => {
      setOptimisticStatus(context?.previous ?? null);
      hapticFeedback?.notificationOccurred("error");
    },
    onSuccess: (status) => {
      hapticFeedback?.notificationOccurred("success");
      syncStatus(status);
      queryClient.invalidateQueries({ queryKey: reportKey }).catch(() => undefined);
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: ({ amount }: { amount: number }) => api.addExpense(initData, amount),
    onMutate: async ({ amount }) => {
      const current = queryClient.getQueryData<Status>(statusKey) ?? liveStatus;

      if (!current) {
        return { previous: null };
      }

      const balance = Number((current.user.balance - amount).toFixed(2));
      const monthlyExp = Number((current.user.monthlyExp + amount).toFixed(2));

      setOptimisticStatus({
        ...current,
        user: {
          ...current.user,
          balance,
          monthlyExp,
        },
        dailyLimit: computeDailyLimit(balance),
      });

      return { previous: current };
    },
    onError: (_error, _variables, context) => {
      setOptimisticStatus(context?.previous ?? null);
      hapticFeedback?.notificationOccurred("error");
    },
    onSuccess: (status) => {
      hapticFeedback?.impactOccurred("medium");
      syncStatus(status);
      queryClient.invalidateQueries({ queryKey: reportKey }).catch(() => undefined);
    },
  });

  const newMonthMutation = useMutation({
    mutationFn: () => api.newMonth(initData),
    onSuccess: (status) => {
      syncStatus(status);
      queryClient.invalidateQueries({ queryKey: reportKey }).catch(() => undefined);
    },
  });

  return {
    telegramId,
    status: liveStatus,
    report: reportQuery.data,
    statusQuery,
    reportQuery,
    addIncomeMutation,
    addExpenseMutation,
    newMonthMutation,
  };
}
