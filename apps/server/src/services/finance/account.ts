import type { Status } from "@finance-twa/shared-types";

import { eq, sql } from "drizzle-orm";

import { db } from "../../config/database.js";
import { transactions, users, type UserRow } from "../../db/schema/index.js";
import { getMonthKey } from "../../utils/daily-limit.js";
import { invalidateStatusCache } from "../cache.service.js";
import { ensureUser } from "../user/index.js";
import {
  assertPositiveAmount,
  buildSnapshot,
  getActiveTransactionsForUser,
  getPreviousMonthKey,
  mapRecurringTemplates,
  normalizeBalance,
  normalizeGoal,
  persistStatus,
  roundAmount,
  syncUserSnapshot,
} from "./_shared.js";
import { and, eq as eqOp, isNull } from "drizzle-orm";

export async function updateSavingsGoal(telegramId: number, goal: number): Promise<Status> {
  const user = await ensureUser(telegramId);
  const updated = await db
    .update(users)
    .set({ savingsGoal: normalizeGoal(goal) })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);

  return persistStatus(updated[0] as UserRow);
}

export async function updateBalance(telegramId: number, balance: number): Promise<Status> {
  const user = await ensureUser(telegramId);
  const targetBalance = normalizeBalance(balance);
  const updatedUser = await db.transaction(async (tx) => {
    const rows = await getActiveTransactionsForUser(tx, user.id);
    const snapshot = buildSnapshot(rows);
    const delta = roundAmount(targetBalance - snapshot.balance);

    if (delta !== 0) {
      const amount = Math.abs(delta);

      assertPositiveAmount(amount);

      await tx.insert(transactions).values({
        userId: user.id,
        type: delta > 0 ? "income" : "expense",
        amount,
        category: delta < 0 ? "other" : null,
        savingsAmt: null,
        note: null,
        monthKey: getMonthKey(),
        occurredAt: new Date(),
      });
    }

    return syncUserSnapshot(tx, user);
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function resetAccountData(telegramId: number): Promise<Status> {
  const user = await ensureUser(telegramId);
  const updatedUser = await db.transaction(async (tx) => {
    await tx.delete(transactions).where(eq(transactions.userId, user.id));

    const updated = await tx
      .update(users)
      .set({
        balance: 0,
        savings: 0,
        monthlyExp: 0,
        savingsGoal: 0,
        recurringTemplates: [],
      })
      .where(eq(users.id, user.id))
      .returning();

    return updated[0] as UserRow;
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function newMonth(telegramId: number): Promise<Status> {
  const user = await ensureUser(telegramId);
  const currentMonthKey = getMonthKey();
  const previousMonthKey = getPreviousMonthKey();

  const updatedUser = await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({
        monthKey: previousMonthKey,
      })
      .where(
        and(
          eqOp(transactions.userId, user.id),
          eqOp(transactions.type, "expense"),
          eqOp(transactions.monthKey, currentMonthKey),
          isNull(transactions.deletedAt),
        ),
      );

    return syncUserSnapshot(tx, user);
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function convertCurrency(telegramId: number, rate: number): Promise<Status> {
  if (rate <= 0) {
    throw new Error("Conversion rate must be positive");
  }

  const user = await ensureUser(telegramId);
  const updatedUser = await db.transaction(async (tx) => {
    const templates = mapRecurringTemplates(user);
    const convertedTemplates = templates.map((t) => ({
      ...t,
      amount: roundAmount(t.amount * rate),
      savingsAmt: t.savingsAmt ? roundAmount(t.savingsAmt * rate) : null,
    }));

    const updated = await tx
      .update(users)
      .set({
        balance: roundAmount(user.balance * rate),
        savings: roundAmount(user.savings * rate),
        savingsGoal: roundAmount(user.savingsGoal * rate),
        monthlyExp: roundAmount(user.monthlyExp * rate),
        recurringTemplates: convertedTemplates,
      })
      .where(eq(users.id, user.id))
      .returning();

    await tx
      .update(transactions)
      .set({
        amount: sql`ROUND((${transactions.amount} * ${rate})::numeric, 2)::float8`,
        savingsAmt: sql`CASE WHEN ${transactions.savingsAmt} IS NOT NULL THEN ROUND((${transactions.savingsAmt} * ${rate})::numeric, 2)::float8 ELSE NULL END`,
      })
      .where(eq(transactions.userId, user.id));

    return updated[0] as UserRow;
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}
