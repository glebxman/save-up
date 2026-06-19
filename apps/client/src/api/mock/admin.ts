import type { AdminUserListItem, AdminUsersPage, User } from "@finance-twa/shared-types";
import { SUBSCRIPTION_PLANS } from "@finance-twa/shared-types";

import { loadDatabase, saveDatabase } from "./_db";
import { roundAmount } from "./_helpers";
import type { MockHandler } from "./_types";

function maskTelegramId(telegramId: number): string {
  const value = String(telegramId);
  return `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

export function mapAdminUser(user: User): AdminUserListItem {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return {
    id: user.id,
    displayName: user.username ? `@${user.username}` : name || `User ${user.id.slice(0, 8)}`,
    username: user.username ?? null,
    photoUrl: user.photoUrl ?? null,
    telegramIdMasked: maskTelegramId(user.telegramId),
    isAdmin: !!user.isAdmin,
    hasPinConfigured: !!user.hasPinConfigured,
    subscription: user.subscription,
    createdAt: user.createdAt,
  };
}

function getAdminUsersPage(params: { page?: number; pageSize?: number; search?: string }): AdminUsersPage {
  const database = loadDatabase();
  const pageSize = Math.min(Math.max(Math.trunc(params.pageSize ?? 12), 1), 50);
  const page = Math.max(Math.trunc(params.page ?? 1), 1);
  const search = params.search?.trim().toLowerCase() ?? "";
  const items = Object.values(database.users)
    .filter((user) => {
      if (!search) return true;
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").toLowerCase();
      return user.id.toLowerCase().includes(search)
        || String(user.telegramId).includes(search)
        || (user.username ?? "").toLowerCase().includes(search)
        || fullName.includes(search);
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const totalItems = items.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedItems = items.slice(startIndex, startIndex + pageSize).map(mapAdminUser);
  const totalUsers = Object.keys(database.users).length;
  const stats = {
    totalUsers,
    totalAdmins: Object.values(database.users).filter((user) => user.isAdmin).length,
    totalTransactions: database.transactions.length,
    totalBalance: Object.values(database.users).reduce((sum, user) => roundAmount(sum + user.balance), 0),
    totalSavings: Object.values(database.users).reduce((sum, user) => roundAmount(sum + user.savings), 0),
  };

  return { items: pagedItems, page: safePage, pageSize, totalItems, totalPages, stats };
}

export const adminListUsers: MockHandler<"admin.listUsers"> = (params) =>
  getAdminUsersPage({ page: params.page, pageSize: params.pageSize, search: params.search });

export const adminSetAdmin: MockHandler<"admin.setAdmin"> = (params) => {
  const database = loadDatabase();
  const user = Object.values(database.users).find((item) => item.id === params.userId);
  if (!user) throw new Error("User not found");
  if (user.telegramId === 8246152069 && !params.isAdmin) {
    throw new Error("Super admin access cannot be removed");
  }
  user.isAdmin = params.isAdmin;
  saveDatabase(database);
  return mapAdminUser(user);
};

export const adminResetPin: MockHandler<"admin.resetPin"> = (params) => {
  const database = loadDatabase();
  const user = Object.values(database.users).find((item) => item.id === params.userId);
  if (!user) throw new Error("User not found");
  user.hasPinConfigured = false;
  saveDatabase(database);
  return mapAdminUser(user);
};

export const adminSetSubscription: MockHandler<"admin.setSubscription"> = (params) => {
  const database = loadDatabase();
  const user = Object.values(database.users).find((item) => item.id === params.userId);
  if (!user) throw new Error("User not found");

  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === params.planId);
  if (!plan) throw new Error("Unknown subscription plan");

  const now = new Date();
  const currentExpiresAt = user.subscription.expiresAt ? new Date(user.subscription.expiresAt) : null;
  const baseDate = currentExpiresAt && currentExpiresAt.getTime() > now.getTime() ? currentExpiresAt : now;
  const expiresAt = new Date(baseDate);
  expiresAt.setMonth(expiresAt.getMonth() + params.durationMonths);

  user.subscription = {
    ...user.subscription,
    active: true,
    source: "paid",
    planId: plan.id,
    expiresAt: expiresAt.toISOString(),
  };
  saveDatabase(database);
  return mapAdminUser(user);
};
