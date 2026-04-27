import type { RpcHandler } from "../types.js";

import { completeOnboarding, getStatusByTelegramId, initUserStatus, setUserLanguage } from "../../services/user.service.js";

export const initUserHandler: RpcHandler<"user.init"> = async ({ initData }, { app }) => {
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return initUserStatus(telegramId, telegramAuth.user);
};

export const getUserStatusHandler: RpcHandler<"user.getStatus"> = async ({ initData }, { app }) => {
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return getStatusByTelegramId(telegramId, telegramAuth.user);
};

export const completeOnboardingHandler: RpcHandler<"user.completeOnboarding"> = async ({ initData }, { app }) => {
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return completeOnboarding(telegramId);
};

export const setLanguageHandler: RpcHandler<"user.setLanguage"> = async ({ initData, language }, { app }) => {
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return setUserLanguage(telegramId, language);
};
