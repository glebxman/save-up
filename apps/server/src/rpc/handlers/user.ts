import {
  addCustomCategory,
  completeOnboarding,
  deleteCustomCategory,
  getStatusByTelegramId,
  setCategoryCustomization,
  setCategoryLimits,
  setNotificationSettings,
  setUserLanguage,
  setUserPin,
  verifyUserPin,
  removeUserPin,
  createAccount,
  updateAccount,
  deleteAccount,
  setCryptoHolding,
  sendExportToTelegram,
} from "../../services/user/index.js";
import {
  userInitSchema,
  userGetStatusSchema,
  userCompleteOnboardingSchema,
  userSetLanguageSchema,
  userSetCategoryCustomizationSchema,
  userAddCustomCategorySchema,
  userDeleteCustomCategorySchema,
  userSetCategoryLimitsSchema,
  userSetNotificationSettingsSchema,
  userSetPinSchema,
  userVerifyPinSchema,
  userRemovePinSchema,
  userCreateAccountSchema,
  userUpdateAccountSchema,
  userDeleteAccountSchema,
  userSetCryptoHoldingSchema,
  userSendExportToTelegramSchema,
} from "../validation.js";
import type { RpcHandler } from "../types.js";
import { defineAuthenticatedRpc, isMaintenanceMode } from "./shared.js";
import { db } from "../../config/database.js";
import { users } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { getBotMessage } from "../../utils/i18n.js";

async function authenticateAndGetStatus(
  initData: string,
  app: Parameters<RpcHandler<"user.init">>[1]["app"],
) {
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new AppError(ErrorCode.UNAUTHORIZED, "Telegram user ID is missing in initData");
  }

  if (isMaintenanceMode()) {
    const [user] = await db
      .select({ isAdmin: users.isAdmin, language: users.language })
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .limit(1);

    const isAdmin = user?.isAdmin ?? false;
    if (!isAdmin) {
      const lang = user?.language ?? "en";
      const msg = getBotMessage("maintenance_mode", lang) || "Бот находится на технических работах. Пожалуйста, попробуйте позже.";
      throw new AppError(ErrorCode.FORBIDDEN, msg);
    }
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

export const completeOnboardingHandler = defineAuthenticatedRpc(
  "user.completeOnboarding",
  userCompleteOnboardingSchema,
  ({ telegramId }) => completeOnboarding(telegramId),
);

export const setLanguageHandler = defineAuthenticatedRpc(
  "user.setLanguage",
  userSetLanguageSchema,
  ({ telegramId, language }) => setUserLanguage(telegramId, language),
);

export const setCategoryCustomizationHandler = defineAuthenticatedRpc(
  "user.setCategoryCustomization",
  userSetCategoryCustomizationSchema,
  ({ telegramId, category, name, emoji }) =>
    setCategoryCustomization(telegramId, category, name, emoji),
);

export const addCustomCategoryHandler = defineAuthenticatedRpc(
  "user.addCustomCategory",
  userAddCustomCategorySchema,
  ({ telegramId, name, emoji }) => addCustomCategory(telegramId, name, emoji),
);

export const deleteCustomCategoryHandler = defineAuthenticatedRpc(
  "user.deleteCustomCategory",
  userDeleteCustomCategorySchema,
  ({ telegramId, id }) => deleteCustomCategory(telegramId, id),
);

export const setCategoryLimitsHandler = defineAuthenticatedRpc(
  "user.setCategoryLimits",
  userSetCategoryLimitsSchema,
  ({ telegramId, limits }) => setCategoryLimits(telegramId, limits),
);

export const setNotificationSettingsHandler = defineAuthenticatedRpc(
  "user.setNotificationSettings",
  userSetNotificationSettingsSchema,
  ({ telegramId, enabled, frequency, timezoneOffset }) =>
    setNotificationSettings(telegramId, enabled, frequency, timezoneOffset),
);

export const createAccountHandler = defineAuthenticatedRpc(
  "user.createAccount",
  userCreateAccountSchema,
  ({ telegramId, name, type, currency, initialBalance, holdings }) =>
    createAccount(telegramId, { name, type, currency, initialBalance, holdings }),
);

export const updateAccountHandler = defineAuthenticatedRpc(
  "user.updateAccount",
  userUpdateAccountSchema,
  ({ telegramId, accountId, name }) => updateAccount(telegramId, { accountId, name }),
);

export const setCryptoHoldingHandler = defineAuthenticatedRpc(
  "user.setCryptoHolding",
  userSetCryptoHoldingSchema,
  ({ telegramId, accountId, symbol, amount }) =>
    setCryptoHolding(telegramId, { accountId, symbol, amount }),
);

export const deleteAccountHandler = defineAuthenticatedRpc(
  "user.deleteAccount",
  userDeleteAccountSchema,
  ({ telegramId, accountId }) => deleteAccount(telegramId, accountId),
);

export const setPinHandler = defineAuthenticatedRpc(
  "user.setPin",
  userSetPinSchema,
  ({ telegramId, pin }) => setUserPin(telegramId, pin),
);

export const verifyPinHandler = defineAuthenticatedRpc(
  "user.verifyPin",
  userVerifyPinSchema,
  ({ telegramId, pin }) => verifyUserPin(telegramId, pin),
);

export const removePinHandler = defineAuthenticatedRpc(
  "user.removePin",
  userRemovePinSchema,
  ({ telegramId, pin }) => removeUserPin(telegramId, pin),
);

export const sendExportToTelegramHandler = defineAuthenticatedRpc(
  "user.sendExportToTelegram",
  userSendExportToTelegramSchema,
  ({ telegramId, base64Data, filename }) => sendExportToTelegram(telegramId, base64Data, filename),
);
