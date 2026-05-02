import { db } from "./config/database.js";
import { users } from "./db/schema/index.js";

import en from "./locales/en.json" with { type: "json" };
import ru from "./locales/ru.json" with { type: "json" };
import uz from "./locales/uz.json" with { type: "json" };
import kk from "./locales/kk.json" with { type: "json" };
import zh from "./locales/zh.json" with { type: "json" };
import ja from "./locales/ja.json" with { type: "json" };
import ko from "./locales/ko.json" with { type: "json" };
import tr from "./locales/tr.json" with { type: "json" };
import es from "./locales/es.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };
import de from "./locales/de.json" with { type: "json" };

type SupportedLang = "en" | "ru" | "uz" | "kk" | "zh" | "ja" | "ko" | "tr" | "es" | "fr" | "de";

const LOCALES: Record<SupportedLang, Record<string, string>> = {
  en, ru, uz, kk, zh, ja, ko, tr, es, fr, de,
};

function getMessage(key: string, lang: string): string {
  const l = (LOCALES[lang as SupportedLang] ? lang : "en") as SupportedLang;
  return LOCALES[l]?.[key] ?? LOCALES["en"]?.[key] ?? "";
}

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

const lastSentMap = new Map<number, number>();

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
    console.error(`[Reminders] Failed to send to ${chatId}:`, err);
  }
}

async function runReminderBatch(botToken: string): Promise<void> {
  const now = Date.now();
  console.log("[Reminders] Running batch...");

  let allUsers: { telegramId: number; language: string | null }[];

  try {
    allUsers = await db
      .select({ telegramId: users.telegramId, language: users.language })
      .from(users);
  } catch (err) {
    console.error("[Reminders] Failed to fetch users:", err);
    return;
  }

  let sent = 0;

  for (const user of allUsers) {
    const lastSent = lastSentMap.get(user.telegramId) ?? 0;
    if (now - lastSent < THREE_DAYS_MS) continue;

    const key = pickRandomKey();
    const text = getMessage(key, user.language ?? "en");

    try {
      await sendTelegramMessage(botToken, user.telegramId, text);
      lastSentMap.set(user.telegramId, now);
      sent++;
    } catch (err) {
      console.error(`[Reminders] Error sending to ${user.telegramId}:`, err);
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  console.log(`[Reminders] Batch done. Sent ${sent}/${allUsers.length}.`);
}

export function startReminderScheduler(botToken: string): void {
  console.log("[Reminders] Scheduler started (interval: 1h, send interval per user: 3d).");

  runReminderBatch(botToken).catch((err) =>
    console.error("[Reminders] Startup batch error:", err),
  );

  setInterval(() => {
    runReminderBatch(botToken).catch((err) =>
      console.error("[Reminders] Scheduled batch error:", err),
    );
  }, CHECK_INTERVAL_MS);
}
