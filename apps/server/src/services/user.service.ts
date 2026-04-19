import type { SavingsPct, Status, User } from "@finance-twa/shared-types";

import { eq } from "drizzle-orm";

import { db } from "../config/database.js";
import { users, type UserRow } from "../db/schema/index.js";
import { calculateDailyLimit } from "../utils/daily-limit.js";
import { getCachedStatus, setCachedStatus } from "./cache.service.js";

export function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    telegramId: row.telegramId,
    balance: row.balance,
    savings: row.savings,
    savingsPct: row.savingsPct as SavingsPct,
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

export async function initUserStatus(telegramId: number): Promise<Status> {
  const user = await ensureUser(telegramId);
  const status = buildStatus(user);

  await setCachedStatus(telegramId, status);

  return status;
}

export async function getStatusByTelegramId(telegramId: number): Promise<Status> {
  const cached = await getCachedStatus(telegramId);

  if (cached) {
    return cached;
  }

  const user = await ensureUser(telegramId);
  const status = buildStatus(user);

  await setCachedStatus(telegramId, status);

  return status;
}
