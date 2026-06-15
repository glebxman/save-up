import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import * as api from "@/api/methods";
import type {
  SavingsTransferDirection,
  Status,
  TransactionUpdatePayload,
} from "@/types/finance";

import { computeDailyLimit, useFinanceContext } from "./_internal";

/**
 * Optimistic update helper: snapshot the current status, mutate it locally,
 * and roll back on error. All five money-changing mutations share this shape.
 */
function useOptimisticContext() {
  const queryClient = useQueryClient();
  const ctx = useFinanceContext();

  return {
    ...ctx,
    snapshot(): Status | null {
      return queryClient.getQueryData<Status>(ctx.statusKey) ?? ctx.liveStatus;
    },
  };
}

export function useTransactionMutations() {
  const { initData, statusKey, syncStatus, setOptimisticStatus, invalidateRelated, notifySuccess, notifyError } = useFinanceContext();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const addIncomeMutation = useMutation({
    mutationFn: (variables: { amount: number; savingsAmt: number; note?: string | null; occurredAt?: string; accountId?: string }) =>
      api.addIncome(initData, variables.amount, variables.savingsAmt, variables.note, variables.occurredAt, variables.accountId),
    onMutate: async ({ amount, savingsAmt, accountId }) => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      const current = queryClient.getQueryData<Status>(statusKey);
      if (!current) return { previous: null };

      const balance = Number((current.user.balance + amount - savingsAmt).toFixed(2));
      const savings = Number((current.user.savings + savingsAmt).toFixed(2));

      const nextAccounts = current.user.accounts?.map((acc) => {
        if (acc.id === accountId) {
          return {
            ...acc,
            balance: Number((acc.balance + amount - savingsAmt).toFixed(8)),
          };
        }
        return acc;
      }) ?? [];

      setOptimisticStatus({
        ...current,
        user: { ...current.user, balance, savings, accounts: nextAccounts },
        dailyLimit: computeDailyLimit(balance),
      });

      return { previous: current };
    },
    onError: (error, _vars, context) => {
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
    mutationFn: (variables: { amount: number; category: string; note?: string | null; occurredAt?: string; accountId?: string }) =>
      api.addExpense(initData, variables.amount, variables.category, variables.note, variables.occurredAt, variables.accountId),
    onMutate: async ({ amount, accountId }) => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      const current = queryClient.getQueryData<Status>(statusKey);
      if (!current) return { previous: null };

      const balance = Number((current.user.balance - amount).toFixed(2));
      const monthlyExp = Number((current.user.monthlyExp + amount).toFixed(2));

      const nextAccounts = current.user.accounts?.map((acc) => {
        if (acc.id === accountId) {
          return {
            ...acc,
            balance: Number((acc.balance - amount).toFixed(8)),
          };
        }
        return acc;
      }) ?? [];

      setOptimisticStatus({
        ...current,
        user: { ...current.user, balance, monthlyExp, accounts: nextAccounts },
        dailyLimit: computeDailyLimit(balance),
      });

      return { previous: current };
    },
    onError: (error, _vars, context) => {
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
    mutationFn: (variables: { amount: number; direction: SavingsTransferDirection; note?: string | null; occurredAt?: string; accountId?: string }) =>
      api.transferSavings(initData, variables.amount, variables.direction, variables.note, variables.occurredAt, variables.accountId),
    onMutate: async ({ amount, direction, accountId }) => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      const current = queryClient.getQueryData<Status>(statusKey);
      if (!current) return { previous: null };

      const balanceDelta = direction === "to_savings" ? -amount : amount;
      const savingsDelta = direction === "to_savings" ? amount : -amount;
      const balance = Number((current.user.balance + balanceDelta).toFixed(2));
      const savings = Number((current.user.savings + savingsDelta).toFixed(2));

      const nextAccounts = current.user.accounts?.map((acc) => {
        if (acc.id === accountId) {
          return {
            ...acc,
            balance: Number((acc.balance + balanceDelta).toFixed(8)),
          };
        }
        return acc;
      }) ?? [];

      setOptimisticStatus({
        ...current,
        user: { ...current.user, balance, savings, accounts: nextAccounts },
        dailyLimit: computeDailyLimit(balance),
      });

      return { previous: current };
    },
    onError: (error, _vars, context) => {
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
    onError: (error) => notifyError(error),
  });

  const archiveTransactionMutation = useMutation({
    mutationFn: ({ transactionId }: { transactionId: string }) => api.archiveTransaction(initData, transactionId),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.transactionArchived"));
    },
    onError: (error) => notifyError(error),
  });

  const restoreTransactionMutation = useMutation({
    mutationFn: ({ transactionId }: { transactionId: string }) => api.restoreTransaction(initData, transactionId),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.transactionRestored"));
    },
    onError: (error) => notifyError(error),
  });

  return {
    addIncomeMutation,
    addExpenseMutation,
    transferSavingsMutation,
    updateTransactionMutation,
    archiveTransactionMutation,
    restoreTransactionMutation,
  };
}
