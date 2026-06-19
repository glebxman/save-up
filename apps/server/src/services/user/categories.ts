import type {
  CustomCategory,
  ExpenseCategory,
  Status,
} from "@finance-twa/shared-types";
import { MAX_CUSTOM_CATEGORIES } from "@finance-twa/shared-types";

import { eq } from "drizzle-orm";

import { db } from "../../config/database.js";
import { users, type UserRow } from "../../db/schema/index.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { invalidateStatusCache } from "../cache.service.js";
import { requireSubscriptionAccess } from "../subscription/state.js";
import { buildStatus, ensureUser } from "./status.js";

export async function setCategoryCustomization(
  telegramId: number,
  category: ExpenseCategory,
  name: string,
  emoji: string,
): Promise<{ ok: true }> {
  const user = await ensureUser(telegramId);
  requireSubscriptionAccess(user, telegramId);
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
  requireSubscriptionAccess(user, telegramId);
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
  requireSubscriptionAccess(user, telegramId);
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
  requireSubscriptionAccess(user, telegramId);
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
