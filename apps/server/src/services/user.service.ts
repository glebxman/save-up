import type {
  AdminStats,
  AdminUserListItem,
  AdminUsersPage,
  RecurringTransaction,
  SavingsPct,
  Status,
  User,
} from "@finance-twa/shared-types";
import type { TelegramUser } from "../utils/telegram.js";

import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "../config/database.js";
import { transactions, users, type UserRow } from "../db/schema/index.js";
import { calculateDailyLimit, getMonthKey } from "../utils/daily-limit.js";
import { setCachedStatus } from "./cache.service.js";

export const SUPER_ADMIN_TELEGRAM_ID = 8246152069;

function isSuperAdmin(telegramId: number): boolean {
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

export function mapUserRow(row: UserRow): User {
  const recurringTransactions = Array.isArray(row.recurringTemplates)
    ? row.recurringTemplates as RecurringTransaction[]
    : [];

  return {
    id: row.id,
    telegramId: row.telegramId,
    isAdmin: row.isAdmin || isSuperAdmin(row.telegramId),
    firstName: row.firstName,
    lastName: row.lastName,
    username: row.username,
    photoUrl: row.photoUrl,
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

export async function initUserStatus(telegramId: number, profile?: TelegramUser): Promise<Status> {
  const user = await syncCurrentMonthExpense(await ensureUser(telegramId, profile));
  const status = buildStatus(user);

  await setCachedStatus(telegramId, status);

  return status;
}

export async function getStatusByTelegramId(telegramId: number, profile?: TelegramUser): Promise<Status> {
  const user = await syncCurrentMonthExpense(await ensureUser(telegramId, profile));
  const status = buildStatus(user);

  await setCachedStatus(telegramId, status);

  return status;
}

export async function requireAdminUser(telegramId: number): Promise<UserRow> {
  const user = await ensureUser(telegramId);

  if (!user.isAdmin && !isSuperAdmin(user.telegramId)) {
    throw new Error("Admin access required");
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
  const searchPattern = `%${search}%`;
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
    throw new Error("User not found");
  }

  if (isSuperAdmin(target.telegramId) && !isAdmin) {
    throw new Error("Super admin access cannot be removed");
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
    createdAt: row.createdAt.toISOString(),
  };
}
