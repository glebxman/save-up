import { eq } from "drizzle-orm";

import { db } from "./config/database.js";
import { users } from "./db/schema/index.js";
import { logger } from "./utils/logger.js";
import { getBotMessage, formatAmount } from "./utils/i18n.js";
import { sendTelegramMessage } from "./utils/telegram-api.js";
import type { SupportedLang } from "./utils/i18n.js";

const log = logger.child({ module: "savings-milestones" });

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // every hour
const MILESTONE_THRESHOLDS = [50, 75, 100];

interface UserRow {
  id: string;
  telegramId: number;
  language: string | null;
  savingsGoal: number;
  savings: number;
  lastMilestoneSent: number | null;
}

async function checkMilestones(): Promise<void> {
  log.debug("Checking savings milestones");

  let allUsers: UserRow[];
  try {
    allUsers = await db
      .select({
        id: users.id,
        telegramId: users.telegramId,
        language: users.language,
        savingsGoal: users.savingsGoal,
        savings: users.savings,
        lastMilestoneSent: users.lastMilestoneSent,
      })
      .from(users);
  } catch (err) {
    log.error({ err }, "Failed to fetch users for milestone check");
    return;
  }

  let sent = 0;

  for (const user of allUsers) {
    if (user.savingsGoal <= 0) continue;

    const percentage = Math.round((user.savings / user.savingsGoal) * 100);
    const lang = (user.language ?? "en") as SupportedLang;

    let milestoneKey: string | null = null;
    let messageKey: string | null = null;

    if (percentage >= 100) {
      milestoneKey = "100";
      messageKey = "savings_milestone_100";
    } else if (percentage >= 75) {
      milestoneKey = "75";
      messageKey = "savings_milestone_75";
    } else if (percentage >= 50) {
      milestoneKey = "50";
      messageKey = "savings_milestone_50";
    }

    if (!milestoneKey || !messageKey) continue;

    // Compare against the last *tier* reached (50/75/100), not the raw percentage —
    // otherwise any percentage increase within the same tier (e.g. 52% -> 58%, both
    // "50%") re-triggers the same milestone message.
    const milestoneValue = Number(milestoneKey);
    if (user.lastMilestoneSent !== null && milestoneValue <= user.lastMilestoneSent) continue;

    try {
      const text = getBotMessage(messageKey, lang)
        .replace("{amount}", formatAmount(user.savings, lang))
        .replace("{goal}", formatAmount(user.savingsGoal, lang))
        .replace("{percentage}", String(percentage));

      await sendTelegramMessage(user.telegramId, text);

      await db
        .update(users)
        .set({ lastMilestoneSent: milestoneValue })
        .where(eq(users.id, user.id));

      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("Forbidden")) {
        // User blocked the bot — skip silently
      } else {
        log.error({ err, telegramId: user.telegramId }, "Error sending milestone notification");
      }
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  if (sent > 0) {
    log.info({ sent }, "Milestone notifications sent");
  }
}

export function startSavingsMilestoneScheduler(): void {
  log.info("Savings milestone scheduler started (interval: 1h)");

  checkMilestones().catch((err) => log.error({ err }, "Startup milestone check error"));

  setInterval(() => {
    checkMilestones().catch((err) => log.error({ err }, "Scheduled milestone check error"));
  }, CHECK_INTERVAL_MS);
}
