import type { RpcHandler } from "../types.js";
import { completeOnboarding, getStatusByTelegramId, setUserLanguage } from "../../services/user.service.js";
import { userInitSchema, userGetStatusSchema, userCompleteOnboardingSchema, userSetLanguageSchema } from "../validation.js";

export const initUserHandler: RpcHandler<"user.init"> = async (params, { app }) => {
  const { initData } = userInitSchema.parse(params);
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return getStatusByTelegramId(telegramId, telegramAuth.user);
};

export const getUserStatusHandler: RpcHandler<"user.getStatus"> = async (params, { app }) => {
  const { initData } = userGetStatusSchema.parse(params);
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return getStatusByTelegramId(telegramId, telegramAuth.user);
};

export const completeOnboardingHandler: RpcHandler<"user.completeOnboarding"> = async (params, { app }) => {
  const { initData } = userCompleteOnboardingSchema.parse(params);
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return completeOnboarding(telegramId);
};

export const setLanguageHandler: RpcHandler<"user.setLanguage"> = async (params, { app }) => {
  const { initData, language } = userSetLanguageSchema.parse(params);
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return setUserLanguage(telegramId, language);
};
