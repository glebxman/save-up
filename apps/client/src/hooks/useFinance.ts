import { startTransition } from "react";

import type {
  ExpenseCategory,
  RecurringTransactionPayload,
  SavingsTransferDirection,
  Status,
  TransactionUpdatePayload,
} from "@/types/finance";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import * as api from "../api/methods";
import { useFinanceStore } from "../stores/finance.store";
import { useToastStore } from "../stores/ui.store";
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
  const { t } = useTranslation();
  const pushToast = useToastStore((state) => state.pushToast);
  const optimisticStatus = useFinanceStore((state) => state.optimisticStatus);
  const setOptimisticStatus = useFinanceStore((state) => state.setOptimisticStatus);
  const telegramId = user?.id ?? Number(import.meta.env.VITE_DEMO_TELEGRAM_ID ?? 1);
  const statusKey = ["status", telegramId] as const;
  const reportKey = ["report", telegramId] as const;
  const breakdownKey = ["categoryBreakdown", telegramId] as const;
  const transactionsBaseKey = ["transactions", telegramId] as const;

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

  const breakdownQuery = useQuery({
    queryKey: breakdownKey,
    enabled: !!initData,
    queryFn: () => api.getCategoryBreakdown(initData),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const liveStatus = optimisticStatus ?? statusQuery.data ?? null;

  function notifySuccess(message: string): void {
    pushToast({ tone: "success", message });
    hapticFeedback?.notificationOccurred("success");
  }

  function notifyError(error: unknown): void {
    const message = error instanceof Error ? error.message : t("feedback.genericError");
    pushToast({ tone: "error", message });
    hapticFeedback?.notificationOccurred("error");
  }

  function syncStatus(status: Status): void {
    startTransition(() => {
      setOptimisticStatus(null);
      queryClient.setQueryData(statusKey, status);
    });
  }

  function invalidateRelated(options?: { refreshStatus?: boolean }): void {
    queryClient.invalidateQueries({ queryKey: reportKey }).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: breakdownKey }).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: transactionsBaseKey }).catch(() => undefined);

    if (options?.refreshStatus) {
      setOptimisticStatus(null);
      queryClient.invalidateQueries({ queryKey: statusKey }).catch(() => undefined);
    }
  }

  const addIncomeMutation = useMutation({
    mutationFn: (variables: { amount: number; savingsAmt: number; note?: string | null; occurredAt?: string }) =>
      api.addIncome(initData, variables.amount, variables.savingsAmt, variables.note, variables.occurredAt),
    onMutate: async ({ amount, savingsAmt }) => {
      const current = queryClient.getQueryData<Status>(statusKey) ?? liveStatus;

      if (!current) {
        return { previous: null };
      }

      const balance = Number((current.user.balance + amount - savingsAmt).toFixed(2));
      const savings = Number((current.user.savings + savingsAmt).toFixed(2));

      setOptimisticStatus({
        ...current,
        user: {
          ...current.user,
          balance,
          savings,
        },
        dailyLimit: computeDailyLimit(balance),
      });

      return { previous: current };
    },
    onError: (error, _variables, context) => {
      setOptimisticStatus(context?.previous ?? null);
      notifyError(error);
    },
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.incomeAdded"));
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: (variables: { amount: number; category: ExpenseCategory; note?: string | null; occurredAt?: string }) =>
      api.addExpense(initData, variables.amount, variables.category, variables.note, variables.occurredAt),
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
    onError: (error, _variables, context) => {
      setOptimisticStatus(context?.previous ?? null);
      notifyError(error);
    },
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.expenseAdded"));
    },
  });

  const transferSavingsMutation = useMutation({
    mutationFn: (variables: { amount: number; direction: SavingsTransferDirection; note?: string | null; occurredAt?: string }) =>
      api.transferSavings(initData, variables.amount, variables.direction, variables.note, variables.occurredAt),
    onMutate: async ({ amount, direction }) => {
      const current = queryClient.getQueryData<Status>(statusKey) ?? liveStatus;

      if (!current) {
        return { previous: null };
      }

      const balanceDelta = direction === "to_savings" ? -amount : amount;
      const savingsDelta = direction === "to_savings" ? amount : -amount;
      const balance = Number((current.user.balance + balanceDelta).toFixed(2));
      const savings = Number((current.user.savings + savingsDelta).toFixed(2));

      setOptimisticStatus({
        ...current,
        user: {
          ...current.user,
          balance,
          savings,
        },
        dailyLimit: computeDailyLimit(balance),
      });

      return { previous: current };
    },
    onError: (error, _variables, context) => {
      setOptimisticStatus(context?.previous ?? null);
      notifyError(error);
    },
    onSuccess: (status, variables) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(
        variables.direction === "to_savings"
          ? t("feedback.savingsDeposited")
          : t("feedback.savingsWithdrawn"),
      );
    },
  });

  const updateTransactionMutation = useMutation({
    mutationFn: (payload: TransactionUpdatePayload) => api.updateTransaction(initData, payload),
    onSuccess: () => {
      invalidateRelated({ refreshStatus: true });
      notifySuccess(t("feedback.transactionUpdated"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const archiveTransactionMutation = useMutation({
    mutationFn: ({ transactionId }: { transactionId: string }) => api.archiveTransaction(initData, transactionId),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.transactionArchived"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const restoreTransactionMutation = useMutation({
    mutationFn: ({ transactionId }: { transactionId: string }) => api.restoreTransaction(initData, transactionId),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.transactionRestored"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const updateSavingsGoalMutation = useMutation({
    mutationFn: ({ goal }: { goal: number }) => api.updateSavingsGoal(initData, goal),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.goalUpdated"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const saveRecurringTransactionMutation = useMutation({
    mutationFn: (template: RecurringTransactionPayload) => api.saveRecurringTransaction(initData, template),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.recurringSaved"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const deleteRecurringTransactionMutation = useMutation({
    mutationFn: ({ templateId }: { templateId: string }) => api.deleteRecurringTransaction(initData, templateId),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.recurringDeleted"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const applyRecurringTransactionMutation = useMutation({
    mutationFn: ({ templateId }: { templateId: string }) => api.applyRecurringTransaction(initData, templateId),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.recurringApplied"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const newMonthMutation = useMutation({
    mutationFn: () => api.newMonth(initData),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
    },
  });

  return {
    telegramId,
    status: liveStatus,
    report: reportQuery.data,
    breakdown: breakdownQuery.data,
    statusQuery,
    reportQuery,
    breakdownQuery,
    addIncomeMutation,
    addExpenseMutation,
    transferSavingsMutation,
    updateTransactionMutation,
    archiveTransactionMutation,
    restoreTransactionMutation,
    updateSavingsGoalMutation,
    saveRecurringTransactionMutation,
    deleteRecurringTransactionMutation,
    applyRecurringTransactionMutation,
    newMonthMutation,
  };
}
