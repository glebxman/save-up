import { eq } from "drizzle-orm";
import { db } from "./config/database.js";
import { users } from "./db/schema/index.js";
import { logger } from "./utils/logger.js";
import { applyRecurringTransaction } from "./services/finance.service.js";
import { mapUserRow } from "./services/user.service.js";
import type { RecurringTransaction } from "@finance-twa/shared-types";

const log = logger.child({ module: "recurring-scheduler" });

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // every hour

async function runRecurringBatch(): Promise<void> {
  const today = new Date();
  const dayOfMonth = today.getDate();

  log.debug({ dayOfMonth }, "Running recurring transactions batch");

  let allUsers: { telegramId: number; recurringTemplates: unknown }[];

  try {
    allUsers = await db.select({ telegramId: users.telegramId, recurringTemplates: users.recurringTemplates }).from(users);
  } catch (err) {
    log.error({ err }, "Failed to fetch users for recurring batch");
    return;
  }

  let applied = 0;
  let skipped = 0;

  for (const user of allUsers) {
    const templates = Array.isArray(user.recurringTemplates) ? user.recurringTemplates as RecurringTransaction[] : [];
    const due = templates.filter(
      (t) => t.autoApply && typeof t.dayOfMonth === "number" && t.dayOfMonth === dayOfMonth,
    );

    for (const template of due) {
      try {
        await applyRecurringTransaction(user.telegramId, template.id);
        applied++;
        log.info({ telegramId: user.telegramId, templateId: template.id, title: template.title }, "Auto-applied recurring transaction");
      } catch (err) {
        skipped++;
        log.error({ err, telegramId: user.telegramId, templateId: template.id }, "Failed to auto-apply recurring transaction");
      }
    }
  }

  if (applied > 0 || skipped > 0) {
    log.info({ applied, skipped }, "Recurring batch done");
  }
}

export function startRecurringScheduler(): void {
  log.info("Recurring transaction scheduler started (interval: 1h)");

  runRecurringBatch().catch((err) => log.error({ err }, "Startup recurring batch error"));

  setInterval(() => {
    runRecurringBatch().catch((err) => log.error({ err }, "Scheduled recurring batch error"));
  }, CHECK_INTERVAL_MS);
}
