import type { TFunction } from "i18next";

import type { Transaction } from "@/types/finance";
import { getCategoryDisplay } from "@/components/features/shared/categoryMeta";
import type { CategoryCustomization, CustomCategory, ExpenseCategory } from "@finance-twa/shared-types";
import type { CurrencyCode } from "@finance-twa/shared-types";
import { getStoredCurrency, CURRENCY_SYMBOLS } from "./currency";

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

function encodeCell(r: number, c: number): string {
  let colStr = "";
  let temp = c;
  while (temp >= 0) {
    colStr = String.fromCharCode((temp % 26) + 65) + colStr;
    temp = Math.floor(temp / 26) - 1;
  }
  return `${colStr}${r + 1}`;
}

class WorksheetBuilder {
  ws: import("xlsx").WorkSheet = {};
  merges: import("xlsx").Range[] = [];
  rows: import("xlsx").RowInfo[] = [];
  cols: Record<number, number> = {};

  setCell(r: number, c: number, value: any, type: "s" | "n" | "b" = "s", format?: string, formula?: string) {
    const ref = encodeCell(r, c);
    const cell: any = { t: type, v: value };
    if (format) cell.z = format;
    if (formula) cell.f = formula;
    this.ws[ref] = cell;

    const strVal = value !== undefined && value !== null ? String(value) : "";
    const len = strVal.length;
    this.cols[c] = Math.max(this.cols[c] || 0, len);
  }

  mergeCells(startRow: number, startCol: number, endRow: number, endCol: number) {
    this.merges.push({
      s: { r: startRow, c: startCol },
      e: { r: endRow, c: endCol },
    });
  }

  setRowHeight(r: number, heightPt: number) {
    while (this.rows.length <= r) {
      this.rows.push({});
    }
    this.rows[r] = { hpt: heightPt };
  }

  getWorksheet(minWidths: Record<number, number> = {}): import("xlsx").WorkSheet {
    if (this.merges.length > 0) {
      this.ws["!merges"] = this.merges;
    }
    if (this.rows.length > 0) {
      this.ws["!rows"] = this.rows;
    }
    const colKeys = Object.keys(this.cols).map(Number).sort((a, b) => a - b);
    if (colKeys.length > 0) {
      const maxCol = colKeys[colKeys.length - 1] ?? 0;
      const colsInfo: import("xlsx").ColInfo[] = [];
      for (let i = 0; i <= maxCol; i++) {
        const measured = this.cols[i] || 0;
        const minW = minWidths[i] || 10;
        colsInfo.push({ wch: Math.max(minW, measured + 2) });
      }
      this.ws["!cols"] = colsInfo;
    }

    const keys = Object.keys(this.ws).filter((k) => !k.startsWith("!"));
    if (keys.length > 0) {
      let minR = Infinity, maxR = -Infinity;
      let minC = Infinity, maxC = -Infinity;
      keys.forEach((key) => {
        const match = key.match(/^([A-Z]+)([0-9]+)$/);
        if (match) {
          const colStr = match[1];
          const rowStr = match[2];
          if (colStr && rowStr) {
            const rowNum = parseInt(rowStr, 10) - 1;
            let colNum = 0;
            for (let i = 0; i < colStr.length; i++) {
              colNum = colNum * 26 + (colStr.charCodeAt(i) - 64);
            }
            colNum -= 1;
            minR = Math.min(minR, rowNum);
            maxR = Math.max(maxR, rowNum);
            minC = Math.min(minC, colNum);
            maxC = Math.max(maxC, colNum);
          }
        }
      });
      this.ws["!ref"] = `${encodeCell(minR, minC)}:${encodeCell(maxR, maxC)}`;
    }

    return this.ws;
  }
}

function getExcelFormat(currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency] || "";
  switch (currency) {
    case "USD":
      return `$#,##0.00;[Red]-$#,##0.00;"-"`;
    case "EUR":
      return `€#,##0.00;[Red]-€#,##0.00;"-"`;
    case "GBP":
      return `£#,##0.00;[Red]-£#,##0.00;"-"`;
    case "CNY":
      return `¥#,##0.00;[Red]-¥#,##0.00;"-"`;
    case "BTC":
      return `0.00000000" BTC";[Red]-0.00000000" BTC";"-"`;
    case "ETH":
      return `0.000000" ETH";[Red]-0.000000" ETH";"-"`;
    case "TON":
      return `0.00" TON";[Red]-0.00" TON";"-"`;
    default:
      return `#,##0.00" ${symbol}";[Red]-#,##0.00" ${symbol}";"-"`;
  }
}

