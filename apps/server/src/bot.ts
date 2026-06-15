import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { eq } from "drizzle-orm";

import { db } from "./config/database.js";
import { env } from "./config/env.js";
import { users } from "./db/schema/index.js";
import type { ExpenseCategory } from "@finance-twa/shared-types";
import { startReminderScheduler } from "./reminder.js";
import { startRecurringScheduler } from "./recurring.js";
import { startWeeklyReportScheduler } from "./weekly-report.js";
import { startCategoryAlertScheduler } from "./category-alerts.js";
import { startSavingsMilestoneScheduler } from "./savings-milestones.js";
import { logger } from "./utils/logger.js";
import {
  type SupportedLang,
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  LANGUAGE_FLAGS,
  getBotMessage,
} from "./utils/i18n.js";
import type { TelegramUser } from "./utils/telegram.js";
import { telegramRequest, initTelegramApi } from "./utils/telegram-api.js";

import { addExpense, addIncome, processVoice } from "./services/finance/index.js";
import { processReceipt } from "./services/finance/receipt.js";
import { addDebt, getActiveDebts, settleDebt } from "./services/finance/debts.js";

interface TelegramChat {
  id: number;
}

interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  from?: TelegramUser;
  voice?: {
    file_id: string;
    duration: number;
  };
  photo?: Array<{
    file_id: string;
    width: number;
    height: number;
  }>;
}

interface CallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: CallbackQuery;
}

interface BotLock {
  pid: number;
}

type BotCommand = {
  command: string;
  description: string;
};

const webAppUrl = env.WEBAPP_URL?.trim();
const botLockPath = path.join(os.tmpdir(), "finance-twa-bot.lock.json");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isStartCommand(text?: string): boolean {
  if (!text) {
    return false;
  }

  return text === "/start" || text.startsWith("/start ");
}

function isActiveProcess(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readBotLock(): BotLock | null {
  try {
    const raw = fs.readFileSync(botLockPath, "utf8");
    return JSON.parse(raw) as BotLock;
  } catch {
    return null;
  }
}

function cleanupBotLock(): void {
  const lock = readBotLock();

  if (!lock || lock.pid !== process.pid) {
    return;
  }

  try {
    fs.unlinkSync(botLockPath);
  } catch {
    // Ignore cleanup errors.
  }
}

function acquireBotLock(): boolean {
  const existingLock = readBotLock();

  if (existingLock?.pid && existingLock.pid !== process.pid && isActiveProcess(existingLock.pid)) {
    logger.info({ pid: existingLock.pid }, "Telegram bot is already running. Skipping this instance.");
    return false;
  }

  try {
    fs.writeFileSync(botLockPath, JSON.stringify({ pid: process.pid }), "utf8");
    return true;
  } catch (error) {
    logger.error({ err: error }, "Failed to create Telegram bot lock file");
    return false;
  }
}

function isPollingConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Conflict: terminated by other getUpdates request");
}

function buildLanguageKeyboard(): { inline_keyboard: { text: string; callback_data: string }[][] } {
  const rows: { text: string; callback_data: string }[][] = [];

  for (let i = 0; i < SUPPORTED_LANGUAGES.length; i += 2) {
    const row: { text: string; callback_data: string }[] = [];

    row.push({
      text: `${LANGUAGE_FLAGS[SUPPORTED_LANGUAGES[i]!]} ${LANGUAGE_LABELS[SUPPORTED_LANGUAGES[i]!]}`,
      callback_data: `lang:${SUPPORTED_LANGUAGES[i]!}`,
    });

    if (SUPPORTED_LANGUAGES[i + 1]) {
      row.push({
        text: `${LANGUAGE_FLAGS[SUPPORTED_LANGUAGES[i + 1]!]} ${LANGUAGE_LABELS[SUPPORTED_LANGUAGES[i + 1]!]}`,
        callback_data: `lang:${SUPPORTED_LANGUAGES[i + 1]!}`,
      });
    }

    rows.push(row);
  }

  return { inline_keyboard: rows };
}

function buildOpenAppKeyboard(lang: SupportedLang): Record<string, unknown> | undefined {
  if (!webAppUrl) {
    return undefined;
  }

  return {
    inline_keyboard: [
      [
        {
          text: getBotMessage("open_app", lang),
          web_app: { url: webAppUrl },
        },
      ],
    ],
  };
}

async function getOrCreateBotUserAndReturnLanguage(telegramId: number, firstName?: string): Promise<string | null> {
  const existing = await db
    .select({ language: users.language })
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0]?.language ?? null;
  }

  await db
    .insert(users)
    .values({
      telegramId,
      firstName: firstName?.trim()?.slice(0, 128) ?? null,
    })
    .onConflictDoNothing({ target: users.telegramId });

  return null;
}

