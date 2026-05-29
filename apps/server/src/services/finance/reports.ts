import type {
  CategoryBreakdown,
  CategoryBreakdownItem,
  DailyTrend,
  DailyTrendPoint,
  MonthReport,
} from "@finance-twa/shared-types";

import { and, count, eq, isNull, sql } from "drizzle-orm";

import { db } from "../../config/database.js";
import { transactions } from "../../db/schema/index.js";
import { getMonthKey } from "../../utils/daily-limit.js";
import { ensureUser } from "../user/index.js";
import { buildMonthReport, roundAmount } from "./_shared.js";

export async function getReport(telegramId: number, monthKey = getMonthKey()): Promise<MonthReport> {
  const user = await ensureUser(telegramId);
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.monthKey, monthKey),
        isNull(transactions.deletedAt),
      ),
    );

  return buildMonthReport(monthKey, rows);
}

export async function getCategoryBreakdown(
  telegramId: number,
  monthKey = getMonthKey(),
): Promise<CategoryBreakdown> {
  const user = await ensureUser(telegramId);
  const rows = await db
    .select({
      category: transactions.category,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)::numeric(15,2)`,
      count: count(),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.monthKey, monthKey),
        eq(transactions.type, "expense"),
        isNull(transactions.deletedAt),
      ),
    )
    .groupBy(transactions.category);

  const items: CategoryBreakdownItem[] = rows
    .filter((row) => row.category !== null)
    .map((row) => ({
      category: row.category as string,
      total: Number(row.total),
      count: Number(row.count),
    }));
  const expenseTotal = items.reduce((sum, item) => roundAmount(sum + item.total), 0);

  return { monthKey, items, expenseTotal };
}

export async function getDailyTrend(
  telegramId: number,
  monthKey = getMonthKey(),
): Promise<DailyTrend> {
  const user = await ensureUser(telegramId);
  const rows = await db
    .select({
      day: sql<number>`EXTRACT(DAY FROM ${transactions.occurredAt})::int`,
      type: transactions.type,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)::numeric(15,2)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.monthKey, monthKey),
        isNull(transactions.deletedAt),
      ),
    )
    .groupBy(sql`EXTRACT(DAY FROM ${transactions.occurredAt})`, transactions.type);

  const map = new Map<number, DailyTrendPoint>();

  for (const row of rows) {
    const day = Number(row.day);
    if (!Number.isFinite(day) || day < 1) continue;
    const point = map.get(day) ?? { day, expense: 0, income: 0 };
    const value = Number(row.total) || 0;
    if (row.type === "expense") {
      point.expense = roundAmount(point.expense + value);
    } else if (row.type === "income") {
      point.income = roundAmount(point.income + value);
    }
    map.set(day, point);
  }

  const points = Array.from(map.values()).sort((a, b) => a.day - b.day);
  return { monthKey, points };
}
