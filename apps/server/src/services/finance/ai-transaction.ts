import type { CustomCategory } from "@finance-twa/shared-types";
import { AI_FREE_DAILY_LIMIT } from "@finance-twa/shared-types";

import { eq } from "drizzle-orm";

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
    const isNewDay = user.voiceDailyDate !== today;
    const nextCount = isNewDay ? 1 : user.voiceDailyUsed + 1;

    await db
      .update(users)
      .set({ voiceDailyUsed: nextCount, voiceDailyDate: today })
      .where(eq(users.id, user.id));

    await invalidateStatusCache(telegramId);
  }

  return result;
}
