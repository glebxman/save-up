import type {
  CategoryCustomization,
  CurrencyCode,
  CustomCategory,
  ExpenseCategory,
  NotificationFrequency,
  RecurringTransaction,
  SavingsPct,
  Status,
  User,
} from "@finance-twa/shared-types";
import type { TelegramUser } from "../../utils/telegram.js";

import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "../../config/database.js";
import { transactions, users, accounts, type UserRow, type AccountRow } from "../../db/schema/index.js";
import { calculateDailyLimit, getMonthKey } from "../../utils/daily-limit.js";
import { getCachedStatus, setCachedStatus } from "../cache.service.js";
import { getExchangeRates } from "../currency.service.js";
import { mapSubscriptionState } from "../subscription/state.js";
import { isSuperAdmin, mapTelegramProfile, hasProfileChanges } from "./_internal.js";
import { sanitizeHoldings, cryptoHoldingsTotalUsd } from "./crypto.js";

export function mapUserRow(row: UserRow, accountsList: AccountRow[] = []): User {
  const recurringTransactions = Array.isArray(row.recurringTemplates)
    ? row.recurringTemplates as RecurringTransaction[]
    : [];

  // Reset the daily counter if the stored date is not today.
  const today = new Date().toISOString().slice(0, 10);
  const voiceDailyUsed = row.voiceDailyDate === today ? row.voiceDailyUsed : 0;

  const mappedAccounts = accountsList.map((acc) => {
    const isCrypto = acc.type === "crypto";
    const holdings = isCrypto ? sanitizeHoldings(acc.holdings) : undefined;
    return {
      id: acc.id,
      userId: acc.userId,
      name: acc.name,
      type: acc.type as "cash" | "card" | "crypto",
      currency: acc.currency as any,
      balance: Number(acc.balance),
      ...(isCrypto ? { holdings } : {}),
      createdAt: acc.createdAt.toISOString(),
    };
  });

  return {
    id: row.id,
    telegramId: row.telegramId,
    isAdmin: row.isAdmin || isSuperAdmin(row.telegramId),
    firstName: row.firstName,
    lastName: row.lastName,
    username: row.username,
    photoUrl: row.photoUrl,
    balance: Number(row.balance),
    savings: Number(row.savings),
    savingsPct: row.savingsPct as SavingsPct,
    savingsGoal: Number(row.savingsGoal),
    recurringTransactions,
    monthlyExp: Number(row.monthlyExp),
    onboardingCompleted: row.onboardingCompleted,
    language: row.language ?? null,
    voiceDailyUsed,
    categoryCustomizations: (row.categoryCustomizations ?? {}) as Partial<Record<ExpenseCategory, CategoryCustomization>>,
    customCategories: Array.isArray(row.customCategories) ? row.customCategories as CustomCategory[] : [],
    categoryLimits: (row.categoryLimits ?? {}) as Record<string, number>,
    notificationsConfigured: row.notificationsConfigured,
    notificationsEnabled: row.notificationsEnabled,
    notificationFrequency: (row.notificationFrequency ?? { mode: "every_n_days", days: 3, time: "09:00" }) as NotificationFrequency,
    notificationTimezoneOffset: row.notificationTimezoneOffset ?? 0,
    subscription: mapSubscriptionState(row),
    hasPinConfigured: !!(row.pinHash && row.pinSalt),
    createdAt: row.createdAt.toISOString(),
    accounts: mappedAccounts,
    currency: row.currency as any,
  };
}

export async function buildStatus(row: UserRow): Promise<Status> {
  const activeAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, row.id), isNull(accounts.deletedAt)))
    .orderBy(accounts.createdAt);

  const user = mapUserRow(row, activeAccounts);
  const { rates, updatedAt } = await getExchangeRates();

  // Crypto accounts derive their balance (in USD) from their holdings.
  user.accounts = user.accounts.map((acc) =>
    acc.type === "crypto"
      ? { ...acc, currency: "USD" as CurrencyCode, balance: cryptoHoldingsTotalUsd(acc.holdings, rates) }
      : acc,
  );

  return {
    user,
    dailyLimit: calculateDailyLimit(user.balance),
    rates,
    ratesUpdatedAt: new Date(updatedAt).toISOString(),
  };
}

async function findUserByTelegramId(telegramId: number): Promise<UserRow | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  return result[0] ?? null;
}

export async function ensureUser(telegramId: number, profile?: TelegramUser): Promise<UserRow> {
  const existing = await findUserByTelegramId(telegramId);
  const profilePatch = profile ? mapTelegramProfile(profile) : null;

  if (existing) {
    if ((isSuperAdmin(telegramId) && !existing.isAdmin) || (profilePatch && hasProfileChanges(existing, profilePatch))) {
      const updated = await db
        .update(users)
        .set({
          ...(profilePatch ?? {}),
          ...(isSuperAdmin(telegramId) ? { isAdmin: true } : {}),
        })
        .where(eq(users.id, existing.id))
        .returning();

      return updated[0] as UserRow;
    }

    return existing;
  }

  const inserted = await db
    .insert(users)
    .values({
      telegramId,
      isAdmin: isSuperAdmin(telegramId),
      ...(profilePatch ?? {}),
    })
    .returning();

  const userRow = inserted[0] as UserRow;

  // Create default account for this new user
  await db.insert(accounts).values({
    userId: userRow.id,
    name: userRow.language === "ru" ? "Основной" : "Main",
    type: "cash",
    currency: "UZS",
    balance: 0,
  });

  return userRow;
}

async function syncCurrentMonthExpense(row: UserRow): Promise<UserRow> {
  const monthKey = getMonthKey();
  const conditions = [
    eq(transactions.userId, row.id),
    eq(transactions.type, "expense"),
    eq(transactions.monthKey, monthKey),
    isNull(transactions.deletedAt),
  ];

  if (row.monthlyExpResetAt) {
    conditions.push(sql`${transactions.occurredAt} > ${row.monthlyExpResetAt}`);
  }

  const totals = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)::numeric(15,2)`,
    })
    .from(transactions)
    .where(and(...conditions))
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

export async function getStatusByTelegramId(telegramId: number, profile?: TelegramUser): Promise<Status> {
  if (!profile) {
    const cached = await getCachedStatus(telegramId);
    if (cached) return cached;
  }

  const user = await syncCurrentMonthExpense(await ensureUser(telegramId, profile));
  const status = await buildStatus(user);

  await setCachedStatus(telegramId, status);

  return status;
}
