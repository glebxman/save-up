import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import * as api from "@/api/methods";
import type { ExpenseCategory, Status } from "@/types/finance";

import { useFinanceContext } from "./_internal";

/**
 * Mutations that change user preferences (language, categories, limits).
 * Most are status-returning so they pipe through syncStatus.
 */
export function useUserPreferences() {
  const { initData, statusKey, syncStatus, setOptimisticStatus, notifySuccess, notifyError } = useFinanceContext();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const updateLanguageMutation = useMutation({
    mutationFn: (language: string) => api.setLanguage(initData, language),
    onMutate: async (language) => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      const current = queryClient.getQueryData<Status>(statusKey);
      if (!current) return { previous: null };

      setOptimisticStatus({
        ...current,
        user: { ...current.user, language },
      });

      return { previous: current };
    },
    onError: (error, _vars, context) => {
      setOptimisticStatus(context?.previous ?? null);
      notifyError(error);
    },
    onSuccess: (_, language) => {
      const current = queryClient.getQueryData<Status>(statusKey);
      if (current) {
        syncStatus({ ...current, user: { ...current.user, language } });
      }
    },
  });

  const setCategoryCustomizationMutation = useMutation({
    mutationFn: ({ category, name, emoji }: { category: ExpenseCategory; name: string; emoji: string }) =>
      api.setCategoryCustomization(initData, category, name, emoji),
    onMutate: async ({ category, name, emoji }) => {
      await queryClient.cancelQueries({ queryKey: statusKey });
      const current = queryClient.getQueryData<Status>(statusKey);
      if (!current) return { previous: null };

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
    onError: (error, _vars, context) => {
      setOptimisticStatus(context?.previous ?? null);
      notifyError(error);
    },
    onSuccess: (_, { category, name, emoji }) => {
      const current = queryClient.getQueryData<Status>(statusKey);
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
    onError: (error) => notifyError(error),
  });

  const deleteCustomCategoryMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => api.deleteCustomCategory(initData, id),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.categoryDeleted"));
    },
    onError: (error) => notifyError(error),
  });

  const setCategoryLimitsMutation = useMutation({
    mutationFn: ({ limits }: { limits: Record<string, number> }) =>
      api.setCategoryLimits(initData, limits),
    onSuccess: (status) => {
      syncStatus(status);
      notifySuccess(t("feedback.limitsSaved", { defaultValue: "Limits saved" }));
    },
    onError: (error) => notifyError(error),
  });

  return {
    updateLanguageMutation,
    setCategoryCustomizationMutation,
    addCustomCategoryMutation,
    deleteCustomCategoryMutation,
    setCategoryLimitsMutation,
  };
}
