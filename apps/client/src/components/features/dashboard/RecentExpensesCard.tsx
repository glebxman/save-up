import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { ExpenseTransaction } from "@/types/finance";
import { formatMoney } from "@/utils/format";

const expenseCategories = new Set([
  "food",
  "taxi",
  "entertainment",
  "shopping",
  "utilities",
  "health",
  "education",
  "other",
] as const);

interface RecentExpensesCardProps {
  expenses: ExpenseTransaction[];
  isLoading?: boolean;
  activeTransactionId?: string | null;
  onEdit: (expense: ExpenseTransaction) => void;
  onUndo: (expense: ExpenseTransaction) => void;
}

function formatExpenseTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getExpenseCategoryKey(value: string | null | undefined): string {
  return value && expenseCategories.has(value as typeof expenseCategories extends Set<infer T> ? T : never)
    ? value
    : "other";
}

export function RecentExpensesCard({
  expenses,
  isLoading,
  activeTransactionId,
  onEdit,
  onUndo,
}: RecentExpensesCardProps) {
  const { t } = useTranslation();

  return (
    <Card variant="default">
      <CardHeader>
        <div>
          <CardDescription>{t("recentExpenses.caption")}</CardDescription>
          <CardTitle>{t("recentExpenses.title")}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && expenses.length === 0 ? (
          <div className="flex items-center gap-3 py-3">
            <Spinner size="sm" />
            <span className="text-sm text-[var(--muted)]">{t("recentExpenses.loading")}</span>
          </div>
        ) : expenses.length === 0 ? (
          <p className="m-0 text-sm text-[var(--muted)]">{t("recentExpenses.empty")}</p>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => {
              const isActive = activeTransactionId === expense.id;

              return (
                <Card key={expense.id} variant="default">
                  <CardContent className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="m-0 text-sm font-semibold text-[var(--foreground)]">
                          {t(`expenseCategory.${getExpenseCategoryKey(expense.category)}`)}
                        </p>
                        <p className="m-0 mt-1 text-xs text-[var(--muted)]">{formatExpenseTime(expense.createdAt)}</p>
                      </div>

                      <strong className="text-sm font-semibold text-[var(--foreground)]">
                        {formatMoney(expense.amount)}
                      </strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        className="w-full"
                        isDisabled={isActive}
                        onPress={() => onEdit(expense)}
                        variant="secondary"
                      >
                        {t("recentExpenses.changeCategory")}
                      </Button>
                      <Button
                        className="w-full"
                        isDisabled={isActive}
                        onPress={() => onUndo(expense)}
                        variant="danger-soft"
                      >
                        {t("recentExpenses.undo")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
