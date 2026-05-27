import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import * as api from "@/api/methods";
import type { Status } from "@/types/finance";

import { computeDailyLimit, useFinanceContext } from "./_internal";

export function useAccountMutations() {
  const { initData, statusKey, syncStatus, setOptimisticStatus, invalidateRelated, notifySuccess, notifyError } = useFinanceContext();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const updateSavingsGoalMutation = useMutation({
    mutationFn: ({ goal }: { goal: number }) => api.updateSavingsGoal(initData, goal),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.goalUpdated"));
    },
    onError: (error) => notifyError(error),
  });

  const updateBalanceMutation = useMutation({
    mutationFn: ({ balance }: { balance: number }) => api.updateBalance(initData, balance),
    onMutate: async ({ balance }) => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      const current = queryClient.getQueryData<Status>(statusKey);
      if (!current) return { previous: null };

      const nextBalance = Number(balance.toFixed(2));
      setOptimisticStatus({
        ...current,
        user: { ...current.user, balance: nextBalance },
        dailyLimit: computeDailyLimit(nextBalance),
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
    },
  });

  const resetAccountDataMutation = useMutation({
    mutationFn: () => api.resetAccountData(initData),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.accountDataReset"));
    },
    onError: (error) => notifyError(error),
  });

  const newMonthMutation = useMutation({
    mutationFn: () => api.newMonth(initData),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("report.newMonthAction"));
    },
    onError: (error) => notifyError(error),
  });

  const convertCurrencyMutation = useMutation({
    mutationFn: ({ rate }: { rate: number }) => api.convertCurrency(initData, rate),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.currencyConverted"));
    },
    onError: (error) => notifyError(error),
  });

  const refreshRatesMutation = useMutation({
    mutationFn: () => api.refreshRates(initData),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.ratesUpdated"));
    },
    onError: (error) => notifyError(error),
  });

  const createAccountMutation = useMutation({
    mutationFn: ({ name, type, currency, initialBalance }: { name: string; type: "cash" | "card" | "crypto"; currency: string; initialBalance: number }) =>
      api.createAccount(initData, name, type, currency, initialBalance),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.accountCreated", { defaultValue: "Account created successfully" }));
    },
    onError: (error) => notifyError(error),
  });

  const updateAccountMutation = useMutation({
    mutationFn: ({ accountId, name }: { accountId: string; name: string }) =>
      api.updateAccount(initData, accountId, name),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.accountUpdated", { defaultValue: "Account updated successfully" }));
    },
    onError: (error) => notifyError(error),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: ({ accountId }: { accountId: string }) =>
      api.deleteAccount(initData, accountId),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.accountDeleted", { defaultValue: "Account deleted successfully" }));
    },
    onError: (error) => notifyError(error),
  });

  const transferBetweenAccountsMutation = useMutation({
    mutationFn: (params: { fromAccountId: string; toAccountId: string; amount: number; toAmount?: number }) =>
      api.transferBetweenAccounts(initData, params),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.transferSuccess", { defaultValue: "Transfer completed successfully" }));
    },
    onError: (error) => notifyError(error),
  });

  return {
    updateSavingsGoalMutation,
    updateBalanceMutation,
    resetAccountDataMutation,
    newMonthMutation,
    convertCurrencyMutation,
    refreshRatesMutation,
    createAccountMutation,
    updateAccountMutation,
    deleteAccountMutation,
    transferBetweenAccountsMutation,
  };
}