export async function exportTransactionsToExcel({
  monthKey,
  transactions,
  customCategories = [],
  customizations = {},
  t,
}: ExportOptions): Promise<{ base64Data: string; filename: string }> {
  const XLSX = await import("xlsx");
  const currency = getStoredCurrency();
  const format = getExcelFormat(currency);

  const activeTx = transactions.filter((tx) => !tx.deletedAt);

  // 1. Calculate Summary
  const totals = activeTx.reduce(
    (acc, tx) => {
      if (tx.type === "income") acc.income += tx.amount;
      else if (tx.type === "expense") acc.expense += tx.amount;
      else if (tx.type === "transfer_to_savings") acc.savings += tx.amount;
      else if (tx.type === "transfer_from_savings") acc.withdrawn += tx.amount;
      return acc;
    },
    { income: 0, expense: 0, savings: 0, withdrawn: 0 },
  );

  // Calculate category breakdown
  const categoryMap: Record<string, number> = {};
  activeTx.forEach((tx) => {
    if (tx.type !== "expense") return;
    const categoryName = tx.category
      ? getCategoryDisplay(tx.category, { customCategories, customizations, t }).name
      : t("common.uncategorized", { defaultValue: "Uncategorized" });
    categoryMap[categoryName] = (categoryMap[categoryName] || 0) + tx.amount;
  });

  const sortedCategories = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1]);

  // 2. Build Sheet 1: Summary Dashboard
  const summaryBuilder = new WorksheetBuilder();
  
  // Row 0: Banner
  const reportTitle = `${t("export.mainTitle", { defaultValue: "SAVE UP - Финансовый отчет" })} — ${monthKey}`;
  summaryBuilder.setCell(0, 0, reportTitle, "s");
  summaryBuilder.mergeCells(0, 0, 0, 3);
  summaryBuilder.setRowHeight(0, 35);
  summaryBuilder.setRowHeight(1, 15);

  // Row 2: Section 1 Header
  summaryBuilder.setCell(2, 0, t("export.keyMetrics", { defaultValue: "СВОДНЫЕ ПОКАЗАТЕЛИ" }), "s");
  summaryBuilder.setRowHeight(2, 22);

  // Row 3: Column Headers
  summaryBuilder.setCell(3, 0, t("export.metricHeader", { defaultValue: "Показатель" }), "s");
  summaryBuilder.setCell(3, 1, t("export.valueHeader", { defaultValue: "Значение" }), "s");
  summaryBuilder.setRowHeight(3, 20);

  // Rows 4-8: Metrics
  summaryBuilder.setCell(4, 0, t("monthReport.income"), "s");
  summaryBuilder.setCell(4, 1, totals.income, "n", format);
  summaryBuilder.setRowHeight(4, 18);

  summaryBuilder.setCell(5, 0, t("monthReport.spending"), "s");
  summaryBuilder.setCell(5, 1, totals.expense, "n", format);
  summaryBuilder.setRowHeight(5, 18);

  summaryBuilder.setCell(6, 0, t("monthReport.saved"), "s");
  summaryBuilder.setCell(6, 1, totals.savings, "n", format);
  summaryBuilder.setRowHeight(6, 18);

  summaryBuilder.setCell(7, 0, t("monthReport.withdrawn"), "s");
  summaryBuilder.setCell(7, 1, totals.withdrawn, "n", format);
  summaryBuilder.setRowHeight(7, 18);

  summaryBuilder.setCell(8, 0, t("monthReport.netSaved"), "s");
  summaryBuilder.setCell(8, 1, totals.savings - totals.withdrawn, "n", format, "=B7-B8");
  summaryBuilder.setRowHeight(8, 18);

  summaryBuilder.setRowHeight(9, 15);

  // Row 10: Section 2 Header (Category Breakdown)
  summaryBuilder.setCell(10, 0, t("export.categoryBreakdown", { defaultValue: "РАСПРЕДЕЛЕНИЕ РАСХОДОВ ПО КАТЕГОРИЯМ" }), "s");
  summaryBuilder.setRowHeight(10, 22);

  // Row 11: Column Headers
  summaryBuilder.setCell(11, 0, t("export.categoryHeader", { defaultValue: "Категория" }), "s");
  summaryBuilder.setCell(11, 1, t("export.valueHeader", { defaultValue: "Значение" }), "s");
  summaryBuilder.setCell(11, 2, t("export.percentHeader", { defaultValue: "% от расходов" }), "s");
  summaryBuilder.setRowHeight(11, 20);

  // Row 12+: Category Rows
  let curRow = 12;
  sortedCategories.forEach(([catName, catAmount]) => {
    summaryBuilder.setCell(curRow, 0, catName, "s");
    summaryBuilder.setCell(curRow, 1, catAmount, "n", format);
    
    // Formula for % of expenses
    const percentFormula = totals.expense > 0 ? `=B${curRow + 1}/$B$6` : undefined;
    summaryBuilder.setCell(curRow, 2, totals.expense > 0 ? (catAmount / totals.expense) : 0, "n", "0.0%", percentFormula);
    summaryBuilder.setRowHeight(curRow, 18);
    curRow++;
  });

  // Total Category Row (only if there are categories)
  if (sortedCategories.length > 0) {
    summaryBuilder.setCell(curRow, 0, t("common.total", { defaultValue: "Всего" }), "s");
    summaryBuilder.setCell(curRow, 1, totals.expense, "n", format, `=SUM(B13:B${curRow})`);
    summaryBuilder.setCell(curRow, 2, 1.0, "n", "0.0%", `=SUM(C13:C${curRow})`);
    summaryBuilder.setRowHeight(curRow, 18);
  }

  // 3. Build Sheet 2: Detailed Transactions
  const txBuilder = new WorksheetBuilder();
  
  // Row 0: Banner
  const txTitle = `${t("export.transactionDetails", { defaultValue: "Детализация транзакций" })} — ${monthKey}`;
  txBuilder.setCell(0, 0, txTitle, "s");
  txBuilder.mergeCells(0, 0, 0, 5);
  txBuilder.setRowHeight(0, 35);
  txBuilder.setRowHeight(1, 15);

  // Row 2: Table Headers
  txBuilder.setCell(2, 0, t("history.date", { defaultValue: "Дата" }), "s");
  txBuilder.setCell(2, 1, t("common.type"), "s");
  txBuilder.setCell(2, 2, t("common.category"), "s");
  txBuilder.setCell(2, 3, t("common.amount"), "s");
  txBuilder.setCell(2, 4, t("savings.savingsPart", { defaultValue: "Из копилки" }), "s");
  txBuilder.setCell(2, 5, t("common.note"), "s");
  txBuilder.setRowHeight(2, 20);

  // Row 3+: Transactions
  let txRow = 3;
  activeTx.forEach((tx) => {
    const sign = tx.type === "income" || tx.type === "transfer_from_savings" ? 1 : -1;
    const categoryName = tx.category
      ? getCategoryDisplay(tx.category, { customCategories, customizations, t }).name
      : "";

    txBuilder.setCell(txRow, 0, formatDate(tx.occurredAt), "s");
    txBuilder.setCell(txRow, 1, t(`transactionType.${tx.type}`), "s");
    txBuilder.setCell(txRow, 2, categoryName, "s");
    txBuilder.setCell(txRow, 3, sign * tx.amount, "n", format);
    
    if (tx.savingsAmt !== undefined && tx.savingsAmt !== null) {
      txBuilder.setCell(txRow, 4, tx.savingsAmt, "n", format);
    } else {
      txBuilder.setCell(txRow, 4, "", "s");
    }

    txBuilder.setCell(txRow, 5, tx.note ?? "", "s");
    txBuilder.setRowHeight(txRow, 16);
    txRow++;
  });

  // Assemble Workbook
  const workbook = XLSX.utils.book_new();
  
  const wsSummary = summaryBuilder.getWorksheet({ 0: 25, 1: 15, 2: 15 });
  const wsTransactions = txBuilder.getWorksheet({ 0: 18, 1: 15, 2: 18, 3: 15, 4: 15, 5: 25 });

  XLSX.utils.book_append_sheet(workbook, wsSummary, t("export.summarySheet", { defaultValue: "Сводка" }));
  XLSX.utils.book_append_sheet(workbook, wsTransactions, t("export.transactionsSheet", { defaultValue: "Транзакции" }));

  const base64Data = XLSX.write(workbook, { bookType: "xlsx", type: "base64" });
  return {
    base64Data,
    filename: `save-up-${monthKey}.xlsx`,
  };
}
