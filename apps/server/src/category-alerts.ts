import { and, desc, eq, isNull } from "drizzle-orm";
import type { ExpenseCategory } from "@finance-twa/shared-types";

import { db } from "./config/database.js";
import { users, transactions } from "./db/schema/index.js";
import { logger } from "./utils/logger.js";
import { getBotMessage, formatAmount, getCategoryEmoji } from "./utils/i18n.js";
import { sendTelegramMessage } from "./utils/telegram-api.js";
import type { SupportedLang } from "./utils/i18n.js";
import { getMonthKey } from "./utils/daily-limit.js";

const log = logger.child({ module: "category-alerts" });

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // every 30 minutes
const ALERT_THRESHOLD = 80; // percentage
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours cooldown per category

interface UserRow {
  id: string;
  telegramId: number;
  language: string | null;
  categoryLimits: Record<string, number>;
  lastCategoryAlerts: Record<string, number> | null;
}

function shouldAlert(
  category: string,
  spent: number,
  limit: number,
  lastAlerts: Record<string, number> | null,
  now: Date,
): boolean {
  if (limit <= 0) return false;

  const percentage = Math.round((spent / limit) * 100);
  if (percentage < ALERT_THRESHOLD) return false;

  const lastAlert = lastAlerts?.[category];
  if (lastAlert && now.getTime() - lastAlert < ALERT_COOLDOWN_MS) {
    return false;
  }

  return true;
}

async function checkCategoryLimits(): Promise<void> {
  const now = new Date();
  const currentMonthKey = getMonthKey(now);

  log.debug("Running category limit checks");

  let rawUsers: unknown[];
  try {
    rawUsers = await db
      .select({
        id: users.id,
        telegramId: users.telegramId,
        language: users.language,
        categoryLimits: users.categoryLimits,
        lastCategoryAlerts: users.lastCategoryAlerts,
      })
      .from(users)
      .where(eq(users.notificationsEnabled, true));
  } catch (err) {
    log.error({ err }, "Failed to fetch users for category alerts");
    return;
  }

  const allUsers = rawUsers as UserRow[];

  let sent = 0;

  for (const user of allUsers) {
    const limits = (user.categoryLimits ?? {}) as Record<string, number>;
    if (typeof limits !== "object" || Object.keys(limits).length === 0) {
      continue;
    }

    const lang = (user.language ?? "en") as SupportedLang;

    try {
      const expenseRows = await db
        .select({
          category: transactions.category,
          amount: transactions.amount,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            eq(transactions.type, "expense"),
            eq(transactions.monthKey, currentMonthKey),
            isNull(transactions.deletedAt),
          ),
        );

      const spentByCategory = new Map<string, number>();
      for (const row of expenseRows) {
        const cat = row.category ?? "other";
        spentByCategory.set(cat, (spentByCategory.get(cat) ?? 0) + row.amount);
      }

      const lastAlerts = (user.lastCategoryAlerts ?? {}) as Record<string, number>;
      const updatedAlerts = { ...lastAlerts };
      let alertsSent = false;

      for (const [category, limit] of Object.entries(limits)) {
        if (typeof limit !== "number" || limit <= 0) continue;

        const spent = spentByCategory.get(category) ?? 0;

        if (shouldAlert(category, spent, limit, lastAlerts, now)) {
          const percentage = Math.round((spent / limit) * 100);
          const remaining = Math.max(limit - spent, 0);
          const emoji = getCategoryEmoji(category as ExpenseCategory);

          const text = getBotMessage("category_limit_alert", lang)
            .replace("{category}", `${emoji} ${category}`)
            .replace("{spent}", formatAmount(spent, lang))
            .replace("{limit}", formatAmount(limit, lang))
            .replace("{percentage}", String(percentage))
            .replace("{remaining}", formatAmount(remaining, lang));

          await sendTelegramMessage(user.telegramId, text);
          updatedAlerts[category] = now.getTime();
          alertsSent = true;
          sent++;
        }
      }

      if (alertsSent) {
        await db
          .update(users)
          .set({ lastCategoryAlerts: updatedAlerts })
          .where(eq(users.id, user.id));
      }
    } catch (err) {
      log.error({ err, telegramId: user.telegramId }, "Error checking category limits");
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  if (sent > 0) {
    log.info({ sent, total: allUsers.length }, "Category limit alerts sent");
  }
}

export function startCategoryAlertScheduler(): void {
  log.info("Category limit alert scheduler started (interval: 30m)");

  checkCategoryLimits().catch((err) => log.error({ err }, "Startup category alert error"));

  setInterval(() => {
    checkCategoryLimits().catch((err) => log.error({ err }, "Scheduled category alert error"));
  }, CHECK_INTERVAL_MS);
}
