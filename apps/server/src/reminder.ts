import { eq } from "drizzle-orm";
import { db } from "./config/database.js";
import { users } from "./db/schema/index.js";
import { logger } from "./utils/logger.js";
import { getBotMessage } from "./utils/i18n.js";

const log = logger.child({ module: "reminders" });

const REMINDER_KEYS = [
  "reminder_add_expense",
  "reminder_add_income",
  "reminder_check_balance",
  "reminder_savings_tip",
  "reminder_daily_limit",
  "reminder_monthly_goal",
  "reminder_track_habit",
  "reminder_small_wins",
  "reminder_review_spending",
  "reminder_future_self",
] as const;

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

function pickRandomKey(): string {
  return REMINDER_KEYS[Math.floor(Math.random() * REMINDER_KEYS.length)]!;
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const err = await res.text();
    log.error({ chatId, status: res.status, err }, "Failed to send reminder");
  }
}

async function runReminderBatch(botToken: string): Promise<void> {
  const now = Date.now();
  log.debug("Running reminder batch");

  let allUsers: { telegramId: number; language: string | null; lastReminderSentAt: Date | null }[];

  try {
    allUsers = await db
      .select({ 
        telegramId: users.telegramId, 
        language: users.language,
        lastReminderSentAt: users.lastReminderSentAt 
      })
      .from(users);
  } catch (err) {
    log.error({ err }, "Failed to fetch users for reminders");
    return;
  }

  let sent = 0;

  for (const user of allUsers) {
    const lastSent = user.lastReminderSentAt ? new Date(user.lastReminderSentAt).getTime() : 0;
    if (now - lastSent < THREE_DAYS_MS) continue;

    const key = pickRandomKey();
    const text = getBotMessage(key, user.language ?? "en");

    try {
      await sendTelegramMessage(botToken, user.telegramId, text);
      await db
        .update(users)
        .set({ lastReminderSentAt: new Date() })
        .where(eq(users.telegramId, user.telegramId));
      sent++;
    } catch (err) {
      log.error({ err, telegramId: user.telegramId }, "Error sending reminder");
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  log.info({ sent, total: allUsers.length }, "Reminder batch done");
}

export function startReminderScheduler(botToken: string): void {
  log.info("Reminder scheduler started (interval: 1h, send interval per user: 3d)");

  runReminderBatch(botToken).catch((err) =>
    log.error({ err }, "Startup reminder batch error"),
  );

  setInterval(() => {
    runReminderBatch(botToken).catch((err) =>
      log.error({ err }, "Scheduled reminder batch error"),
    );
  }, CHECK_INTERVAL_MS);
}
