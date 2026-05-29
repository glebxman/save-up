import type {
  AdminStats,
  AdminUserListItem,
  AdminUsersPage,
  CategoryCustomization,
  CustomCategory,
  ExpenseCategory,
  NotificationFrequency,
  RecurringTransaction,
  SavingsPct,
  Status,
  User,
} from "@finance-twa/shared-types";
import { MAX_CUSTOM_CATEGORIES } from "@finance-twa/shared-types";
import type { TelegramUser } from "../utils/telegram.js";

import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "../config/database.js";
import { transactions, users, accounts, type UserRow, type AccountRow } from "../db/schema/index.js";
import { escapeIlike } from "../utils/sql.js";
import { calculateDailyLimit, getMonthKey } from "../utils/daily-limit.js";
import { AppError, ErrorCode } from "../utils/errors.js";
import { getCachedStatus, invalidateStatusCache, setCachedStatus } from "./cache.service.js";
import { getExchangeRates } from "./currency.service.js";
import { env } from "../config/env.js";


export const SUPER_ADMIN_TELEGRAM_ID = 8246152069;function isSuperAdmin(telegramId: number): boolean {
  return telegramId === SUPER_ADMIN_TELEGRAM_ID;
}

function maskTelegramId(telegramId: number): string {
  const value = String(telegramId);
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function normalizeProfileValue(value: string | undefined, maxLength: number): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function mapTelegramProfile(profile?: TelegramUser) {
  return {
    firstName: normalizeProfileValue(profile?.first_name, 128),
    lastName: normalizeProfileValue(profile?.last_name, 128),
    username: normalizeProfileValue(profile?.username, 64),
    photoUrl: profile?.photo_url?.trim() ? profile.photo_url.trim() : null,
  };
}

function hasProfileChanges(row: UserRow, profile: ReturnType<typeof mapTelegramProfile>): boolean {
  return row.firstName !== profile.firstName
    || row.lastName !== profile.lastName
    || row.username !== profile.username
    || row.photoUrl !== profile.photoUrl;
}

function buildAdminLabel(row: UserRow): string {
  if (row.username) {
    return `@${row.username}`;
  }

  const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  return `User ${row.id.slice(0, 8)}`;
}

export function mapUserRow(row: UserRow, accountsList: AccountRow[] = []): User {
  const recurringTransactions = Array.isArray(row.recurringTemplates)
    ? row.recurringTemplates as RecurringTransaction[]
    : [];

  // Reset the daily counter if the stored date is not today.
  const today = new Date().toISOString().slice(0, 10);
  const voiceDailyUsed = row.voiceDailyDate === today ? row.voiceDailyUsed : 0;

  const mappedAccounts = accountsList.map((acc) => ({
    id: acc.id,
    userId: acc.userId,
    name: acc.name,
    type: acc.type as "cash" | "card" | "crypto",
    currency: acc.currency as any,
    balance: Number(acc.balance),
    createdAt: acc.createdAt.toISOString(),
  }));

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

  return {
    user,
    dailyLimit: calculateDailyLimit({ balance: user.balance }),
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

export async function requireAdminUser(telegramId: number): Promise<UserRow> {
  const user = await ensureUser(telegramId);

  if (!user.isAdmin && !isSuperAdmin(user.telegramId)) {
    throw new AppError(ErrorCode.FORBIDDEN, "Admin access required");
  }

  return user;
}

export async function listAdminUsers(
  telegramId: number,
  params: { page?: number; pageSize?: number; search?: string } = {},
): Promise<AdminUsersPage> {
  await requireAdminUser(telegramId);

  const pageSize = Math.min(Math.max(Math.trunc(params.pageSize ?? 12), 1), 50);
  const page = Math.max(Math.trunc(params.page ?? 1), 1);
  const search = params.search?.trim() ?? "";
  const searchPattern = `%${escapeIlike(search)}%`;
  const whereClause = search
    ? or(
      sql`${users.id}::text ILIKE ${searchPattern}`,
      sql`${users.telegramId}::text ILIKE ${searchPattern}`,
      sql`COALESCE(${users.username}, '') ILIKE ${searchPattern}`,
      sql`TRIM(CONCAT(COALESCE(${users.firstName}, ''), ' ', COALESCE(${users.lastName}, ''))) ILIKE ${searchPattern}`,
    )
    : undefined;

  const [statsRow] = await db
    .select({
      totalUsers: count(users.id),
      totalAdmins: sql<number>`COALESCE(SUM(CASE WHEN ${users.isAdmin} THEN 1 ELSE 0 END), 0)`,
      totalBalance: sql<number>`COALESCE(SUM(${users.balance}), 0)::numeric(15,2)`,
      totalSavings: sql<number>`COALESCE(SUM(${users.savings}), 0)::numeric(15,2)`,
      totalTransactions: sql<number>`COALESCE((SELECT COUNT(*) FROM ${transactions}), 0)`,
    })
    .from(users);

  const [totalRow] = await db
    .select({ total: count(users.id) })
    .from(users)
    .where(whereClause);

  const totalItems = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * pageSize;

  const userRows = await db
    .select()
    .from(users)
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset(offset);

  const items: AdminUserListItem[] = userRows.map((row) => ({
    id: row.id,
    displayName: buildAdminLabel(row),
    username: row.username ?? null,
    photoUrl: row.photoUrl ?? null,
    telegramIdMasked: maskTelegramId(row.telegramId),
    isAdmin: row.isAdmin || isSuperAdmin(row.telegramId),
    hasPinConfigured: !!(row.pinHash && row.pinSalt),
    createdAt: row.createdAt.toISOString(),
  }));

  const stats: AdminStats = {
    totalUsers: Number(statsRow?.totalUsers ?? 0),
    totalAdmins: Number(statsRow?.totalAdmins ?? 0),
    totalTransactions: Number(statsRow?.totalTransactions ?? 0),
    totalBalance: Number(statsRow?.totalBalance ?? 0),
    totalSavings: Number(statsRow?.totalSavings ?? 0),
  };

  return {
    items,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    stats,
  };
}

export async function completeOnboarding(telegramId: number): Promise<{ ok: true }> {
  const user = await ensureUser(telegramId);

  if (!user.onboardingCompleted) {
    await db
      .update(users)
      .set({ onboardingCompleted: true })
      .where(eq(users.id, user.id));
    await invalidateStatusCache(telegramId);
  }

  return { ok: true };
}

export async function setUserLanguage(telegramId: number, language: string): Promise<{ ok: true }> {
  const user = await ensureUser(telegramId);

  await db
    .update(users)
    .set({ language })
    .where(eq(users.id, user.id));

  await invalidateStatusCache(telegramId);

  return { ok: true };
}

export async function setUserAdminAccess(
  telegramId: number,
  userId: string,
  isAdmin: boolean,
): Promise<AdminUserListItem> {
  await requireAdminUser(telegramId);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const target = existing[0];

  if (!target) {
    throw new AppError(ErrorCode.NOT_FOUND, "User not found");
  }

  if (isSuperAdmin(target.telegramId) && !isAdmin) {
    throw new AppError(ErrorCode.FORBIDDEN, "Super admin access cannot be removed");
  }

  const updated = await db
    .update(users)
    .set({ isAdmin: isAdmin || isSuperAdmin(target.telegramId) })
    .where(eq(users.id, target.id))
    .returning();
  const row = updated[0] as UserRow;

  return {
    id: row.id,
    displayName: buildAdminLabel(row),
    username: row.username ?? null,
    photoUrl: row.photoUrl ?? null,
    telegramIdMasked: maskTelegramId(row.telegramId),
    isAdmin: row.isAdmin || isSuperAdmin(row.telegramId),
    hasPinConfigured: !!(row.pinHash && row.pinSalt),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function setCategoryCustomization(
  telegramId: number,
  category: ExpenseCategory,
  name: string,
  emoji: string,
): Promise<{ ok: true }> {
  const user = await ensureUser(telegramId);
  const current = (user.categoryCustomizations ?? {}) as Record<string, { name?: string; emoji?: string }>;
  const trimmedName = name.trim();
  const trimmedEmoji = emoji.trim();

  await db
    .update(users)
    .set({
      categoryCustomizations: {
        ...current,
        [category]: {
          name: trimmedName || undefined,
          emoji: trimmedEmoji || undefined,
        },
      },
    })
    .where(eq(users.id, user.id));

  await invalidateStatusCache(telegramId);
  return { ok: true };
}

export async function addCustomCategory(
  telegramId: number,
  name: string,
  emoji: string,
): Promise<Status> {
  const user = await ensureUser(telegramId);
  const current = Array.isArray(user.customCategories) ? user.customCategories as CustomCategory[] : [];

  if (current.length >= MAX_CUSTOM_CATEGORIES) {
    throw new AppError(ErrorCode.LIMIT_REACHED, `Maximum of ${MAX_CUSTOM_CATEGORIES} custom categories reached`);
  }

  const { randomUUID } = await import("node:crypto");
  const id = `c_${randomUUID().replace(/-/g, "").slice(0, 10)}`;

  const updated = [
    ...current,
    { id, name: name.trim(), emoji: emoji.trim() },
  ];

  const rows = await db
    .update(users)
    .set({ customCategories: updated })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);
  return buildStatus(rows[0] as UserRow);
}

export async function deleteCustomCategory(
  telegramId: number,
  id: string,
): Promise<Status> {
  const user = await ensureUser(telegramId);
  const current = Array.isArray(user.customCategories) ? user.customCategories as CustomCategory[] : [];
  const updated = current.filter((c) => c.id !== id);

  const rows = await db
    .update(users)
    .set({ customCategories: updated })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);
  return buildStatus(rows[0] as UserRow);
}

export async function setCategoryLimits(
  telegramId: number,
  limits: Record<string, number>,
): Promise<Status> {
  const user = await ensureUser(telegramId);
  const sanitized: Record<string, number> = {};

  for (const [key, raw] of Object.entries(limits)) {
    if (typeof key !== "string" || key.length === 0 || key.length > 64) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) continue;
    sanitized[key] = Number(value.toFixed(2));
  }

  const rows = await db
    .update(users)
    .set({ categoryLimits: sanitized })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);
  return buildStatus(rows[0] as UserRow);
}

export async function setNotificationSettings(
  telegramId: number,
  enabled: boolean,
  frequency: NotificationFrequency,
  timezoneOffset: number,
): Promise<Status> {
  const user = await ensureUser(telegramId);

  const rows = await db
    .update(users)
    .set({
      notificationsConfigured: true,
      notificationsEnabled: enabled,
      notificationFrequency: frequency,
      notificationTimezoneOffset: Math.max(-720, Math.min(840, Math.trunc(timezoneOffset))),
      // Reset slot key so the next eligible slot triggers a reminder.
      lastReminderSlotKey: null,
    })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);
  return buildStatus(rows[0] as UserRow);
}

