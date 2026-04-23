import type { RecurringTransaction, SavingsPct, Status, User } from "@finance-twa/shared-types";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../config/database.js";
import { transactions, users, type UserRow } from "../db/schema/index.js";
import { calculateDailyLimit } from "../utils/daily-limit.js";
import { getMonthKey } from "../utils/daily-limit.js";
import { setCachedStatus } from "./cache.service.js";

export function mapUserRow(row: UserRow): User {
  const recurringTransactions = Array.isArray(row.recurringTemplates)
    ? row.recurringTemplates as RecurringTransaction[]
    : [];

  return {
    id: row.id,
    telegramId: row.telegramId,
    balance: row.balance,
    savings: row.savings,
    savingsPct: row.savingsPct as SavingsPct,
    savingsGoal: row.savingsGoal,
    recurringTransactions,
    monthlyExp: row.monthlyExp,
    createdAt: row.createdAt.toISOString(),
  };
}

export function buildStatus(row: UserRow): Status {
  const user = mapUserRow(row);

  return {
    user,
    dailyLimit: calculateDailyLimit({ balance: user.balance }),
  };
}

export async function findUserByTelegramId(telegramId: number): Promise<UserRow | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  return result[0] ?? null;
}

export async function ensureUser(telegramId: number): Promise<UserRow> {
  const existing = await findUserByTelegramId(telegramId);

  if (existing) {
    return existing;
  }

  const inserted = await db
    .insert(users)
    .values({
      telegramId,
    })
    .returning();

  return inserted[0] as UserRow;
}

async function syncCurrentMonthExpense(row: UserRow): Promise<UserRow> {
  const monthKey = getMonthKey();
  const totals = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)::numeric(15,2)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, row.id),
        eq(transactions.type, "expense"),
        eq(transactions.monthKey, monthKey),
        isNull(transactions.deletedAt),
      ),
    )
    .limit(1);
  const nextMonthlyExp = Number(totals[0]?.total ?? 0);

  if (row.monthlyExp === nextMonthlyExp) {
    return row;
  }

  const updated = await db
    .update(users)
    .set({
      monthlyExp: nextMonthlyExp,
    })
    .where(eq(users.id, row.id))
    .returning();

  return updated[0] as UserRow;
}

export async function initUserStatus(telegramId: number): Promise<Status> {
  const user = await syncCurrentMonthExpense(await ensureUser(telegramId));
  const status = buildStatus(user);

  await setCachedStatus(telegramId, status);

  return status;
}

export async function getStatusByTelegramId(telegramId: number): Promise<Status> {
  const user = await syncCurrentMonthExpense(await ensureUser(telegramId));
  const status = buildStatus(user);

  await setCachedStatus(telegramId, status);

  return status;
}
