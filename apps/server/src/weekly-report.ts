import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import type { ExpenseCategory } from "@finance-twa/shared-types";

import { db } from "./config/database.js";
import { users, transactions } from "./db/schema/index.js";
import { logger } from "./utils/logger.js";
import { getBotMessage, formatAmount, getCategoryEmoji } from "./utils/i18n.js";
import { sendTelegramMessage } from "./utils/telegram-api.js";
import type { SupportedLang } from "./utils/i18n.js";

const log = logger.child({ module: "weekly-report" });

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // every hour
const WEEKLY_REPORT_DAY = 0; // Sunday (0 = Sunday, 1 = Monday, ...)

interface UserRow {
  id: string;
  telegramId: number;
  language: string | null;
  savingsGoal: number;
  savings: number;
  balance: number;
  lastWeeklyReportSentAt: Date | null;
}

function getWeekRange(now: Date): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const prevEnd = new Date(start);
  prevEnd.setHours(23, 59, 59, 999);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - 6);
  prevStart.setHours(0, 0, 0, 0);

  return { start, end, prevStart, prevEnd };
}

function buildWeeklyReport(
  user: UserRow,
  currentIncome: number,
  currentExpenses: number,
  prevExpenses: number,
  categories: { category: string; total: number }[],
  lang: string,
): string {
  const lines: string[] = [];

  lines.push(getBotMessage("weekly_report_title", lang));
  lines.push("");

  lines.push(getBotMessage("weekly_report_income", lang).replace("{amount}", formatAmount(currentIncome, lang)));
  lines.push(getBotMessage("weekly_report_expenses", lang).replace("{amount}", formatAmount(currentExpenses, lang)));
  lines.push(getBotMessage("weekly_report_savings", lang).replace("{amount}", formatAmount(user.savings, lang)));
  lines.push(getBotMessage("weekly_report_balance", lang).replace("{amount}", formatAmount(user.balance, lang)));
  lines.push("");

  if (prevExpenses > 0) {
    const change = Math.round(((currentExpenses - prevExpenses) / prevExpenses) * 100);
    const arrow = change > 0 ? "📈" : "📉";
    lines.push(getBotMessage("weekly_report_vs_last", lang).replace("{percentage}", `${change > 0 ? "+" : ""}${change}`));
  }

  if (categories.length > 0) {
    lines.push("");
    lines.push(getBotMessage("weekly_report_top_categories", lang));
    const top = categories.slice(0, 5);
    for (const cat of top) {
      const pct = currentExpenses > 0 ? Math.round((cat.total / currentExpenses) * 100) : 0;
      const emoji = getCategoryEmoji(cat.category as ExpenseCategory);
      lines.push(`  ${emoji} ${cat.category}: ${formatAmount(cat.total, lang)} (${pct}%)`);
    }
  }

  if (user.savingsGoal > 0) {
    lines.push("");
    const goalPct = Math.round((user.savings / user.savingsGoal) * 100);
    const filled = Math.min(Math.round(goalPct / 10), 10);
    const bar = "█".repeat(filled) + "░".repeat(10 - filled);
    lines.push(`🎯 ${bar} ${goalPct}%`);
  }

  return lines.join("\n");
}

async function sendWeeklyReports(): Promise<void> {
  const now = new Date();

  if (now.getDay() !== WEEKLY_REPORT_DAY) {
    return;
  }

  log.debug("Running weekly report batch");

  let allUsers: UserRow[];
  try {
    allUsers = await db
      .select({
        id: users.id,
        telegramId: users.telegramId,
        language: users.language,
        savingsGoal: users.savingsGoal,
        savings: users.savings,
        balance: users.balance,
        lastWeeklyReportSentAt: users.lastWeeklyReportSentAt,
      })
      .from(users);
  } catch (err) {
    log.error({ err }, "Failed to fetch users for weekly report");
    return;
  }

  const { start, end, prevStart, prevEnd } = getWeekRange(now);

  let sent = 0;

  for (const user of allUsers) {
    if (user.lastWeeklyReportSentAt) {
      const lastSent = new Date(user.lastWeeklyReportSentAt);
      if (now.getTime() - lastSent.getTime() < 6 * 24 * 60 * 60 * 1000) {
        continue;
      }
    }

    const lang = (user.language ?? "en") as SupportedLang;

    try {
      const currentRows = await db
        .select({
          type: transactions.type,
          amount: transactions.amount,
          category: transactions.category,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            isNull(transactions.deletedAt),
            gte(transactions.occurredAt, start),
            lte(transactions.occurredAt, end),
          ),
        );

      const prevRows = await db
        .select({ amount: transactions.amount })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            isNull(transactions.deletedAt),
            eq(transactions.type, "expense"),
            gte(transactions.occurredAt, prevStart),
            lte(transactions.occurredAt, prevEnd),
          ),
        );

      if (currentRows.length === 0) {
        continue;
      }

      let currentIncome = 0;
      let currentExpenses = 0;
      const categoryMap = new Map<string, number>();

      for (const row of currentRows) {
        if (row.type === "income") {
          currentIncome += row.amount;
        } else if (row.type === "expense") {
          currentExpenses += row.amount;
          const cat = row.category ?? "other";
          categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + row.amount);
        }
      }

      const prevExpenses = prevRows.reduce((sum, r) => sum + r.amount, 0);

      const categories = Array.from(categoryMap.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      const report = buildWeeklyReport(user, currentIncome, currentExpenses, prevExpenses, categories, lang);

      await sendTelegramMessage(user.telegramId, report);
      await db
        .update(users)
        .set({ lastWeeklyReportSentAt: new Date() })
        .where(eq(users.id, user.id));
      sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!msg.includes("Forbidden")) {
        log.error({ err, telegramId: user.telegramId }, "Error sending weekly report");
      }
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  if (sent > 0) {
    log.info({ sent, total: allUsers.length }, "Weekly report batch done");
  }
}

export function startWeeklyReportScheduler(): void {
  log.info("Weekly report scheduler started (interval: 1h, sends on Sundays)");

  sendWeeklyReports().catch((err) => log.error({ err }, "Startup weekly report error"));

  setInterval(() => {
    sendWeeklyReports().catch((err) => log.error({ err }, "Scheduled weekly report error"));
  }, CHECK_INTERVAL_MS);
}