export async function createAccount(
  telegramId: number,
  params: { name: string; type: "cash" | "card" | "crypto"; currency: string; initialBalance: number }
): Promise<Status> {
  const user = await ensureUser(telegramId);

  await db.transaction(async (tx) => {
    const [acc] = await tx
      .insert(accounts)
      .values({
        userId: user.id,
        name: params.name.trim(),
        type: params.type,
        currency: params.currency,
        balance: params.initialBalance,
      })
      .returning();

    if (!acc) {
      throw new Error("Failed to create account");
    }

    if (params.initialBalance > 0) {
      await tx.insert(transactions).values({
        userId: user.id,
        accountId: acc.id,
        type: "income",
        amount: params.initialBalance,
        note: "Initial balance",
        monthKey: getMonthKey(),
        occurredAt: new Date(),
      });
    }

    const { syncUserSnapshot } = await import("./finance/_shared.js");
    await syncUserSnapshot(tx, user);
  });

  await invalidateStatusCache(telegramId);
  return getStatusByTelegramId(telegramId);
}

export async function updateAccount(
  telegramId: number,
  params: { accountId: string; name: string }
): Promise<Status> {
  const user = await ensureUser(telegramId);

  await db
    .update(accounts)
    .set({ name: params.name.trim() })
    .where(and(eq(accounts.id, params.accountId), eq(accounts.userId, user.id)));

  await invalidateStatusCache(telegramId);
  return getStatusByTelegramId(telegramId);
}

