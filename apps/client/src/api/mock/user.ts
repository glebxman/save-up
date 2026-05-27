import type { CustomCategory } from "@finance-twa/shared-types";

import { ensureUser, saveUser } from "./_db";
import { parseTelegramIdFromInitData, parseTelegramUserFromInitData, roundAmount, createId } from "./_helpers";
import { buildStatus } from "./_status";
import type { MockHandler } from "./_types";

export const userInit: MockHandler<"user.init"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId, parseTelegramUserFromInitData(params.initData));
  return await buildStatus(user);
};

export const userGetStatus: MockHandler<"user.getStatus"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId, parseTelegramUserFromInitData(params.initData));
  return await buildStatus(user);
};

export const userCompleteOnboarding: MockHandler<"user.completeOnboarding"> = (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  user.onboardingCompleted = true;
  saveUser(user);
  return { ok: true as const };
};

export const userSetLanguage: MockHandler<"user.setLanguage"> = (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  user.language = params.language;
  saveUser(user);
  return { ok: true as const };
};

export const userSetCategoryCustomization: MockHandler<"user.setCategoryCustomization"> = (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  user.categoryCustomizations = {
    ...(user.categoryCustomizations ?? {}),
    [params.category]: {
      name: params.name.trim() || undefined,
      emoji: params.emoji.trim() || undefined,
    },
  };
  saveUser(user);
  return { ok: true as const };
};

export const userAddCustomCategory: MockHandler<"user.addCustomCategory"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const current: CustomCategory[] = user.customCategories ?? [];
  if (current.length >= 8) {
    throw new Error("Maximum of 8 custom categories reached");
  }
  const id = `c_${Math.random().toString(36).slice(2, 12)}`;
  user.customCategories = [...current, { id, name: params.name.trim(), emoji: params.emoji.trim() }];
  saveUser(user);
  return buildStatus(user);
};

export const userDeleteCustomCategory: MockHandler<"user.deleteCustomCategory"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  user.customCategories = (user.customCategories ?? []).filter((c) => c.id !== params.id);
  saveUser(user);
  return buildStatus(user);
};

export const userSetCategoryLimits: MockHandler<"user.setCategoryLimits"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const sanitized: Record<string, number> = {};
  for (const [key, raw] of Object.entries(params.limits ?? {})) {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) continue;
    sanitized[key] = roundAmount(value);
  }
  user.categoryLimits = sanitized;
  saveUser(user);
  return buildStatus(user);
};

export const userSetNotificationSettings: MockHandler<"user.setNotificationSettings"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  user.notificationsConfigured = true;
  user.notificationsEnabled = !!params.enabled;
  user.notificationFrequency = params.frequency;
  user.notificationTimezoneOffset = Math.max(-720, Math.min(840, Math.trunc(params.timezoneOffset)));
  saveUser(user);
  return buildStatus(user);
};

export const userCreateAccount: MockHandler<"user.createAccount"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const newAccount = {
    id: createId(),
    userId: user.id,
    name: params.name,
    type: params.type,
    currency: params.currency,
    balance: params.initialBalance,
    createdAt: new Date().toISOString(),
  };
  user.accounts = [...(user.accounts ?? []), newAccount];
  user.balance = roundAmount(user.balance + params.initialBalance);
  saveUser(user);
  return buildStatus(user);
};

export const userUpdateAccount: MockHandler<"user.updateAccount"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  user.accounts = (user.accounts ?? []).map((acc) => {
    if (acc.id === params.accountId) {
      return { ...acc, name: params.name };
    }
    return acc;
  });
  saveUser(user);
  return buildStatus(user);
};

export const userDeleteAccount: MockHandler<"user.deleteAccount"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  user.accounts = (user.accounts ?? []).filter((acc) => acc.id !== params.accountId);
  saveUser(user);
  return buildStatus(user);
};

export const userSetPin: MockHandler<"user.setPin"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  // Store a simple hash in mock (not real crypto, just for testing).
  (user as any)._pinHash = params.pin;
  saveUser(user);
  return { ok: true as const };
};

export const userVerifyPin: MockHandler<"user.verifyPin"> = (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const ok = (user as any)._pinHash === params.pin;
  return { ok };
};

export const userRemovePin: MockHandler<"user.removePin"> = (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  if ((user as any)._pinHash !== params.pin) {
    throw new Error("Wrong PIN");
  }
  delete (user as any)._pinHash;
  saveUser(user);
  return { ok: true as const };
};
