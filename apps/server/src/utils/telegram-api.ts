import { env } from "../config/env.js";

interface TelegramApiResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

let apiBaseUrl = "";

export function initTelegramApi(botToken?: string): void {
  apiBaseUrl = `https://api.telegram.org/bot${botToken ?? env.TELEGRAM_BOT_TOKEN}`;
}

export async function telegramRequest<T>(method: string, payload?: Record<string, unknown>): Promise<T> {
  if (!apiBaseUrl) {
    initTelegramApi();
  }

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

export async function sendTelegramDocument(
  telegramId: number,
  base64Data: string,
  filename: string,
): Promise<void> {
  if (!apiBaseUrl) {
    initTelegramApi();
  }

  const buffer = Buffer.from(base64Data, "base64");
  const formData = new FormData();
  formData.append("chat_id", String(telegramId));
  formData.append("document", new Blob([buffer]), filename);

  const res = await fetch(`${apiBaseUrl}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to send Telegram document: ${res.statusText} - ${err}`);
  }
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
): Promise<void> {
  if (!apiBaseUrl) {
    initTelegramApi();
  }

  const res = await fetch(`${apiBaseUrl}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.statusText} - ${err}`);
  }
}
