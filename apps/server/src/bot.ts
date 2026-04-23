import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { env } from "./config/env.js";

interface TelegramUser {
  id: number;
  first_name?: string;
}

interface TelegramChat {
  id: number;
}

interface TelegramMessage {
  chat: TelegramChat;
  text?: string;
  from?: TelegramUser;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
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

async function sendStartMessage(chatId: number, firstName?: string): Promise<void> {
  const greetingName = firstName?.trim() ? `, ${firstName}` : "";

  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text: `👋 Hello${greetingName}! Welcome to Save Up!\n\nI'm your personal savings assistant. Let's help you reach your financial goals! 💰`,
  });
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;

  if (!message || !isStartCommand(message.text)) {
    return;
  }

  await sendStartMessage(message.chat.id, message.from?.first_name);
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
        allowed_updates: ["message"],
      });

      for (const update of updates) {
        offset = update.update_id + 1;
        await handleUpdate(update);
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
  console.log("Telegram bot polling started.");
  await pollUpdates();
}

startBot().catch((error) => {
  cleanupBotLock();
  console.error("Telegram bot failed to start:", error);
  process.exit(1);
});
