import type {
  CategoryBreakdown,
  CategoryBreakdownItem,
  MonthReport,
} from "@finance-twa/shared-types";

import { getTransactionsForUser } from "./_db";
import { getMonthKey, parseTelegramIdFromInitData, roundAmount } from "./_helpers";
import type { MockHandler } from "./_types";

function getReportForUser(telegramId: number, monthKey = getMonthKey()): MonthReport {
  return getTransactionsForUser(telegramId)
    .filter((tx) => tx.monthKey === monthKey && !tx.deletedAt)
    .reduce<MonthReport>(
      (report, tx) => {
        if (tx.type === "income") {
          report.incomeTotal = roundAmount(report.incomeTotal + tx.amount);
          report.savingsTotal = roundAmount(report.savingsTotal + (tx.savingsAmt ?? 0));
        }
        if (tx.type === "expense") {
          report.expenseTotal = roundAmount(report.expenseTotal + tx.amount);
        }
        if (tx.type === "transfer_to_savings") {
          report.savingsTotal = roundAmount(report.savingsTotal + tx.amount);
        }
        if (tx.type === "transfer_from_savings") {
          report.savingsWithdrawnTotal = roundAmount(report.savingsWithdrawnTotal + tx.amount);
        }
        report.netSavingsTotal = roundAmount(report.savingsTotal - report.savingsWithdrawnTotal);
        report.transactionCount += 1;
        return report;
      },
      {
        monthKey,
        incomeTotal: 0,
        expenseTotal: 0,
        savingsTotal: 0,
        savingsWithdrawnTotal: 0,
        netSavingsTotal: 0,
        transactionCount: 0,
      },
    );
}

function getCategoryBreakdownForUser(telegramId: number, monthKey = getMonthKey()): CategoryBreakdown {
  const expenses = getTransactionsForUser(telegramId).filter(
    (tx) => !tx.deletedAt && tx.monthKey === monthKey && tx.type === "expense",
  );

  const grouped = new Map<string, { total: number; count: number }>();
  let expenseTotal = 0;

  for (const tx of expenses) {
    const category = tx.category ?? "other";
    const current = grouped.get(category) ?? { total: 0, count: 0 };
    current.total = roundAmount(current.total + tx.amount);
    current.count += 1;
    grouped.set(category, current);
    expenseTotal = roundAmount(expenseTotal + tx.amount);
  }

  const items: CategoryBreakdownItem[] = Array.from(grouped.entries()).map(([category, data]) => ({
    category,
    ...data,
  }));

  return { monthKey, items, expenseTotal };
}

export const financeGetReport: MockHandler<"finance.getReport"> = (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  return getReportForUser(telegramId, params.monthKey);
};

export const financeGetCategoryBreakdown: MockHandler<"finance.getCategoryBreakdown"> = (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  return getCategoryBreakdownForUser(telegramId, params.monthKey);
};

export const financeGetDailyTrend: MockHandler<"finance.getDailyTrend"> = (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const monthKey = params.monthKey ?? getMonthKey();
  const points = new Map<number, { day: number; expense: number; income: number }>();

  for (const tx of getTransactionsForUser(telegramId)) {
    if (tx.deletedAt || tx.monthKey !== monthKey) continue;
    const day = new Date(tx.occurredAt).getDate();
    const point = points.get(day) ?? { day, expense: 0, income: 0 };
    if (tx.type === "expense") point.expense = roundAmount(point.expense + tx.amount);
    if (tx.type === "income") point.income = roundAmount(point.income + tx.amount);
    points.set(day, point);
  }

  return {
    monthKey,
    points: Array.from(points.values()).sort((a, b) => a.day - b.day),
  };
};
