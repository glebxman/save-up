import { eq } from "drizzle-orm";
import type { NotificationFrequency } from "@finance-twa/shared-types";

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

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
/** A scheduled slot is "current" if we're within this many minutes after it. */
const SLOT_TOLERANCE_MIN = 6;

interface UserRow {
  telegramId: number;
  language: string | null;
  notificationsConfigured: boolean;
  notificationsEnabled: boolean;
  notificationFrequency: NotificationFrequency | null;
  notificationTimezoneOffset: number | null;
  lastReminderSlotKey: string | null;
  createdAt: Date;
}

function pickRandomKey(): string {
  return REMINDER_KEYS[Math.floor(Math.random() * REMINDER_KEYS.length)]!;
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string): Promise<void> {
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

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Convert HH:MM to minutes-from-midnight. Returns null on bad input. */
function parseTime(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Returns the user's local YYYY-MM-DD and minutes-from-midnight, derived from
 * UTC `now` and the stored timezone offset (minutes east of UTC).
 */
function getUserLocalNow(now: Date, offsetMinutes: number): { dateKey: string; minute: number } {
  const local = new Date(now.getTime() + offsetMinutes * 60_000);
  const dateKey = `${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}`;
  const minute = local.getUTCHours() * 60 + local.getUTCMinutes();
  return { dateKey, minute };
}

/** Days since UTC epoch — used to evaluate "every N days". */
function localDayIndex(now: Date, offsetMinutes: number): number {
  return Math.floor((now.getTime() + offsetMinutes * 60_000) / 86_400_000);
}

/**
 * Picks the slot the user should receive right now, if any.
 * A slot is identified by `YYYY-MM-DD#HH:MM` so we can dedupe per-user.
 */
function pickDueSlot(user: UserRow, now: Date): string | null {
  if (!user.notificationsEnabled || !user.notificationsConfigured) return null;

  const freq = user.notificationFrequency;
  if (!freq) return null;

  const offset = user.notificationTimezoneOffset ?? 0;
  const { dateKey, minute } = getUserLocalNow(now, offset);

  const candidates: { time: string; minute: number }[] = [];

  if (freq.mode === "per_day") {
    for (const time of freq.times) {
      const m = parseTime(time);
      if (m !== null) candidates.push({ time, minute: m });
    }
  } else {
    // every_n_days
    const days = Math.max(1, freq.days);
    const today = localDayIndex(now, offset);
    // Anchor to user creation day so the cycle is stable per-user.
    const created = localDayIndex(user.createdAt, offset);
    if ((today - created) % days !== 0) return null;

    const m = parseTime(freq.time);
    if (m !== null) candidates.push({ time: freq.time, minute: m });
  }

  // Pick the most recent candidate within tolerance window.
  let best: { time: string; minute: number } | null = null;
  for (const cand of candidates) {
    const diff = minute - cand.minute;
    if (diff >= 0 && diff <= SLOT_TOLERANCE_MIN) {
      if (!best || cand.minute > best.minute) best = cand;
    }
  }

  if (!best) return null;
  return `${dateKey}#${best.time}`;
}

async function runReminderBatch(botToken: string): Promise<void> {
  const now = new Date();
  log.debug("Running reminder batch");

  let allUsers: UserRow[];
  try {
    allUsers = await db
      .select({
        telegramId: users.telegramId,
        language: users.language,
        notificationsConfigured: users.notificationsConfigured,
        notificationsEnabled: users.notificationsEnabled,
        notificationFrequency: users.notificationFrequency,
        notificationTimezoneOffset: users.notificationTimezoneOffset,
        lastReminderSlotKey: users.lastReminderSlotKey,
        createdAt: users.createdAt,
      })
      .from(users);
  } catch (err) {
    log.error({ err }, "Failed to fetch users for reminders");
    return;
  }

  let sent = 0;

  for (const user of allUsers) {
    const slot = pickDueSlot(user, now);
    if (!slot) continue;
    if (slot === user.lastReminderSlotKey) continue; // already delivered this slot

    const key = pickRandomKey();
    const text = getBotMessage(key, user.language ?? "en");

    try {
      await sendTelegramMessage(botToken, user.telegramId, text);
      await db
        .update(users)
        .set({ lastReminderSlotKey: slot, lastReminderSentAt: new Date() })
        .where(eq(users.telegramId, user.telegramId));
      sent++;
    } catch (err) {
      log.error({ err, telegramId: user.telegramId }, "Error sending reminder");
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  if (sent > 0) {
    log.info({ sent, total: allUsers.length }, "Reminder batch done");
  }
}

export function startReminderScheduler(botToken: string): void {
  log.info("Reminder scheduler started (interval: 5m, per-user schedule)");

  runReminderBatch(botToken).catch((err) => log.error({ err }, "Startup reminder batch error"));

  setInterval(() => {
    runReminderBatch(botToken).catch((err) => log.error({ err }, "Scheduled reminder batch error"));
  }, CHECK_INTERVAL_MS);
}
