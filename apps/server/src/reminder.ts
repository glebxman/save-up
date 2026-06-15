import { eq, and, lte, isNull } from "drizzle-orm";
import type { NotificationFrequency } from "@finance-twa/shared-types";

import { db } from "./config/database.js";
import { users, debts } from "./db/schema/index.js";
import { logger } from "./utils/logger.js";
import { getBotMessage, formatAmount } from "./utils/i18n.js";
import { sendTelegramMessage } from "./utils/telegram-api.js";
import type { SupportedLang } from "./utils/i18n.js";

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

async function runReminderBatch(): Promise<void> {
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
      await sendTelegramMessage(user.telegramId, text);
      await db
        .update(users)
        .set({ lastReminderSlotKey: slot, lastReminderSentAt: new Date() })
        .where(eq(users.telegramId, user.telegramId));
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("Forbidden")) {
        log.error({ err, telegramId: user.telegramId }, "Error sending reminder");
      }
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  if (sent > 0) {
    log.info({ sent, total: allUsers.length }, "Reminder batch done");
  }
}

async function checkDebtReminders(): Promise<void> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  log.debug("Checking debt reminders");

  let dueDebts: { id: string; name: string; amount: number; direction: string; userId: string; dueDate: Date | null }[];
  try {
    dueDebts = await db
      .select({
        id: debts.id,
        name: debts.name,
        amount: debts.amount,
        direction: debts.direction,
        userId: debts.userId,
        dueDate: debts.dueDate,
      })
      .from(debts)
      .where(
        and(
          eq(debts.settled, false),
          lte(debts.dueDate, tomorrow),
        ),
      );
  } catch (err) {
    log.error({ err }, "Failed to fetch due debts");
    return;
  }

  let sent = 0;

  for (const debt of dueDebts) {
    if (!debt.dueDate) continue;

    // Get user info for this debt
    const [user] = await db
      .select({ telegramId: users.telegramId, language: users.language })
      .from(users)
      .where(eq(users.id, debt.userId))
      .limit(1);

    if (!user) continue;

    const lang = (user.language ?? "en") as SupportedLang;

    try {
      const msg = getBotMessage("debt_reminder", lang)
        .replace("{name}", debt.name)
        .replace("{amount}", formatAmount(debt.amount, lang))
        .replace("{date}", new Date(debt.dueDate).toLocaleDateString());

      await sendTelegramMessage(user.telegramId, msg);
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("Forbidden")) {
        log.error({ err, telegramId: user.telegramId }, "Error sending debt reminder");
      }
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  if (sent > 0) {
    log.info({ sent }, "Debt reminders sent");
  }
}

export function startReminderScheduler(_botToken: string): void {
  log.info("Reminder scheduler started (interval: 5m, per-user schedule)");

  runReminderBatch().catch((err) => log.error({ err }, "Startup reminder batch error"));
  checkDebtReminders().catch((err) => log.error({ err }, "Startup debt reminder error"));

  setInterval(() => {
    runReminderBatch().catch((err) => log.error({ err }, "Scheduled reminder batch error"));
    checkDebtReminders().catch((err) => log.error({ err }, "Scheduled debt reminder error"));
  }, CHECK_INTERVAL_MS);
}
