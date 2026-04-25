import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  FunnelIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { ConfirmActionModal } from "@/components/features/shared/ConfirmActionModal";
import { EXPENSE_CATEGORIES } from "@/components/features/shared/categoryMeta";
import { Button, Card, CardContent, Chip, Input, Select, Spinner } from "@/components/ui";
import { useFinance } from "@/hooks/useFinance";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import type { ExpenseCategory, Transaction, TransactionFilters, TransactionType } from "@/types/finance";
import { formatDateTime, formatMoney } from "@/utils/format";
import { TransactionEditModal } from "./TransactionEditModal";

const ALL_CATEGORY_KEY = "__all_categories__";

const transactionTypes: Array<TransactionType | "all"> = [
  "all",
  "income",
  "expense",
  "transfer_to_savings",
  "transfer_from_savings",
];

function getCurrentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getAmountTone(type: TransactionType): string {
  if (type === "income" || type === "transfer_from_savings") {
    return "text-[var(--accent)]";
  }

  return "text-[var(--danger)]";
}

export function TransactionHistoryView() {
  const { t } = useTranslation();
  const {
    updateTransactionMutation,
    archiveTransactionMutation,
    restoreTransactionMutation,
  } = useFinance();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [confirmingTransaction, setConfirmingTransaction] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TransactionFilters>({
    monthKey: getCurrentMonthKey(),
    type: "all",
    category: "all",
    search: "",
    includeDeleted: false,
  });
  const historyQuery = useTransactionHistory(filters);
  const activeTransactionId = archiveTransactionMutation.isPending
    ? (archiveTransactionMutation.variables?.transactionId ?? null)
    : restoreTransactionMutation.isPending
      ? (restoreTransactionMutation.variables?.transactionId ?? null)
        : updateTransactionMutation.isPending
          ? (updateTransactionMutation.variables?.transactionId ?? null)
          : null;

  const items = historyQuery.data ?? [];
  const itemCount = items.length;
  const visibleIncome = useMemo(
    () => items
      .filter((item) => !item.deletedAt && (item.type === "income" || item.type === "transfer_from_savings"))
      .reduce((sum, item) => sum + item.amount, 0),
    [items],
  );
  const visibleSpending = useMemo(
    () => items
      .filter((item) => !item.deletedAt && (item.type === "expense" || item.type === "transfer_to_savings"))
      .reduce((sum, item) => sum + item.amount, 0),
    [items],
  );
  const isInitialLoading = historyQuery.isPending && !historyQuery.data;
  const isRefreshing = historyQuery.isFetching && !!historyQuery.data;
  const categorySelectKey = filters.category === "all" ? ALL_CATEGORY_KEY : (filters.category ?? ALL_CATEGORY_KEY);

  return (
    <>
      <Card variant="default">
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="m-0 text-sm text-[var(--muted)]">{t("history.caption")}</p>
                <p className="m-0 mt-1 text-lg font-semibold text-[var(--foreground)]">{t("history.title")}</p>
              </div>
              <Chip color="accent" size="sm" variant="primary">
                {t("history.count", { count: itemCount })}
              </Chip>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Card variant="secondary">
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-xs text-[var(--muted)]">{t("monthReport.income")}</p>
                      <p className="m-0 mt-1 text-lg font-semibold text-[var(--foreground)]">{formatMoney(visibleIncome)}</p>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--accent)]">
                      <ArrowTrendingUpIcon className="h-5 w-5" />
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card variant="secondary">
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="m-0 text-xs text-[var(--muted)]">{t("monthReport.spending")}</p>
                      <p className="m-0 mt-1 text-lg font-semibold text-[var(--foreground)]">{formatMoney(visibleSpending)}</p>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--danger)]">
                      <ArrowTrendingDownIcon className="h-5 w-5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card variant="secondary">
              <CardContent>
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-sm text-[var(--muted)]">
                      {t("history.month")}
                      <Input
                        fullWidth
                        onChange={(event) => setFilters((current) => ({ ...current, monthKey: event.target.value }))}
                        type="month"
                        value={filters.monthKey ?? ""}
                        variant="secondary"
                      />
                    </label>

                    <label className="text-sm text-[var(--muted)]">
                      {t("history.search")}
                      <Input
                        fullWidth
                        onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                        placeholder={t("history.searchPlaceholder")}
                        value={filters.search ?? ""}
                        variant="secondary"
                      />
                    </label>
                  </div>

                  <div className="grid gap-2">
                    <span className="text-sm text-[var(--muted)]">{t("history.type")}</span>
                    <div className="flex flex-wrap gap-2">
                      {transactionTypes.map((type) => (
                        <Button
                          key={type}
                          onPress={() => setFilters((current) => ({ ...current, type }))}
                          size="sm"
                          variant={filters.type === type ? "primary" : "secondary"}
                        >
                          {type === "all" ? t("history.allTypes") : t(`transactionType.${type}`)}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onPress={() => setShowFilters((prev) => !prev)}
                    size="sm"
                    variant="secondary"
                  >
                    <FunnelIcon className="h-4 w-4" />
                    {showFilters ? t("history.hideFilters") : t("history.showFilters")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {showFilters && (
              <Card variant="secondary">
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="text-sm text-[var(--muted)]">
                      {t("history.category")}
                    <Select
                      aria-label={t("history.category")}
                      fullWidth
                      onChange={(event) =>
                        setFilters((current) => ({
                          ...current,
                          category: event.target.value === ALL_CATEGORY_KEY ? "all" : (event.target.value as ExpenseCategory),
                        }))}
                        value={categorySelectKey}
                        variant="secondary"
                      >
                        {[ALL_CATEGORY_KEY, ...EXPENSE_CATEGORIES].map((category) => (
                          <option key={category} value={category}>
                            {category === ALL_CATEGORY_KEY ? t("history.allCategories") : t(`expenseCategory.${category}`)}
                          </option>
                        ))}
                      </Select>
                    </label>

                    <Button
                      className="self-end"
                      onPress={() => setFilters((current) => ({ ...current, includeDeleted: !current.includeDeleted }))}
                      size="sm"
                      variant={filters.includeDeleted ? "primary" : "secondary"}
                    >
                      {t("history.showArchived")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {isRefreshing ? (
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <Spinner size="sm" />
                <span>{t("history.loading")}</span>
              </div>
            ) : null}

            {historyQuery.isError ? (
              <Card variant="secondary">
                <CardContent>
                  <p className="m-0 text-sm text-[var(--muted)]">{historyQuery.error.message}</p>
                </CardContent>
              </Card>
            ) : isInitialLoading ? (
              <Card variant="secondary">
                <CardContent>
                  <div className="flex items-center gap-3 py-4">
                    <Spinner size="sm" />
                    <span className="text-sm text-[var(--muted)]">{t("history.loading")}</span>
                  </div>
                </CardContent>
              </Card>
            ) : items.length ? (
              <div className="space-y-2">
                {items.map((transaction) => {
                  const isActive = activeTransactionId === transaction.id;

                  return (
                    <Card key={transaction.id} variant="secondary">
                      <CardContent>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="m-0 text-sm font-semibold text-[var(--foreground)]">
                                {t(`transactionType.${transaction.type}`)}
                              </p>
                              {transaction.deletedAt ? (
                                <Chip color="warning" size="sm" variant="primary">
                                  {t("history.archived")}
                                </Chip>
                              ) : null}
                            </div>

                            <p className="m-0 mt-1 text-xs text-[var(--muted)]">{formatDateTime(transaction.occurredAt)}</p>
                            {transaction.category ? (
                              <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">{t(`expenseCategory.${transaction.category}`)}</p>
                            ) : null}
                            {transaction.note ? (
                              <p className="m-0 mt-1.5 text-sm text-[var(--foreground)]">{transaction.note}</p>
                            ) : null}
                          </div>

                          <strong className={`text-sm font-semibold ${getAmountTone(transaction.type)}`}>
                            {formatMoney(transaction.amount)}
                          </strong>
                        </div>

                        <div className="mt-3">
                          {transaction.deletedAt ? (
                            <Button
                              className="w-full"
                              isDisabled={isActive}
                              onPress={() => setConfirmingTransaction(transaction)}
                              size="sm"
                              variant="primary"
                            >
                              {t("history.restore")}
                            </Button>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                className="w-full"
                                isDisabled={isActive}
                                onPress={() => setEditingTransaction(transaction)}
                                size="sm"
                                variant="secondary"
                              >
                                {t("history.edit")}
                              </Button>

                              <Button
                                className="w-full"
                                isDisabled={isActive}
                                onPress={() => setConfirmingTransaction(transaction)}
                                size="sm"
                                variant="danger-soft"
                              >
                                {t("history.archive")}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card variant="secondary">
                <CardContent>
                  <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)]">
                      <InboxIcon className="h-6 w-6" />
                    </span>
                    <p className="m-0 text-sm text-[var(--muted)]">{t("history.empty")}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <TransactionEditModal
        isOpen={!!editingTransaction}
        isPending={updateTransactionMutation.isPending}
        onClose={() => setEditingTransaction(null)}
        onSubmit={(payload) => {
          void updateTransactionMutation.mutateAsync(payload).then(() => setEditingTransaction(null));
        }}
        transaction={editingTransaction}
      />

      <ConfirmActionModal
        cancelLabel={t("common.cancel")}
        confirmLabel={confirmingTransaction?.deletedAt ? t("history.restore") : t("history.archive")}
        description={
          confirmingTransaction?.deletedAt
            ? t("history.restoreDescription")
            : t("history.archiveDescription")
        }
        isOpen={!!confirmingTransaction}
        isPending={archiveTransactionMutation.isPending || restoreTransactionMutation.isPending}
        onClose={() => setConfirmingTransaction(null)}
        onConfirm={() => {
          if (!confirmingTransaction) {
            return;
          }

          if (confirmingTransaction.deletedAt) {
            void restoreTransactionMutation
              .mutateAsync({ transactionId: confirmingTransaction.id })
              .then(() => setConfirmingTransaction(null));
            return;
          }

          void archiveTransactionMutation
            .mutateAsync({ transactionId: confirmingTransaction.id })
            .then(() => setConfirmingTransaction(null));
        }}
        question={
          confirmingTransaction?.deletedAt
            ? t("history.restoreQuestion")
            : t("history.archiveQuestion")
        }
        title={confirmingTransaction?.deletedAt ? t("history.restore") : t("history.archive")}
      />
    </>
  );
}
