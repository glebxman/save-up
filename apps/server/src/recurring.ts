import { eq } from "drizzle-orm";
import { getMonthKey } from "@finance-twa/shared-utils";
import { db } from "./config/database.js";
import { users } from "./db/schema/index.js";
import { logger } from "./utils/logger.js";
import { applyRecurringTransaction } from "./services/finance/index.js";
import type { RecurringTransaction } from "@finance-twa/shared-types";
import { getBotMessage, formatAmount } from "./utils/i18n.js";
import { sendTelegramMessage } from "./utils/telegram-api.js";
import type { SupportedLang } from "./utils/i18n.js";

const log = logger.child({ module: "recurring-scheduler" });

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // every hour

async function runRecurringBatch(): Promise<void> {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const currentMonthKey = getMonthKey(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDay = tomorrow.getDate();

  log.debug({ dayOfMonth }, "Running recurring batch");

  let allUsers: { telegramId: number; language: string | null; recurringTemplates: unknown }[];

  try {
    allUsers = await db.select({
      telegramId: users.telegramId,
      language: users.language,
      recurringTemplates: users.recurringTemplates,
    }).from(users);
  } catch (err) {
    log.error({ err }, "Failed to fetch users for recurring batch");
    return;
  }

  let applied = 0;
  let skipped = 0;
  let remindersSent = 0;

  for (const user of allUsers) {
    const templates = Array.isArray(user.recurringTemplates)
      ? (user.recurringTemplates as RecurringTransaction[])
      : [];

    // Auto-apply due transactions. Skip ones already applied this month so the
    // hourly tick doesn't re-insert the same transaction all day long (this loop
    // runs every hour, and "due today" stays true for the whole day).
    const dueToday = templates.filter(
      (t) =>
        t.autoApply &&
        typeof t.dayOfMonth === "number" &&
        t.dayOfMonth === dayOfMonth &&
        t.lastAppliedMonthKey !== currentMonthKey,
    );

    for (const template of dueToday) {
      try {
        await applyRecurringTransaction(user.telegramId, template.id);
        applied++;
        log.info({ telegramId: user.telegramId, templateId: template.id, title: template.title }, "Auto-applied recurring transaction");
      } catch (err) {
        skipped++;
        log.error({ err, telegramId: user.telegramId, templateId: template.id }, "Failed to auto-apply recurring transaction");
      }
    }

    // Send reminders for non-autoApply transactions due tomorrow
    const dueTomorrow = templates.filter(
      (t) => typeof t.dayOfMonth === "number" && t.dayOfMonth === tomorrowDay && !t.autoApply,
    );

    for (const template of dueTomorrow) {
      const lang = (user.language ?? "en") as SupportedLang;
      const text = getBotMessage("recurring_reminder_body", lang)
        .replace("{title}", template.title)
        .replace("{amount}", formatAmount(template.amount, lang));

      try {
        await sendTelegramMessage(user.telegramId, text);
        remindersSent++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("Forbidden")) {
          log.error({ err, telegramId: user.telegramId }, "Error sending recurring reminder");
        }
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  if (applied > 0 || skipped > 0 || remindersSent > 0) {
    log.info({ applied, skipped, remindersSent }, "Recurring batch done");
  }
}

export function startRecurringScheduler(): void {
  log.info("Recurring transaction scheduler started (interval: 1h)");

  runRecurringBatch().catch((err) => log.error({ err }, "Startup recurring batch error"));

  setInterval(() => {
    runRecurringBatch().catch((err) => log.error({ err }, "Scheduled recurring batch error"));
  }, CHECK_INTERVAL_MS);
}
