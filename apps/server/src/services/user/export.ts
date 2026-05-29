import { env } from "../../config/env.js";

export async function sendExportToTelegram(
  telegramId: number,
  base64Data: string,
  filename: string,
): Promise<{ ok: boolean }> {
  const buffer = Buffer.from(base64Data, "base64");

  const formData = new FormData();
  formData.append("chat_id", String(telegramId));
  formData.append("document", new Blob([buffer]), filename);

  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to send Telegram document: ${res.statusText} - ${err}`);
  }

  return { ok: true };
}
