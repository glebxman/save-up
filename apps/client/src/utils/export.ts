import type { TFunction } from "i18next";

import type { Transaction } from "@/types/finance";
import { getCategoryDisplay } from "@/components/features/shared/categoryMeta";
import type { CategoryCustomization, CustomCategory, ExpenseCategory } from "@finance-twa/shared-types";

interface ExportOptions {
  monthKey: string;
  transactions: Transaction[];
  customCategories?: CustomCategory[];
  customizations?: Partial<Record<ExpenseCategory, CategoryCustomization>>;
  t: TFunction;
}

function formatDate(value: string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function exportTransactionsToExcel({
  monthKey,
  transactions,
  customCategories = [],
  customizations = {},
  t,
}: ExportOptions): Promise<void> {
  const XLSX = await import("xlsx");

  const rows = transactions
    .filter((tx) => !tx.deletedAt)
    .map((tx) => {
      const sign = tx.type === "income" || tx.type === "transfer_from_savings" ? 1 : -1;
      const categoryName = tx.category
        ? getCategoryDisplay(tx.category, { customCategories, customizations, t }).name
        : "";

      return {
        [t("history.date", { defaultValue: "Date" })]: formatDate(tx.occurredAt),
        [t("common.type")]: t(`transactionType.${tx.type}`),
        [t("common.category")]: categoryName,
        [t("common.amount")]: sign * tx.amount,
        [t("savings.savingsPart", { defaultValue: "Savings part" })]: tx.savingsAmt ?? "",
        [t("common.note")]: tx.note ?? "",
      };
    });

  const totals = transactions.reduce(
    (acc, tx) => {
      if (tx.deletedAt) return acc;
      if (tx.type === "income") acc.income += tx.amount;
      else if (tx.type === "expense") acc.expense += tx.amount;
      else if (tx.type === "transfer_to_savings") acc.savings += tx.amount;
      else if (tx.type === "transfer_from_savings") acc.withdrawn += tx.amount;
      return acc;
    },
    { income: 0, expense: 0, savings: 0, withdrawn: 0 },
  );

  const summary = [
    { [t("monthReport.snapshot")]: t("monthReport.income"), [t("common.amount")]: totals.income },
    { [t("monthReport.snapshot")]: t("monthReport.spending"), [t("common.amount")]: totals.expense },
    { [t("monthReport.snapshot")]: t("monthReport.saved"), [t("common.amount")]: totals.savings },
    { [t("monthReport.snapshot")]: t("monthReport.withdrawn"), [t("common.amount")]: totals.withdrawn },
    {
      [t("monthReport.snapshot")]: t("monthReport.netSaved"),
      [t("common.amount")]: totals.savings - totals.withdrawn,
    },
  ];

  const workbook = XLSX.utils.book_new();
  const wsTransactions = XLSX.utils.json_to_sheet(rows);
  const wsSummary = XLSX.utils.json_to_sheet(summary);

  // Auto-size columns roughly by header length.
  const sizeColumns = (sheet: import("xlsx").WorkSheet, sample: Record<string, unknown>[]): void => {
    const first = sample[0];
    if (!first) return;
    const keys = Object.keys(first);
    sheet["!cols"] = keys.map((key) => {
      const maxLen = sample.reduce(
        (max, row) => Math.max(max, String(row[key] ?? "").length),
        key.length,
      );
      return { wch: Math.min(40, maxLen + 2) };
    });
  };

  sizeColumns(wsTransactions, rows);
  sizeColumns(wsSummary, summary);

  XLSX.utils.book_append_sheet(workbook, wsSummary, t("export.summarySheet", { defaultValue: "Summary" }));
  XLSX.utils.book_append_sheet(
    workbook,
    wsTransactions,
    t("export.transactionsSheet", { defaultValue: "Transactions" }),
  );

  XLSX.writeFile(workbook, `save-up-${monthKey}.xlsx`);
}