async function upsertBotUserLanguage(telegramId: number, language: string, firstName?: string): Promise<void> {
  await db
    .insert(users)
    .values({
      telegramId,
      language,
      firstName: firstName?.trim()?.slice(0, 128) ?? null,
    })
    .onConflictDoUpdate({
      target: users.telegramId,
      set: { language, firstName: firstName?.trim()?.slice(0, 128) ?? null },
    });
}

async function sendLanguagePicker(chatId: number): Promise<void> {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: getBotMessage("choose_language", "en"),
    reply_markup: buildLanguageKeyboard(),
  });
}

async function sendWelcomeMessage(chatId: number, lang: SupportedLang, firstName?: string): Promise<void> {
  const greetingName = firstName?.trim() ? `, ${firstName}` : "";
  const text = getBotMessage("welcome", lang).replace("{name}", greetingName);

  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: buildOpenAppKeyboard(lang),
  });
}

async function handleStartCommand(message: TelegramMessage): Promise<void> {
  const telegramId = message.from?.id;
  const firstName = message.from?.first_name;

  if (!telegramId) {
    return;
  }

  const language = await getOrCreateBotUserAndReturnLanguage(telegramId, firstName);

  if (language && SUPPORTED_LANGUAGES.includes(language as SupportedLang)) {
    await sendWelcomeMessage(message.chat.id, language as SupportedLang, firstName);
  } else {
    await sendLanguagePicker(message.chat.id);
  }
}

async function handleLanguageCallback(callbackQuery: CallbackQuery): Promise<void> {
  const data = callbackQuery.data;

  if (!data?.startsWith("lang:")) {
    return;
  }

  const language = data.slice(5) as SupportedLang;

  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return;
  }

  const telegramId = callbackQuery.from.id;
  const firstName = callbackQuery.from.first_name;
  const chatId = callbackQuery.message?.chat.id;
  const messageId = callbackQuery.message?.message_id;

  await upsertBotUserLanguage(telegramId, language, firstName);

  await telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackQuery.id,
    text: getBotMessage("language_set", language),
  });

  if (chatId && messageId) {
    await telegramRequest("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text: getBotMessage("language_set", language),
    });
  }

  if (chatId) {
    await sendWelcomeMessage(chatId, language, firstName);
  }
}

async function handlePhotoMessage(message: TelegramMessage): Promise<void> {
  const telegramId = message.from?.id;
  if (!telegramId || !message.photo || message.photo.length === 0) return;

  const chatId = message.chat.id;
  const lang = (await getOrCreateBotUserAndReturnLanguage(telegramId, message.from?.first_name)) as SupportedLang || "en";

  const processingMsg = await telegramRequest<TelegramMessage>("sendMessage", {
    chat_id: chatId,
    text: getBotMessage("photo_receipt_processing", lang) || "📸 Processing receipt photo...",
  });

  try {
    const largestPhoto = message.photo[message.photo.length - 1];
    if (!largestPhoto) {
      throw new Error("No photo found");
    }

    const file = await telegramRequest<{ file_path: string }>("getFile", { file_id: largestPhoto.file_id });

    if (!file.file_path || !/^[a-zA-Z0-9/_.-]+$/.test(file.file_path)) {
      throw new Error("Invalid file_path received from Telegram");
    }

    const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const photoRes = await fetch(fileUrl);
    if (!photoRes.ok) throw new Error(`Failed to download photo (HTTP ${photoRes.status})`);
    const arrayBuffer = await photoRes.arrayBuffer();
    const base64Photo = Buffer.from(arrayBuffer).toString("base64");

    const extraction = await processReceipt(telegramId, base64Photo);

    if (!extraction) {
      await telegramRequest("editMessageText", {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        text: getBotMessage("photo_receipt_error", lang) || "❌ Could not process the receipt photo."
      });
      return;
    }

    await addExpense(telegramId, extraction.amount, extraction.category as ExpenseCategory, extraction.note);
    const receiptText = getBotMessage("photo_receipt_saved", lang)
      .replace("{amount}", String(extraction.amount))
      .replace("{category}", extraction.category)
      .replace("{note}", extraction.note || "");
    await telegramRequest("editMessageText", {
      chat_id: chatId,
      message_id: processingMsg.message_id,
      text: receiptText,
    });
  } catch (err) {
    logger.error({ err }, "Photo processing error");
    await telegramRequest("editMessageText", {
      chat_id: chatId,
      message_id: processingMsg.message_id,
      text: getBotMessage("photo_receipt_error", lang) || "❌ Could not process the receipt photo.",
    });
  }
}

