import type { RpcHandler } from "../types.js";

import { getStatusByTelegramId, initUserStatus } from "../../services/user.service.js";

export const initUserHandler: RpcHandler<"user.init"> = async ({ initData }, { app }) => {
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return initUserStatus(telegramId);
};

export const getUserStatusHandler: RpcHandler<"user.getStatus"> = async ({ telegramId }) => {
  return getStatusByTelegramId(telegramId);
};