export async function deleteAccount(
  telegramId: number,
  accountIdVal: string
): Promise<Status> {
  const user = await ensureUser(telegramId);

  const activeAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, user.id), isNull(accounts.deletedAt)));

  if (activeAccounts.length <= 1) {
    throw new AppError(ErrorCode.VALIDATION, "Cannot delete the last remaining account");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ deletedAt: new Date() })
      .where(and(eq(accounts.id, accountIdVal), eq(accounts.userId, user.id)));

    await tx
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(and(eq(transactions.accountId, accountIdVal), eq(transactions.userId, user.id)));

    const { syncUserSnapshot } = await import("./finance/_shared.js");
    await syncUserSnapshot(tx, user);
  });

  await invalidateStatusCache(telegramId);
  return getStatusByTelegramId(telegramId);
}

// ─── PIN management ─────────────────────────────────────────────────────────

import { createHash, randomBytes } from "node:crypto";

function hashPinServer(pin: string, salt: string): string {
  return createHash("sha256").update(`${salt}|${pin}`).digest("hex");
}

export async function setUserPin(telegramId: number, pin: string): Promise<{ ok: true }> {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new AppError(ErrorCode.VALIDATION, "PIN must be 4-6 digits");
  }

  const user = await ensureUser(telegramId);
  const salt = randomBytes(16).toString("hex");
  const hash = hashPinServer(pin, salt);

  await db
    .update(users)
    .set({ pinHash: hash, pinSalt: salt })
    .where(eq(users.id, user.id));

  await invalidateStatusCache(telegramId);
  return { ok: true };
}

