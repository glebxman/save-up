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

  const now = new Date();
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

    const lastMilestone = user.lastMilestoneSent;
    const nowMs = now.getTime();

    // Only send if this milestone hasn't been sent before
    // or if we've moved to a higher milestone
    if (lastMilestone !== null) {
      const lastPercentage = lastMilestone;
      if (percentage < lastPercentage) continue;
      if (percentage === lastPercentage) continue;
    }

    try {
      const text = getBotMessage(messageKey, lang)
        .replace("{amount}", formatAmount(user.savings, lang))
        .replace("{goal}", formatAmount(user.savingsGoal, lang))
        .replace("{percentage}", String(percentage));

      await sendTelegramMessage(user.telegramId, text);

      await db
        .update(users)
        .set({ lastMilestoneSent: percentage })
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
