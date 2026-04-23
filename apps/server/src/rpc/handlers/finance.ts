import type { RpcHandler } from "../types.js";

import {
  addExpense,
  addIncome,
  applyRecurringTransaction,
  archiveTransaction,
  deleteRecurringTransaction,
  getCategoryBreakdown,
  getRecentExpenses,
  getReport,
  getTransactions,
  newMonth,
  restoreTransaction,
  saveRecurringTransaction,
  transferSavings,
  updateSavingsGoal,
  updateTransaction,
} from "../../services/finance.service.js";

async function getTelegramId(
  initData: string,
  authenticateTelegram: (value: string) => Promise<{ user?: { id?: number } }>,
): Promise<number> {
  const telegramAuth = await authenticateTelegram(initData);
  const telegramId = telegramAuth.user?.id;

  if (!telegramId) {
    throw new Error("Telegram user ID is missing in initData");
  }

  return telegramId;
}

export const addIncomeHandler: RpcHandler<"finance.addIncome"> = async ({
  initData,
  amount,
  savingsAmt,
  note,
  occurredAt,
}, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return addIncome(telegramId, amount, savingsAmt, note, occurredAt);
};

export const addExpenseHandler: RpcHandler<"finance.addExpense"> = async ({
  initData,
  amount,
  category,
  note,
  occurredAt,
}, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return addExpense(telegramId, amount, category, note, occurredAt);
};

export const transferSavingsHandler: RpcHandler<"finance.transferSavings"> = async ({
  initData,
  amount,
  direction,
  note,
  occurredAt,
}, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return transferSavings(telegramId, amount, direction, note, occurredAt);
};

export const getRecentExpensesHandler: RpcHandler<"finance.getRecentExpenses"> = async ({ initData, limit }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return getRecentExpenses(telegramId, limit);
};

export const getTransactionsHandler: RpcHandler<"finance.getTransactions"> = async ({ initData, filters }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return getTransactions(telegramId, filters);
};

export const updateTransactionHandler: RpcHandler<"finance.updateTransaction"> = async ({ initData, payload }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return updateTransaction(telegramId, payload);
};

export const archiveTransactionHandler: RpcHandler<"finance.archiveTransaction"> = async ({ initData, transactionId }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return archiveTransaction(telegramId, transactionId);
};

export const restoreTransactionHandler: RpcHandler<"finance.restoreTransaction"> = async ({ initData, transactionId }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return restoreTransaction(telegramId, transactionId);
};

export const updateSavingsGoalHandler: RpcHandler<"finance.updateSavingsGoal"> = async ({ initData, goal }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return updateSavingsGoal(telegramId, goal);
};

export const saveRecurringTransactionHandler: RpcHandler<"finance.saveRecurringTransaction"> = async ({ initData, template }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return saveRecurringTransaction(telegramId, template);
};

export const deleteRecurringTransactionHandler: RpcHandler<"finance.deleteRecurringTransaction"> = async ({ initData, templateId }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return deleteRecurringTransaction(telegramId, templateId);
};

export const applyRecurringTransactionHandler: RpcHandler<"finance.applyRecurringTransaction"> = async ({ initData, templateId }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return applyRecurringTransaction(telegramId, templateId);
};

export const getReportHandler: RpcHandler<"finance.getReport"> = async ({ initData, monthKey }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return getReport(telegramId, monthKey);
};

export const getCategoryBreakdownHandler: RpcHandler<"finance.getCategoryBreakdown"> = async ({ initData, monthKey }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return getCategoryBreakdown(telegramId, monthKey);
};

export const newMonthHandler: RpcHandler<"finance.newMonth"> = async ({ initData }, { app }) => {
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return newMonth(telegramId);
};
