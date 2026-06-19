import type {
  AdminStats,
  AdminUserListItem,
  AdminUsersPage,
} from "@finance-twa/shared-types";

import { count, desc, eq, or, sql } from "drizzle-orm";

import { db } from "../../config/database.js";
import { transactions, users, type UserRow } from "../../db/schema/index.js";
import { escapeIlike } from "../../utils/sql.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { invalidateStatusCache } from "../cache.service.js";
import { addPlanMonths, getSubscriptionPlan, mapSubscriptionState } from "../subscription/index.js";
import { isSuperAdmin, maskTelegramId, buildAdminLabel } from "./_internal.js";
import { ensureUser } from "./status.js";

/** Project a user row into the public admin list item shape. */
function toAdminListItem(row: UserRow): AdminUserListItem {
  return {
    id: row.id,
    displayName: buildAdminLabel(row),
    username: row.username ?? null,
    photoUrl: row.photoUrl ?? null,
    telegramIdMasked: maskTelegramId(row.telegramId),
    isAdmin: row.isAdmin || isSuperAdmin(row.telegramId),
    hasPinConfigured: !!(row.pinHash && row.pinSalt),
    subscription: mapSubscriptionState(row),
    createdAt: row.createdAt.toISOString(),
  };
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

  const items: AdminUserListItem[] = userRows.map(toAdminListItem);

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

  return toAdminListItem(updated[0] as UserRow);
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

  await invalidateStatusCache(target.telegramId);

  return toAdminListItem(updated[0] as UserRow);
}

export async function setUserSubscription(
  telegramId: number,
  userId: string,
  planId: Parameters<typeof getSubscriptionPlan>[0],
  durationMonths: number,
): Promise<AdminUserListItem> {
  await requireAdminUser(telegramId);

  const plan = getSubscriptionPlan(planId);
  if (!plan) {
    throw new AppError(ErrorCode.VALIDATION, "Unknown subscription plan");
  }

  const months = Math.min(Math.max(Math.trunc(durationMonths), 1), 36);
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const target = existing[0];

  if (!target) {
    throw new AppError(ErrorCode.NOT_FOUND, "User not found");
  }

  const now = new Date();
  const baseDate =
    target.subscriptionExpiresAt && target.subscriptionExpiresAt.getTime() > now.getTime()
      ? target.subscriptionExpiresAt
      : now;
  const subscriptionExpiresAt = addPlanMonths(baseDate, months);

  const updated = await db
    .update(users)
    .set({
      subscriptionPlan: planId,
      subscriptionExpiresAt,
    })
    .where(eq(users.id, target.id))
    .returning();

  await invalidateStatusCache(target.telegramId);

  return toAdminListItem(updated[0] as UserRow);
}
