import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import * as api from "@/api/methods";
import type { RecurringTransactionPayload } from "@/types/finance";

import { useFinanceContext } from "./_internal";

export function useRecurringMutations() {
  const { initData, syncStatus, invalidateRelated, notifySuccess, notifyError } = useFinanceContext();
  const { t } = useTranslation();

  const saveRecurringTransactionMutation = useMutation({
    mutationFn: (template: RecurringTransactionPayload) =>
      api.saveRecurringTransaction(initData, template),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.recurringSaved"));
    },
    onError: (error) => notifyError(error),
  });

  const deleteRecurringTransactionMutation = useMutation({
    mutationFn: ({ templateId }: { templateId: string }) =>
      api.deleteRecurringTransaction(initData, templateId),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.recurringDeleted"));
    },
    onError: (error) => notifyError(error),
  });

  const applyRecurringTransactionMutation = useMutation({
    mutationFn: ({ templateId }: { templateId: string }) =>
      api.applyRecurringTransaction(initData, templateId),
    onSuccess: (status) => {
      syncStatus(status);
      invalidateRelated();
      notifySuccess(t("feedback.recurringApplied"));
    },
    onError: (error) => notifyError(error),
  });

  return {
    saveRecurringTransactionMutation,
    deleteRecurringTransactionMutation,
    applyRecurringTransactionMutation,
  };
}
