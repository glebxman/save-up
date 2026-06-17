import type { RpcMethod } from "@finance-twa/shared-types";

import {
  listAdminUsersHandler,
  setAdminAccessHandler,
  resetUserPinHandler,
} from "./handlers/admin.js";
import {
  addExpenseHandler,
  addIncomeHandler,
  applyRecurringTransactionHandler,
  archiveTransactionHandler,
  convertCurrencyHandler,
  deleteRecurringTransactionHandler,
  getCategoryBreakdownHandler,
  getDailyTrendHandler,
  getRecentExpensesHandler,
  getReportHandler,
  getTransactionsHandler,
  newMonthHandler,
  resetAccountDataHandler,
  refreshRatesHandler,
  restoreTransactionHandler,
  saveRecurringTransactionHandler,
  transferSavingsHandler,
  updateBalanceHandler,
  updateSavingsGoalHandler,
  updateTransactionHandler,
  processVoiceHandler,
  transferBetweenAccountsHandler,
  addDebtHandler,
  getDebtsHandler,
  settleDebtHandler,
  deleteDebtHandler,
} from "./handlers/finance.js";

import {
  addCustomCategoryHandler,
  completeOnboardingHandler,
  createAccountHandler,
  deleteAccountHandler,
  deleteCustomCategoryHandler,
  getUserStatusHandler,
  initUserHandler,
  setCategoryCustomizationHandler,
  setCategoryLimitsHandler,
  setCryptoHoldingHandler,
  setLanguageHandler,
  setNotificationSettingsHandler,
  setPinHandler,
  removePinHandler,
  sendExportToTelegramHandler,
  updateAccountHandler,
  verifyPinHandler,
} from "./handlers/user.js";
import { AppError } from "../utils/errors.js";
import type { JsonRpcFailure, JsonRpcRequest, JsonRpcResponse, RpcContext, RpcHandler } from "./types.js";

type HandlerMap = {
  [Method in RpcMethod]: RpcHandler<Method>;
};

const handlers: HandlerMap = {
  "user.init": initUserHandler,
  "user.getStatus": getUserStatusHandler,
  "user.completeOnboarding": completeOnboardingHandler,
  "user.setLanguage": setLanguageHandler,
  "user.setCategoryCustomization": setCategoryCustomizationHandler,
  "user.sendExportToTelegram": sendExportToTelegramHandler,
  "user.addCustomCategory": addCustomCategoryHandler,
  "user.deleteCustomCategory": deleteCustomCategoryHandler,
  "user.setCategoryLimits": setCategoryLimitsHandler,
  "user.setNotificationSettings": setNotificationSettingsHandler,
  "user.setPin": setPinHandler,
  "user.verifyPin": verifyPinHandler,
  "user.removePin": removePinHandler,
  "admin.listUsers": listAdminUsersHandler,
  "admin.setAdmin": setAdminAccessHandler,
  "admin.resetPin": resetUserPinHandler,
  "finance.addIncome": addIncomeHandler,
  "finance.addExpense": addExpenseHandler,
  "finance.transferSavings": transferSavingsHandler,
  "finance.getRecentExpenses": getRecentExpensesHandler,
  "finance.getTransactions": getTransactionsHandler,
  "finance.updateTransaction": updateTransactionHandler,
  "finance.archiveTransaction": archiveTransactionHandler,
  "finance.restoreTransaction": restoreTransactionHandler,
  "finance.updateSavingsGoal": updateSavingsGoalHandler,
  "finance.updateBalance": updateBalanceHandler,
  "finance.resetAccountData": resetAccountDataHandler,
  "finance.saveRecurringTransaction": saveRecurringTransactionHandler,
  "finance.deleteRecurringTransaction": deleteRecurringTransactionHandler,
  "finance.applyRecurringTransaction": applyRecurringTransactionHandler,
  "finance.getReport": getReportHandler,
  "finance.getCategoryBreakdown": getCategoryBreakdownHandler,
  "finance.getDailyTrend": getDailyTrendHandler,
  "finance.newMonth": newMonthHandler,
  "finance.convertCurrency": convertCurrencyHandler,
  "finance.refreshRates": refreshRatesHandler,
  "finance.processVoice": processVoiceHandler,
  "user.createAccount": createAccountHandler,
  "user.updateAccount": updateAccountHandler,
  "user.setCryptoHolding": setCryptoHoldingHandler,
  "user.deleteAccount": deleteAccountHandler,
  "finance.transferBetweenAccounts": transferBetweenAccountsHandler,
  "finance.addDebt": addDebtHandler,
  "finance.getDebts": getDebtsHandler,
  "finance.settleDebt": settleDebtHandler,
  "finance.deleteDebt": deleteDebtHandler,
};

function makeError(id: JsonRpcRequest["id"], code: number, message: string, data?: unknown): JsonRpcFailure {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

export async function dispatchRpc(
  request: JsonRpcRequest,
  context: RpcContext,
): Promise<JsonRpcResponse> {
  if (request.jsonrpc !== "2.0") {
    return makeError(request.id, -32600, "Invalid Request");
  }

  const handler = handlers[request.method];

  if (!handler) {
    return makeError(request.id, -32601, `Method not found: ${request.method}`);
  }

  try {
    const result = await handler(request.params as never, context);

    return {
      jsonrpc: "2.0",
      id: request.id,
      result,
    };
  } catch (error) {
    if (error instanceof AppError) {
      return makeError(request.id, error.rpcCode, error.message, { code: error.code });
    }

    context.log.error({ err: error }, "unhandled rpc error");
    return makeError(request.id, -32000, "Internal server error");
  }
}