export async function verifyUserPin(telegramId: number, pin: string): Promise<{ ok: boolean }> {
  const user = await ensureUser(telegramId);

  if (!user.pinHash || !user.pinSalt) {
    return { ok: false };
  }

  const hash = hashPinServer(pin, user.pinSalt);
  return { ok: hash === user.pinHash };
}

export async function removeUserPin(telegramId: number, pin: string): Promise<{ ok: true }> {
  const user = await ensureUser(telegramId);

  if (!user.pinHash || !user.pinSalt) {
    throw new AppError(ErrorCode.NOT_FOUND, "No PIN configured");
  }

  const hash = hashPinServer(pin, user.pinSalt);
  if (hash !== user.pinHash) {
    throw new AppError(ErrorCode.UNAUTHORIZED, "Wrong PIN");
  }

  await db
    .update(users)
    .set({ pinHash: null, pinSalt: null })
    .where(eq(users.id, user.id));

  await invalidateStatusCache(telegramId);
  return { ok: true };
}

export async function resetUserPin(
  telegramId: number,
  userId: string,
): Promise<AdminUserListItem> {
  await requireAdminUser(telegramId);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const target = existing[0];

  if (!target) {
    throw new AppError(ErrorCode.NOT_FOUND, "User not found");
  }

  const updated = await db
    .update(users)
    .set({ pinHash: null, pinSalt: null })
    .where(eq(users.id, target.id))
    .returning();
  const row = updated[0] as UserRow;

  await invalidateStatusCache(target.telegramId);

  return {
    id: row.id,
    displayName: buildAdminLabel(row),
    username: row.username ?? null,
    photoUrl: row.photoUrl ?? null,
    telegramIdMasked: maskTelegramId(row.telegramId),
    isAdmin: row.isAdmin || isSuperAdmin(row.telegramId),
    hasPinConfigured: !!(row.pinHash && row.pinSalt),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function sendExportToTelegram(
  telegramId: number,
  base64Data: string,
  filename: string,
): Promise<{ ok: boolean }> {
  const buffer = Buffer.from(base64Data, "base64");

  const formData = new FormData();
  formData.append("chat_id", String(telegramId));
  formData.append("document", new Blob([buffer]), filename);

  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to send Telegram document: ${res.statusText} - ${err}`);
  }

  return { ok: true };
}
