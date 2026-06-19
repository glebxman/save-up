import {
  addExpense,
  addIncome,
  applyRecurringTransaction,
  archiveTransaction,
  convertCurrency,
  deleteRecurringTransaction,
  getCategoryBreakdown,
  getDailyTrend,
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
  transferBetweenAccounts,
} from "../../services/finance/index.js";
import { addDebt, deleteDebt, getActiveDebts, mapDebtRow, settleDebt } from "../../services/finance/debts.js";
import {
  financeAddIncomeSchema,
  financeAddExpenseSchema,
  financeTransferSavingsSchema,
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
  financeGetDailyTrendSchema,
  financeNewMonthSchema,
  financeConvertCurrencySchema,
  financeRefreshRatesSchema,
  financeProcessVoiceSchema,
  financeTransferBetweenAccountsSchema,
  financeAddDebtSchema,
  financeGetDebtsSchema,
  financeSettleDebtSchema,
  financeDeleteDebtSchema,
} from "../validation.js";
import { defineAuthenticatedRpc } from "./shared.js";

export const addIncomeHandler = defineAuthenticatedRpc(
  "finance.addIncome",
  financeAddIncomeSchema,
  ({ telegramId, amount, savingsAmt, note, occurredAt, accountId }) =>
    addIncome(telegramId, amount, savingsAmt ?? undefined, note, occurredAt, accountId),
);

export const addExpenseHandler = defineAuthenticatedRpc(
  "finance.addExpense",
  financeAddExpenseSchema,
  ({ telegramId, amount, category, note, occurredAt, accountId }) =>
    addExpense(telegramId, amount, category, note, occurredAt, accountId),
);

export const transferSavingsHandler = defineAuthenticatedRpc(
  "finance.transferSavings",
  financeTransferSavingsSchema,
  ({ telegramId, amount, direction, note, occurredAt, accountId }) =>
    transferSavings(telegramId, amount, direction, note, occurredAt, accountId),
);

export const getTransactionsHandler = defineAuthenticatedRpc(
  "finance.getTransactions",
  financeGetTransactionsSchema,
  ({ telegramId, filters }) => getTransactions(telegramId, filters),
);

export const updateTransactionHandler = defineAuthenticatedRpc(
  "finance.updateTransaction",
  financeUpdateTransactionSchema,
  ({ telegramId, payload }) => updateTransaction(telegramId, payload),
);

export const archiveTransactionHandler = defineAuthenticatedRpc(
  "finance.archiveTransaction",
  financeArchiveTransactionSchema,
  ({ telegramId, transactionId }) => archiveTransaction(telegramId, transactionId),
);

export const restoreTransactionHandler = defineAuthenticatedRpc(
  "finance.restoreTransaction",
  financeRestoreTransactionSchema,
  ({ telegramId, transactionId }) => restoreTransaction(telegramId, transactionId),
);

export const updateSavingsGoalHandler = defineAuthenticatedRpc(
  "finance.updateSavingsGoal",
  financeUpdateSavingsGoalSchema,
  ({ telegramId, goal }) => updateSavingsGoal(telegramId, goal),
);

export const updateBalanceHandler = defineAuthenticatedRpc(
  "finance.updateBalance",
  financeUpdateBalanceSchema,
  ({ telegramId, balance }) => updateBalance(telegramId, balance),
);

export const resetAccountDataHandler = defineAuthenticatedRpc(
  "finance.resetAccountData",
  financeResetAccountDataSchema,
  ({ telegramId }) => resetAccountData(telegramId),
);

export const saveRecurringTransactionHandler = defineAuthenticatedRpc(
  "finance.saveRecurringTransaction",
  financeSaveRecurringTransactionSchema,
  ({ telegramId, template }) => saveRecurringTransaction(telegramId, template),
);

export const deleteRecurringTransactionHandler = defineAuthenticatedRpc(
  "finance.deleteRecurringTransaction",
  financeDeleteRecurringTransactionSchema,
  ({ telegramId, templateId }) => deleteRecurringTransaction(telegramId, templateId),
);

export const applyRecurringTransactionHandler = defineAuthenticatedRpc(
  "finance.applyRecurringTransaction",
  financeApplyRecurringTransactionSchema,
  ({ telegramId, templateId }) => applyRecurringTransaction(telegramId, templateId),
);

export const getReportHandler = defineAuthenticatedRpc(
  "finance.getReport",
  financeGetReportSchema,
  ({ telegramId, monthKey }) => getReport(telegramId, monthKey),
);

export const getCategoryBreakdownHandler = defineAuthenticatedRpc(
  "finance.getCategoryBreakdown",
  financeGetCategoryBreakdownSchema,
  ({ telegramId, monthKey }) => getCategoryBreakdown(telegramId, monthKey),
);

export const getDailyTrendHandler = defineAuthenticatedRpc(
  "finance.getDailyTrend",
  financeGetDailyTrendSchema,
  ({ telegramId, monthKey }) => getDailyTrend(telegramId, monthKey),
);

export const newMonthHandler = defineAuthenticatedRpc(
  "finance.newMonth",
  financeNewMonthSchema,
  ({ telegramId }) => newMonth(telegramId),
);

export const convertCurrencyHandler = defineAuthenticatedRpc(
  "finance.convertCurrency",
  financeConvertCurrencySchema,
  ({ telegramId, rate }) => convertCurrency(telegramId, rate),
);

export const refreshRatesHandler = defineAuthenticatedRpc(
  "finance.refreshRates",
  financeRefreshRatesSchema,
  ({ telegramId }) => refreshRates(telegramId),
);

export const processVoiceHandler = defineAuthenticatedRpc(
  "finance.processVoice",
  financeProcessVoiceSchema,
  ({ telegramId, base64Audio }) => processVoice(telegramId, base64Audio),
);

export const transferBetweenAccountsHandler = defineAuthenticatedRpc(
  "finance.transferBetweenAccounts",
  financeTransferBetweenAccountsSchema,
  ({ telegramId, fromAccountId, toAccountId, amount, toAmount }) =>
    transferBetweenAccounts(telegramId, { fromAccountId, toAccountId, amount, toAmount }),
);

export const addDebtHandler = defineAuthenticatedRpc(
  "finance.addDebt",
  financeAddDebtSchema,
  async ({ telegramId, name, amount, direction, note, dueDate }) => {
    const debt = await addDebt(telegramId, { name, amount, direction, note, dueDate });
    return mapDebtRow(debt);
  },
);

export const getDebtsHandler = defineAuthenticatedRpc(
  "finance.getDebts",
  financeGetDebtsSchema,
  async ({ telegramId }) => {
    const result = await getActiveDebts(telegramId);
    return result.map(mapDebtRow);
  },
);

export const settleDebtHandler = defineAuthenticatedRpc(
  "finance.settleDebt",
  financeSettleDebtSchema,
  async ({ telegramId, debtId }) => {
    await settleDebt(telegramId, debtId);
    return { ok: true as const };
  },
);

export const deleteDebtHandler = defineAuthenticatedRpc(
  "finance.deleteDebt",
  financeDeleteDebtSchema,
  async ({ telegramId, debtId }) => {
    await deleteDebt(telegramId, debtId);
    return { ok: true as const };
  },
);
