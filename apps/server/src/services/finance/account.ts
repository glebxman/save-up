import type { CurrencyCode, Status } from "@finance-twa/shared-types";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../config/database.js";
import { accounts, transactions, users, type AccountRow, type UserRow } from "../../db/schema/index.js";
import { getMonthKey } from "../../utils/daily-limit.js";
import { invalidateStatusCache } from "../cache.service.js";
import { getExchangeRates } from "../currency.service.js";
import { ensureUser } from "../user/index.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import {
  assertPositiveAmount,
  normalizeBalance,
  normalizeGoal,
  persistStatus,
  roundAmount,
  syncUserSnapshot,
} from "./_shared.js";

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
    const syncedUser = await syncUserSnapshot(tx, user);
    const delta = roundAmount(targetBalance - Number(syncedUser.balance));

    if (delta !== 0) {
      const existingAccounts = await tx
        .select()
        .from(accounts)
        .where(and(eq(accounts.userId, user.id), isNull(accounts.deletedAt)))
        .orderBy(accounts.createdAt)
        .limit(1);
      let targetAccount = existingAccounts[0] as AccountRow | undefined;

      if (!targetAccount) {
        const createdAccounts = await tx
          .insert(accounts)
          .values({
            userId: user.id,
            name: "Main",
            type: "cash",
            currency: user.currency || "UZS",
            balance: 0,
          })
          .returning();
        targetAccount = createdAccounts[0] as AccountRow | undefined;
      }

      if (!targetAccount) {
        throw new AppError(ErrorCode.INTERNAL, "Failed to create account");
      }

      const { rates } = await getExchangeRates();
      const fromRate = rates[user.currency as CurrencyCode] || 1;
      const toRate = rates[targetAccount.currency as CurrencyCode] || 1;
      const amountInAccountCurrency = Math.abs(delta) * (toRate / fromRate);
      const amount = targetAccount.type === "crypto"
        ? Number(amountInAccountCurrency.toFixed(8))
        : roundAmount(amountInAccountCurrency);

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
        accountId: targetAccount.id,
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
        monthlyExpResetAt: null,
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
  const updatedUser = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(users)
      .set({ monthlyExpResetAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    return syncUserSnapshot(tx, updated as UserRow);
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function convertCurrency(telegramId: number, rate: number, currency?: CurrencyCode): Promise<Status> {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new AppError(ErrorCode.VALIDATION, "Conversion rate must be positive");
  }

  const user = await ensureUser(telegramId);
  const updatedUser = await db.transaction(async (tx) => {
    const convertedCategoryLimits = Object.fromEntries(
      Object.entries((user.categoryLimits ?? {}) as Record<string, number>)
        .map(([key, value]) => [key, roundAmount(Number(value) * rate)])
        .filter(([, value]) => Number.isFinite(value as number) && (value as number) > 0),
    );

    const updated = await tx
      .update(users)
      .set({
        currency: currency ?? user.currency,
        savingsGoal: roundAmount(user.savingsGoal * rate),
        categoryLimits: convertedCategoryLimits,
      })
      .where(eq(users.id, user.id))
      .returning();

    return syncUserSnapshot(tx, updated[0] as UserRow);
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}
