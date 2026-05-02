import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { eq } from "drizzle-orm";

import { db } from "./config/database.js";
import { env } from "./config/env.js";
import { users } from "./db/schema/index.js";
import type { ExpenseCategory } from "@finance-twa/shared-types";
import { startReminderScheduler } from "./reminder.js";

interface TelegramUser {
  id: number;
  first_name?: string;
}

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

interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

interface BotLock {
  pid: number;
}

type BotCommand = {
  command: string;
  description: string;
};

type SupportedLang = "en" | "ru" | "uz" | "kk" | "zh" | "ja" | "ko" | "tr" | "es" | "fr" | "de";

const SUPPORTED_LANGUAGES: SupportedLang[] = ["en", "ru", "uz", "kk", "zh", "ja", "ko", "tr", "es", "fr", "de"];

const LANGUAGE_LABELS: Record<SupportedLang, string> = {
  en: "English",
  ru: "Русский",
  uz: "O'zbek",
  kk: "Қазақша",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  tr: "Türkçe",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
};

const LANGUAGE_FLAGS: Record<SupportedLang, string> = {
  en: "🇬🇧",
  ru: "🇷🇺",
  uz: "🇺🇿",
  kk: "🇰🇿",
  zh: "🇨🇳",
  ja: "🇯🇵",
  ko: "🇰🇷",
  tr: "🇹🇷",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
};

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

import { addExpense, addIncome, processVoice } from "./services/finance.service.js";

const BOT_MESSAGES: Record<SupportedLang, Record<string, string>> = {
  en, ru, uz, kk, zh, ja, ko, tr, es, fr, de,
};

function getBotMessage(key: string, lang: SupportedLang): string {
  return BOT_MESSAGES[lang]?.[key] ?? BOT_MESSAGES["en"]?.[key] ?? "";
}

const apiBaseUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;
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
    console.log(`Telegram bot is already running in process ${existingLock.pid}. Skipping this duplicate instance.`);
    return false;
  }

  try {
    fs.writeFileSync(botLockPath, JSON.stringify({ pid: process.pid }), "utf8");
    return true;
  } catch (error) {
    console.error("Failed to create Telegram bot lock file:", error);
    return false;
  }
}

function isPollingConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Conflict: terminated by other getUpdates request");
}

async function telegramRequest<T>(method: string, payload?: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const data = (await response.json()) as TelegramApiResponse<T>;

  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? `Telegram API request failed for ${method}`);
  }

  return data.result;
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
    console.error("Voice processing error:", err);
    await telegramRequest("editMessageText", {
      chat_id: chatId,
      message_id: processingMsg.message_id,
      text: isLimitError
        ? (getBotMessage("voice_limit_reached", lang) || "⚠️ Дневной лимит голосовых запросов исчерпан. Попробуйте завтра.")
        : (getBotMessage("voice_error", lang) || "❌ Произошла ошибка при обработке."),
    });
  }
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.message && isStartCommand(update.message.text)) {
    await handleStartCommand(update.message);
    return;
  }

  if (update.message?.voice) {
    await handleVoiceMessage(update.message);
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
              console.error(`Error processing update ${update.update_id}: `, err);
            }
          })
        );
      }
    } catch (error) {
      if (isPollingConflict(error)) {
        console.log("Another Telegram bot instance is already polling updates. Skipping this duplicate instance.");
        cleanupBotLock();
        process.exit(0);
      }

      console.error("Telegram bot polling error:", error);
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

  await configureBot();
  startReminderScheduler(env.TELEGRAM_BOT_TOKEN);
  console.log("Telegram bot polling started.");
  await pollUpdates();
}

startBot().catch((error) => {
  cleanupBotLock();
  console.error("Telegram bot failed to start:", error);
  process.exit(1);
});