async function handleVoiceMessage(message: TelegramMessage): Promise<void> {
  const telegramId = message.from?.id;
  if (!telegramId || !message.voice) return;

  const chatId = message.chat.id;
  const lang = (await getOrCreateBotUserAndReturnLanguage(telegramId, message.from?.first_name)) as SupportedLang || "en";

  const processingMsg = await telegramRequest<TelegramMessage>("sendMessage", {
    chat_id: chatId,
    text: getBotMessage("processing_voice", lang) || "🎙 Обрабатываю голосовое сообщение..."
  });

  try {
    const file = await telegramRequest<{ file_path: string }>("getFile", { file_id: message.voice.file_id });

    if (!file.file_path || !/^[a-zA-Z0-9/_.-]+$/.test(file.file_path)) {
      throw new Error("Invalid file_path received from Telegram");
    }

    const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const audioRes = await fetch(fileUrl);
    if (!audioRes.ok) throw new Error(`Failed to download voice file (HTTP ${audioRes.status})`);
    const arrayBuffer = await audioRes.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    // processVoice handles daily limit check and counter increment.
    const extraction = await processVoice(telegramId, base64Audio);

    if (!extraction) {
      await telegramRequest("editMessageText", {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        text: getBotMessage("voice_error", lang) || "❌ Не удалось распознать операцию. Попробуйте сказать иначе."
      });
      return;
    }

    if (extraction.type === "expense") {
      await addExpense(telegramId, extraction.amount, extraction.category as ExpenseCategory, extraction.note);
      const expenseText = getBotMessage("voice_expense_saved", lang)
        .replace("{amount}", String(extraction.amount))
        .replace("{category}", extraction.category)
        .replace("{note}", extraction.note || "");
      await telegramRequest("editMessageText", {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        text: expenseText,
      });
    } else if (extraction.type === "income") {
      await addIncome(telegramId, extraction.amount, 0, extraction.note);
      const incomeText = getBotMessage("voice_income_saved", lang)
        .replace("{amount}", String(extraction.amount))
        .replace("{note}", extraction.note || "");
      await telegramRequest("editMessageText", {
        chat_id: chatId,
        message_id: processingMsg.message_id,
        text: incomeText,
      });
    }

  } catch (err) {
    const isLimitError = err instanceof Error && err.message === "Voice daily limit reached";
    logger.error({ err }, "Voice processing error");
    await telegramRequest("editMessageText", {
      chat_id: chatId,
      message_id: processingMsg.message_id,
      text: isLimitError
        ? (getBotMessage("voice_limit_reached", lang) || "⚠️ Дневной лимит голосовых запросов исчерпан. Попробуйте завтра.")
        : (getBotMessage("voice_error", lang) || "❌ Произошла ошибка при обработке."),
    });
  }
}

async function handleAddDebt(message: TelegramMessage, args: string): Promise<void> {
  const telegramId = message.from?.id;
  if (!telegramId) return;

  const chatId = message.chat.id;
  const lang = (await getOrCreateBotUserAndReturnLanguage(telegramId, message.from?.first_name)) as SupportedLang || "en";

  try {
    const parts = args.split("|").map((s) => s.trim());
    if (parts.length < 3) {
      await telegramRequest("sendMessage", {
        chat_id: chatId,
        text: "Usage: /debt name | amount | direction\n\nExample: /debt Alice | 50 | owed_to_me\n Directions: owed_to_me, i_owe",
      });
      return;
    }

    const [name, amountStr, direction] = parts;
    const amount = parseFloat(amountStr ?? "0");

    if (!name || isNaN(amount) || amount <= 0) {
      await telegramRequest("sendMessage", {
        chat_id: chatId,
        text: "Invalid debt format. Use: /debt name | amount | direction",
      });
      return;
    }

    if (direction !== "owed_to_me" && direction !== "i_owe") {
      await telegramRequest("sendMessage", {
        chat_id: chatId,
        text: "Direction must be either 'owed_to_me' or 'i_owe'",
      });
      return;
    }

    await addDebt(telegramId, { name, amount, direction });
    const msg = getBotMessage("debt_added", lang)
      .replace("{name}", name)
      .replace("{amount}", String(amount))
      .replace("{date}", "no deadline");

    await telegramRequest("sendMessage", { chat_id: chatId, text: msg });
  } catch (err) {
    logger.error({ err }, "Error adding debt");
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: "Error adding debt. Please try again.",
    });
  }
}

async function handleListDebts(message: TelegramMessage): Promise<void> {
  const telegramId = message.from?.id;
  if (!telegramId) return;

  const chatId = message.chat.id;
  const lang = (await getOrCreateBotUserAndReturnLanguage(telegramId, message.from?.first_name)) as SupportedLang || "en";

  try {
    const activeDebts = await getActiveDebts(telegramId);

    if (activeDebts.length === 0) {
      await telegramRequest("sendMessage", {
        chat_id: chatId,
        text: getBotMessage("debt_list_empty", lang),
      });
      return;
    }

    const lines: string[] = [getBotMessage("debt_list_title", lang), ""];

    for (const debt of activeDebts) {
      const emoji = debt.direction === "owed_to_me" ? "💰" : "💳";
      const dueText = debt.dueDate
        ? ` (due: ${new Date(debt.dueDate).toLocaleDateString()})`
        : "";
      lines.push(`${emoji} ${debt.name}: ${debt.amount}${dueText}`);
      lines.push(`   /settle ${debt.id.slice(0, 8)}`);
    }

    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: lines.join("\n"),
    });
  } catch (err) {
    logger.error({ err }, "Error listing debts");
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: "Error listing debts. Please try again.",
    });
  }
}

