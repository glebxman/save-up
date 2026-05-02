import type { RpcHandler } from "../types.js";
import {
  addExpense,
  addIncome,
  applyRecurringTransaction,
  archiveTransaction,
  convertCurrency,
  deleteRecurringTransaction,
  getCategoryBreakdown,
  getRecentExpenses,
  getReport,
  getTransactions,
  newMonth,
  resetAccountData,
  restoreTransaction,
  saveRecurringTransaction,
  transferSavings,
  updateBalance,
  updateSavingsGoal,
  updateTransaction,
  refreshRates,
  processVoice,
} from "../../services/finance.service.js";

import {
  financeAddIncomeSchema,
  financeAddExpenseSchema,
  financeTransferSavingsSchema,
  financeGetRecentExpensesSchema,
  financeGetTransactionsSchema,
  financeUpdateTransactionSchema,
  financeArchiveTransactionSchema,
  financeRestoreTransactionSchema,
  financeUpdateSavingsGoalSchema,
  financeUpdateBalanceSchema,
  financeResetAccountDataSchema,
  financeSaveRecurringTransactionSchema,
  financeDeleteRecurringTransactionSchema,
  financeApplyRecurringTransactionSchema,
  financeGetReportSchema,
  financeGetCategoryBreakdownSchema,
  financeNewMonthSchema,
  financeConvertCurrencySchema,
  financeRefreshRatesSchema,
  financeProcessVoiceSchema,
} from "../validation.js";



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

export const addIncomeHandler: RpcHandler<"finance.addIncome"> = async (params, { app }) => {
  const { initData, amount, savingsAmt, note, occurredAt } = financeAddIncomeSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return addIncome(telegramId, amount, savingsAmt === null ? undefined : savingsAmt, note, occurredAt);
};

export const addExpenseHandler: RpcHandler<"finance.addExpense"> = async (params, { app }) => {
  const { initData, amount, category, note, occurredAt } = financeAddExpenseSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return addExpense(telegramId, amount, category as any, note, occurredAt);
};

export const transferSavingsHandler: RpcHandler<"finance.transferSavings"> = async (params, { app }) => {
  const { initData, amount, direction, note, occurredAt } = financeTransferSavingsSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return transferSavings(telegramId, amount, direction, note, occurredAt);
};

export const getRecentExpensesHandler: RpcHandler<"finance.getRecentExpenses"> = async (params, { app }) => {
  const { initData, limit } = financeGetRecentExpensesSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return getRecentExpenses(telegramId, limit);
};

export const getTransactionsHandler: RpcHandler<"finance.getTransactions"> = async (params, { app }) => {
  const { initData, filters } = financeGetTransactionsSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return getTransactions(telegramId, filters as any);
};

export const updateTransactionHandler: RpcHandler<"finance.updateTransaction"> = async (params, { app }) => {
  const { initData, payload } = financeUpdateTransactionSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return updateTransaction(telegramId, payload as any);
};

export const archiveTransactionHandler: RpcHandler<"finance.archiveTransaction"> = async (params, { app }) => {
  const { initData, transactionId } = financeArchiveTransactionSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return archiveTransaction(telegramId, transactionId);
};

export const restoreTransactionHandler: RpcHandler<"finance.restoreTransaction"> = async (params, { app }) => {
  const { initData, transactionId } = financeRestoreTransactionSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return restoreTransaction(telegramId, transactionId);
};

export const updateSavingsGoalHandler: RpcHandler<"finance.updateSavingsGoal"> = async (params, { app }) => {
  const { initData, goal } = financeUpdateSavingsGoalSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return updateSavingsGoal(telegramId, goal);
};

export const updateBalanceHandler: RpcHandler<"finance.updateBalance"> = async (params, { app }) => {
  const { initData, balance } = financeUpdateBalanceSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return updateBalance(telegramId, balance);
};

export const resetAccountDataHandler: RpcHandler<"finance.resetAccountData"> = async (params, { app }) => {
  const { initData } = financeResetAccountDataSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return resetAccountData(telegramId);
};

export const saveRecurringTransactionHandler: RpcHandler<"finance.saveRecurringTransaction"> = async (params, { app }) => {
  const { initData, template } = financeSaveRecurringTransactionSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return saveRecurringTransaction(telegramId, template as any);

};

export const deleteRecurringTransactionHandler: RpcHandler<"finance.deleteRecurringTransaction"> = async (params, { app }) => {
  const { initData, templateId } = financeDeleteRecurringTransactionSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return deleteRecurringTransaction(telegramId, templateId);
};

export const applyRecurringTransactionHandler: RpcHandler<"finance.applyRecurringTransaction"> = async (params, { app }) => {
  const { initData, templateId } = financeApplyRecurringTransactionSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return applyRecurringTransaction(telegramId, templateId);
};

export const getReportHandler: RpcHandler<"finance.getReport"> = async (params, { app }) => {
  const { initData, monthKey } = financeGetReportSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return getReport(telegramId, monthKey);
};

export const getCategoryBreakdownHandler: RpcHandler<"finance.getCategoryBreakdown"> = async (params, { app }) => {
  const { initData, monthKey } = financeGetCategoryBreakdownSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return getCategoryBreakdown(telegramId, monthKey);
};

export const newMonthHandler: RpcHandler<"finance.newMonth"> = async (params, { app }) => {
  const { initData } = financeNewMonthSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return newMonth(telegramId);
};

export const convertCurrencyHandler: RpcHandler<"finance.convertCurrency"> = async (params, { app }) => {
  const { initData, rate } = financeConvertCurrencySchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return convertCurrency(telegramId, rate);
};

export const refreshRatesHandler: RpcHandler<"finance.refreshRates"> = async (params, { app }) => {
  const { initData } = financeRefreshRatesSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return refreshRates(telegramId);
};

export const processVoiceHandler: RpcHandler<"finance.processVoice"> = async (params, { app }) => {
  const { initData, base64Audio } = financeProcessVoiceSchema.parse(params);
  const telegramId = await getTelegramId(initData, app.authenticateTelegram.bind(app));
  return processVoice(telegramId, base64Audio);
};


