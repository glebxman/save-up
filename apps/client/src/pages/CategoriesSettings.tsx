import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { ConfirmActionModal } from "@/components/features/shared/ConfirmActionModal";
import {
  categoryMeta,
  EXPENSE_CATEGORIES,
} from "@/components/features/shared/categoryMeta";
import { CategoryEditModal } from "@/components/features/settings/CategoryEditModal";
import { CategoryLimitsModal } from "@/components/features/settings/CategoryLimitsModal";
import { NewCategoryModal } from "@/components/features/settings/NewCategoryModal";
import { ChevronRightIcon } from "@/components/layout/icons";
import { Button, Card, CardContent } from "@/components/ui";
import { useFinance } from "@/hooks/useFinance";
import type { ExpenseCategory } from "@/types/finance";
import { MAX_CUSTOM_CATEGORIES } from "@/types/finance";

export function CategoriesSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    status,
    setCategoryCustomizationMutation,
    addCustomCategoryMutation,
    deleteCustomCategoryMutation,
    setCategoryLimitsMutation,
  } = useFinance();

  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const customCategories = status?.user.customCategories ?? [];
  const customizations = status?.user.categoryCustomizations ?? {};
  const limits = status?.user.categoryLimits ?? {};
  const reachedLimit = customCategories.length >= MAX_CUSTOM_CATEGORIES;

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <button
          aria-label={t("common.cancel")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--foreground)] transition active:scale-95"
          onClick={() => navigate("/settings")}
          type="button"
        >
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
        </button>
        <div className="min-w-0">
          <h1 className="m-0 text-[1.5rem] font-semibold tracking-[-0.03em]">
            {t("settings.categories")}
          </h1>
          <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
            {t("settings.categoriesDescription")}
          </p>
        </div>
      </header>

      <Card variant="default">
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {EXPENSE_CATEGORIES.map((key) => {
              const meta = categoryMeta[key];
              const custom = customizations[key];
              const emoji = custom?.emoji;
              const label = custom?.name ?? t(`expenseCategory.${key}`);

              return (
                <button
                  key={key}
                  className="flex flex-col items-center gap-1.5 rounded-[18px] bg-[var(--surface-secondary)] px-2 py-3 text-center transition-opacity active:opacity-70"
                  onClick={() => setEditingCategory(key)}
                  type="button"
                >
                  {emoji ? (
                    <span className="text-2xl leading-none">{emoji}</span>
                  ) : (
                    <meta.icon className={`h-6 w-6 ${meta.color}`} />
                  )}
                  <span className="text-[10px] leading-tight text-[var(--foreground)]">
                    {label}
                  </span>
                </button>
              );
            })}

            {customCategories.map((cat) => (
              <div key={cat.id} className="relative">
                <button
                  className="flex w-full flex-col items-center gap-1.5 rounded-[18px] bg-[var(--surface-secondary)] px-2 py-3 text-center transition-opacity active:opacity-70"
                  onClick={() => setDeletingCategoryId(cat.id)}
                  type="button"
                >
                  <span className="text-2xl leading-none">{cat.emoji}</span>
                  <span className="text-[10px] leading-tight text-[var(--foreground)]">
                    {cat.name}
                  </span>
                </button>
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--danger)] text-[10px] font-bold leading-none text-white">
                  ×
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        <Button
          fullWidth
          isDisabled={reachedLimit}
          onPress={() => setShowNewCategoryModal(true)}
          variant="secondary"
        >
          + {t("settings.addCategory")}
        </Button>
        <Button fullWidth onPress={() => setShowLimitsModal(true)} variant="secondary">
          {t("limits.manage")}
        </Button>
      </div>

      <CategoryEditModal
        category={editingCategory}
        customization={
          editingCategory ? customizations[editingCategory] : undefined
        }
        isOpen={editingCategory !== null}
        isPending={setCategoryCustomizationMutation.isPending}
        onClose={() => setEditingCategory(null)}
        onSave={(category, name, emoji) => {
          setCategoryCustomizationMutation.mutate(
            { category, name, emoji },
            { onSuccess: () => setEditingCategory(null) },
          );
        }}
      />

      <NewCategoryModal
        isOpen={showNewCategoryModal}
        isPending={addCustomCategoryMutation.isPending}
        onClose={() => setShowNewCategoryModal(false)}
        onSave={(name, emoji) => {
          addCustomCategoryMutation.mutate(
            { name, emoji },
            { onSuccess: () => setShowNewCategoryModal(false) },
          );
        }}
      />

      <ConfirmActionModal
        cancelLabel={t("common.cancel")}
        confirmLabel={t("settings.deleteCategory")}
        description={t("settings.deleteCategoryDescription")}
        isOpen={deletingCategoryId !== null}
        isPending={deleteCustomCategoryMutation.isPending}
        onClose={() => {
          if (!deleteCustomCategoryMutation.isPending) setDeletingCategoryId(null);
        }}
        onConfirm={() => {
          if (!deletingCategoryId) return;
          deleteCustomCategoryMutation.mutate(
            { id: deletingCategoryId },
            { onSuccess: () => setDeletingCategoryId(null) },
          );
        }}
        question={t("settings.deleteCategoryQuestion")}
        title={t("settings.deleteCategoryTitle")}
      />

      <CategoryLimitsModal
        customCategories={customCategories}
        customizations={customizations}
        initialLimits={limits}
        isOpen={showLimitsModal}
        isPending={setCategoryLimitsMutation.isPending}
        onClose={() => setShowLimitsModal(false)}
        onSubmit={(values) => {
          setCategoryLimitsMutation.mutate(
            { limits: values },
            { onSuccess: () => setShowLimitsModal(false) },
          );
        }}
      />
    </div>
  );
}
