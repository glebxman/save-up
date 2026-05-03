import type { RpcHandler } from "../types.js";
import { addCustomCategory, completeOnboarding, deleteCustomCategory, getStatusByTelegramId, setCategoryCustomization, setUserLanguage } from "../../services/user.service.js";
import { userInitSchema, userGetStatusSchema, userCompleteOnboardingSchema, userSetLanguageSchema, userSetCategoryCustomizationSchema, userAddCustomCategorySchema, userDeleteCustomCategorySchema } from "../validation.js";
import { getTelegramId } from "./shared.js";

async function authenticateAndGetStatus(
  initData: string,
  app: Parameters<RpcHandler<"user.init">>[1]["app"],
) {
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return getStatusByTelegramId(telegramId, telegramAuth.user);
}

export const initUserHandler: RpcHandler<"user.init"> = async (params, { app }) => {
  const { initData } = userInitSchema.parse(params);
  return authenticateAndGetStatus(initData, app);
};

export const getUserStatusHandler: RpcHandler<"user.getStatus"> = async (params, { app }) => {
  const { initData } = userGetStatusSchema.parse(params);
  return authenticateAndGetStatus(initData, app);
};

export const completeOnboardingHandler: RpcHandler<"user.completeOnboarding"> = async (params, { app }) => {
  const { initData } = userCompleteOnboardingSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return completeOnboarding(telegramId);
};

export const setLanguageHandler: RpcHandler<"user.setLanguage"> = async (params, { app }) => {
  const { initData, language } = userSetLanguageSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return setUserLanguage(telegramId, language);
};

export const setCategoryCustomizationHandler: RpcHandler<"user.setCategoryCustomization"> = async (params, { app }) => {
  const { initData, category, name, emoji } = userSetCategoryCustomizationSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return setCategoryCustomization(telegramId, category, name, emoji);
};

export const addCustomCategoryHandler: RpcHandler<"user.addCustomCategory"> = async (params, { app }) => {
  const { initData, name, emoji } = userAddCustomCategorySchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return addCustomCategory(telegramId, name, emoji);
};

export const deleteCustomCategoryHandler: RpcHandler<"user.deleteCustomCategory"> = async (params, { app }) => {
  const { initData, id } = userDeleteCustomCategorySchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return deleteCustomCategory(telegramId, id);
};
