import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { Debt } from "@finance-twa/shared-types";

import * as api from "@/api/methods";

import { useFinanceContext } from "./_internal";

type DebtDirection = Debt["direction"];

interface AddDebtInput {
  name: string;
  amount: number;
  direction: DebtDirection;
  note?: string;
  dueDate?: string;
}

function summarizeDebts(debts: Debt[]) {
  const owedToMe: Debt[] = [];
  const iOwe: Debt[] = [];
  let totalOwedToMe = 0;
  let totalIOwe = 0;

  for (const debt of debts) {
    if (debt.direction === "owed_to_me") {
      owedToMe.push(debt);
      totalOwedToMe += debt.amount;
    } else {
      iOwe.push(debt);
      totalIOwe += debt.amount;
    }
  }

  return {
    owedToMe,
    iOwe,
    totalOwedToMe,
    totalIOwe,
    net: totalOwedToMe - totalIOwe,
  };
}

export function useDebts() {
  const { initData, telegramId, notifyError, notifySuccess } = useFinanceContext();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const debtsKey = ["debts", telegramId] as const;

  const debtsQuery = useQuery({
    queryKey: debtsKey,
    enabled: !!initData,
    queryFn: () => api.getDebts(initData),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const debts = debtsQuery.data ?? [];
  const summary = useMemo(() => summarizeDebts(debts), [debts]);

  const addDebtMutation = useMutation({
    mutationFn: (input: AddDebtInput) =>
      api.addDebt(
        initData,
        input.name,
        input.amount,
        input.direction,
        input.note,
        input.dueDate,
      ),
    onSuccess: (debt) => {
      queryClient.setQueryData<Debt[]>(debtsKey, (current = []) => [
        debt,
        ...current.filter((item) => item.id !== debt.id),
      ]);
      notifySuccess(t("debts.addSuccess"));
    },
    onError: (error) => notifyError(error),
  });

  const settleDebtMutation = useMutation({
    mutationFn: (debtId: string) => api.settleDebt(initData, debtId),
    onMutate: async (debtId) => {
      await queryClient.cancelQueries({ queryKey: debtsKey });
      const previous = queryClient.getQueryData<Debt[]>(debtsKey);
      queryClient.setQueryData<Debt[]>(debtsKey, (current = []) =>
        current.filter((debt) => debt.id !== debtId),
      );
      return { previous };
    },
    onSuccess: () => notifySuccess(t("debts.settleSuccess")),
    onError: (error, _debtId, context) => {
      queryClient.setQueryData(debtsKey, context?.previous);
      notifyError(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: debtsKey }).catch(() => undefined);
    },
  });

  const deleteDebtMutation = useMutation({
    mutationFn: (debtId: string) => api.deleteDebt(initData, debtId),
    onMutate: async (debtId) => {
      await queryClient.cancelQueries({ queryKey: debtsKey });
      const previous = queryClient.getQueryData<Debt[]>(debtsKey);
      queryClient.setQueryData<Debt[]>(debtsKey, (current = []) =>
        current.filter((debt) => debt.id !== debtId),
      );
      return { previous };
    },
    onSuccess: () => notifySuccess(t("debts.deleteSuccess")),
    onError: (error, _debtId, context) => {
      queryClient.setQueryData(debtsKey, context?.previous);
      notifyError(error);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: debtsKey }).catch(() => undefined);
    },
  });

  return {
    debts,
    debtsQuery,
    ...summary,
    addDebtMutation,
    settleDebtMutation,
    deleteDebtMutation,
  };
}
