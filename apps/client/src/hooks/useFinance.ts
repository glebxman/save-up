import { startTransition, useEffect } from "react";

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
import { syncLanguageFromServer } from "../i18n";
import { setGlobalRates } from "../utils/exchange-rates";
import { useFinanceStore } from "../stores/finance.store";

import { useOnboardingStore } from "../stores/onboarding.store";
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

interface UseFinanceOptions {
  reportMonthKey?: string;
}

export function useFinance(options: UseFinanceOptions = {}) {
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
  const reportKey = [...reportBaseKey, options.reportMonthKey ?? null] as const;
  const breakdownKey = [...breakdownBaseKey, options.reportMonthKey ?? null] as const;
  const transactionsBaseKey = ["transactions", telegramId] as const;

  const statusQuery = useQuery({
    queryKey: statusKey,
    enabled: !!initData,
    queryFn: () => api.initUser(initData),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: 1000 * 60 * 15,
    refetchIntervalInBackground: false,
    retry: 2,
  });


  const reportQuery = useQuery({
    queryKey: reportKey,
    enabled: !!initData,
    queryFn: () => api.getReport(initData, options.reportMonthKey),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const breakdownQuery = useQuery({
    queryKey: breakdownKey,
    enabled: !!initData,
    queryFn: () => api.getCategoryBreakdown(initData, options.reportMonthKey),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (initData) {
      useOnboardingStore.getState().setInitData(initData);
    }
  }, [initData]);

  useEffect(() => {
    if (statusQuery.data) {
      useOnboardingStore.getState().syncFromServer(statusQuery.data.user.onboardingCompleted);
      syncLanguageFromServer(statusQuery.data.user.language);
      setGlobalRates(statusQuery.data.rates);
    }
  }, [statusQuery.data]);


  const liveStatus = optimisticStatus ?? statusQuery.data ?? null;

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
    mutationFn: (variables: { amount: number; category: string; note?: string | null; occurredAt?: string }) =>
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

  const updateBalanceMutation = useMutation({
    mutationFn: ({ balance }: { balance: number }) => api.updateBalance(initData, balance),
    onMutate: async ({ balance }) => {
      const current = queryClient.getQueryData<Status>(statusKey) ?? liveStatus;

      if (!current) {
        return { previous: null };
      }

      const nextBalance = Number(balance.toFixed(2));

      setOptimisticStatus({
        ...current,
        user: {
          ...current.user,
          balance: nextBalance,
        },
        dailyLimit: computeDailyLimit(nextBalance),
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
    },
  });

  const resetAccountDataMutation = useMutation({
    mutationFn: () => api.resetAccountData(initData),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.accountDataReset"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const updateLanguageMutation = useMutation({
    mutationFn: (language: string) => api.setLanguage(initData, language),
    onMutate: async (language) => {
      const current = queryClient.getQueryData<Status>(statusKey) ?? liveStatus;

      if (!current) {
        return { previous: null };
      }

      setOptimisticStatus({
        ...current,
        user: {
          ...current.user,
          language,
        },
      });

      return { previous: current };
    },
    onError: (error, _variables, context) => {
      setOptimisticStatus(context?.previous ?? null);
      notifyError(error);
    },
    onSuccess: (_, language) => {
      const current = queryClient.getQueryData<Status>(statusKey) ?? liveStatus;
      if (current) {
        syncStatus({
          ...current,
          user: {
            ...current.user,
            language,
          },
        });
      }
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
      notifySuccess(t("report.newMonthAction"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const convertCurrencyMutation = useMutation({
    mutationFn: ({ rate }: { rate: number }) => api.convertCurrency(initData, rate),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.currencyConverted"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const refreshRatesMutation = useMutation({
    mutationFn: () => api.refreshRates(initData),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.ratesUpdated"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const processVoiceMutation = useMutation({
    mutationFn: ({ base64Audio }: { base64Audio: string }) => api.processVoice(initData, base64Audio),
    onError: (error) => {
      notifyError(error);
    },
  });

  const setCategoryCustomizationMutation = useMutation({
    mutationFn: ({ category, name, emoji }: { category: ExpenseCategory; name: string; emoji: string }) =>
      api.setCategoryCustomization(initData, category, name, emoji),
    onMutate: async ({ category, name, emoji }) => {
      const current = queryClient.getQueryData<Status>(statusKey) ?? liveStatus;

      if (!current) {
        return { previous: null };
      }

      setOptimisticStatus({
        ...current,
        user: {
          ...current.user,
          categoryCustomizations: {
            ...current.user.categoryCustomizations,
            [category]: { name: name.trim() || undefined, emoji: emoji.trim() || undefined },
          },
        },
      });

      return { previous: current };
    },
    onError: (error, _variables, context) => {
      setOptimisticStatus(context?.previous ?? null);
      notifyError(error);
    },
    onSuccess: (_result, { category, name, emoji }) => {
      const current = queryClient.getQueryData<Status>(statusKey) ?? liveStatus;
      if (current) {
        syncStatus({
          ...current,
          user: {
            ...current.user,
            categoryCustomizations: {
              ...current.user.categoryCustomizations,
              [category]: { name: name.trim() || undefined, emoji: emoji.trim() || undefined },
            },
          },
        });
      }
      notifySuccess(t("settings.categorySaved"));
    },
  });

  const addCustomCategoryMutation = useMutation({
    mutationFn: ({ name, emoji }: { name: string; emoji: string }) =>
      api.addCustomCategory(initData, name, emoji),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.categoryAdded"));
    },
    onError: (error) => {
      notifyError(error);
    },
  });

  const deleteCustomCategoryMutation = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.deleteCustomCategory(initData, id),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.categoryDeleted"));
    },
    onError: (error) => {
      notifyError(error);
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
    resetAccountDataMutation,
    saveRecurringTransactionMutation,
    deleteRecurringTransactionMutation,
    applyRecurringTransactionMutation,
    newMonthMutation,
    updateBalanceMutation,
    updateLanguageMutation,
    convertCurrencyMutation,
    refreshRatesMutation,
    processVoiceMutation,
    setCategoryCustomizationMutation,
    addCustomCategoryMutation,
    deleteCustomCategoryMutation,
  };

}