async function handleSettleDebt(message: TelegramMessage, debtIdPrefix: string): Promise<void> {
  const telegramId = message.from?.id;
  if (!telegramId) return;

  const chatId = message.chat.id;
  const lang = (await getOrCreateBotUserAndReturnLanguage(telegramId, message.from?.first_name)) as SupportedLang || "en";

  try {
    const activeDebts = await getActiveDebts(telegramId);
    const debt = activeDebts.find((d) => d.id.startsWith(debtIdPrefix));

    if (!debt) {
      await telegramRequest("sendMessage", {
        chat_id: chatId,
        text: "Debt not found. Use /debts to see active debts.",
      });
      return;
    }

    await settleDebt(telegramId, debt.id);
    const msg = getBotMessage("debt_settled", lang).replace("{name}", debt.name);

    await telegramRequest("sendMessage", { chat_id: chatId, text: msg });
  } catch (err) {
    logger.error({ err }, "Error settling debt");
    await telegramRequest("sendMessage", {
      chat_id: chatId,
      text: "Error settling debt. Please try again.",
    });
  }
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.message && isStartCommand(update.message.text)) {
    await handleStartCommand(update.message);
    return;
  }

  if (update.message?.text) {
    const text = update.message.text.trim();

    if (text.startsWith("/debt ")) {
      await handleAddDebt(update.message, text.slice(6));
      return;
    }

    if (text === "/debts") {
      await handleListDebts(update.message);
      return;
    }

    if (text.startsWith("/settle ")) {
      await handleSettleDebt(update.message, text.slice(8));
      return;
    }
  }

  if (update.message?.voice) {
    await handleVoiceMessage(update.message);
    return;
  }

  if (update.message?.photo && update.message.photo.length > 0) {
    await handlePhotoMessage(update.message);
    return;
  }

  if (update.callback_query?.data?.startsWith("lang:")) {
    await handleLanguageCallback(update.callback_query);
  }
}

async function configureBot(): Promise<void> {
  const commands: BotCommand[] = [
    {
      command: "start",
      description: "Open Save Up Mini App",
    },
    {
      command: "debt",
      description: "Track a debt: /debt name | amount | owed_to_me/i_owe",
    },
    {
      command: "debts",
      description: "List all active debts",
    },
    {
      command: "settle",
      description: "Settle a debt: /settle <id>",
    },
  ];

  await telegramRequest("deleteWebhook", {
    drop_pending_updates: false,
  });

  await telegramRequest("setMyCommands", {
    commands,
  });
}

async function pollUpdates(): Promise<void> {
  let offset = 0;

  while (true) {
    try {
      const updates = await telegramRequest<TelegramUpdate[]>("getUpdates", {
        offset,
        timeout: 30,
        allowed_updates: ["message", "callback_query"],
      });

      if (updates.length > 0) {
        offset = Math.max(...updates.map((u) => u.update_id)) + 1;
        await Promise.allSettled(
          updates.map(async (update) => {
            try {
              await handleUpdate(update);
            } catch (err) {
              logger.error({ err, updateId: update.update_id }, "Error processing Telegram update");
            }
          })
        );
      }
    } catch (error) {
      if (isPollingConflict(error)) {
        logger.info("Another Telegram bot instance is already polling. Skipping this instance.");
        cleanupBotLock();
        process.exit(0);
      }

      logger.error({ err: error }, "Telegram bot polling error");
      await sleep(3_000);
    }
  }
}

async function startBot(): Promise<void> {
  if (!acquireBotLock()) {
    process.exit(0);
  }

  process.on("exit", cleanupBotLock);
  process.on("SIGINT", () => {
    cleanupBotLock();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanupBotLock();
    process.exit(0);
  });

  initTelegramApi(env.TELEGRAM_BOT_TOKEN);
  await configureBot();
  startReminderScheduler(env.TELEGRAM_BOT_TOKEN);
  startRecurringScheduler();
  startWeeklyReportScheduler();
  startCategoryAlertScheduler();
  startSavingsMilestoneScheduler();
  logger.info("Telegram bot polling started.");
  await pollUpdates();
}

startBot().catch((error) => {
  cleanupBotLock();
  logger.error({ err: error }, "Telegram bot failed to start");
  process.exit(1);
});
