import type { RpcHandler } from "../types.js";

import { addExpense, addIncome, getReport, newMonth } from "../../services/finance.service.js";

export const addIncomeHandler: RpcHandler<"finance.addIncome"> = async ({
  initData,
  amount,
  savingsPct,
}, { app }) => {
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return addIncome(telegramId, amount, savingsPct);
};

export const addExpenseHandler: RpcHandler<"finance.addExpense"> = async ({ initData, amount }, { app }) => {
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return addExpense(telegramId, amount);
};

export const getReportHandler: RpcHandler<"finance.getReport"> = async ({ initData, monthKey }, { app }) => {
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return getReport(telegramId, monthKey);
};

export const newMonthHandler: RpcHandler<"finance.newMonth"> = async ({ initData }, { app }) => {
  const telegramAuth = await app.authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return newMonth(telegramId);
};
