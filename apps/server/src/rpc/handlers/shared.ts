import { AppError, ErrorCode } from "../../utils/errors.js";

export async function getTelegramId(
  initData: string,
  authenticateTelegram: (value: string) => Promise<{ user?: { id?: number } }>,
): Promise<number> {
  const telegramAuth = await authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, "Telegram user ID is missing in initData");
  }

  return telegramId;
}
