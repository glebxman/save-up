import type { CustomCategory } from "@finance-twa/shared-types";
import { AI_FREE_DAILY_LIMIT } from "@finance-twa/shared-types";

import { and, eq, lt, ne, or, sql } from "drizzle-orm";

import { db } from "../../config/database.js";
import { users } from "../../db/schema/index.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { invalidateStatusCache } from "../cache.service.js";
import { hasSubscriptionAccess } from "../subscription/state.js";
import { ensureUser } from "../user/index.js";

type ExtractFn = (
  data: string,
  customCategories: CustomCategory[],
  language?: string,
) => Promise<{ type: "expense" | "income"; amount: number; category: string; note?: string } | null>;

export async function processAiTransaction(
  telegramId: number,
  rawData: string,
  extractFn: ExtractFn,
) {
  const user = await ensureUser(telegramId);
  const hasAccess = hasSubscriptionAccess(user, telegramId);
  const today = new Date().toISOString().slice(0, 10);

  if (!hasAccess) {
    const isNewDay = user.voiceDailyDate !== today;
    const usedToday = isNewDay ? 0 : user.voiceDailyUsed;

    if (usedToday >= AI_FREE_DAILY_LIMIT) {
      throw new AppError(ErrorCode.LIMIT_REACHED, "AI daily limit reached");
    }
  }

  const customCategories = Array.isArray(user.customCategories)
    ? (user.customCategories as CustomCategory[])
    : [];
  const result = await extractFn(rawData, customCategories, user.language ?? undefined);

  if (result && !hasAccess) {
    // Atomic conditional increment: the CASE/WHERE are evaluated against the row's
    // current state by Postgres itself, not the `user` snapshot read at the top of
    // this function — so concurrent requests can't all read the same stale count and
    // each write back the same "+1", silently bypassing the daily cap.
    const [updated] = await db
      .update(users)
      .set({
        voiceDailyUsed: sql`case when ${users.voiceDailyDate} = ${today} then ${users.voiceDailyUsed} + 1 else 1 end`,
        voiceDailyDate: today,
      })
      .where(
        and(
          eq(users.id, user.id),
          or(ne(users.voiceDailyDate, today), lt(users.voiceDailyUsed, AI_FREE_DAILY_LIMIT)),
        ),
      )
      .returning({ id: users.id });

    if (!updated) {
      throw new AppError(ErrorCode.LIMIT_REACHED, "AI daily limit reached");
    }

    await invalidateStatusCache(telegramId);
  }

  return result;
}
