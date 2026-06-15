import { sendTelegramDocument } from "../../utils/telegram-api.js";

export async function sendExportToTelegram(
  telegramId: number,
  base64Data: string,
  filename: string,
): Promise<{ ok: boolean }> {
  await sendTelegramDocument(telegramId, base64Data, filename);
  return { ok: true };
}
