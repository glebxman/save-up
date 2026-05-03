import type { RpcMethod } from "@finance-twa/shared-types";

import {
  listAdminUsersHandler,
  setAdminAccessHandler,
} from "./handlers/admin.js";
import {
  addExpenseHandler,
  addIncomeHandler,
  applyRecurringTransactionHandler,
  archiveTransactionHandler,
  convertCurrencyHandler,
  deleteRecurringTransactionHandler,
  getCategoryBreakdownHandler,
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
} from "./handlers/finance.js";


import { addCustomCategoryHandler, completeOnboardingHandler, deleteCustomCategoryHandler, getUserStatusHandler, initUserHandler, setCategoryCustomizationHandler, setLanguageHandler } from "./handlers/user.js";
import { AppError } from "../utils/errors.js";
import type { JsonRpcFailure, JsonRpcRequest, JsonRpcResponse, RpcContext, RpcHandler } from "./types.js";type HandlerMap = {
  [Method in RpcMethod]: RpcHandler<Method>;
};

const handlers: HandlerMap = {
  "user.init": initUserHandler,
  "user.getStatus": getUserStatusHandler,
  "user.completeOnboarding": completeOnboardingHandler,
  "user.setLanguage": setLanguageHandler,
  "user.setCategoryCustomization": setCategoryCustomizationHandler,
  "user.addCustomCategory": addCustomCategoryHandler,
  "user.deleteCustomCategory": deleteCustomCategoryHandler,
  "admin.listUsers": listAdminUsersHandler,
  "admin.setAdmin": setAdminAccessHandler,
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
  "finance.newMonth": newMonthHandler,
  "finance.convertCurrency": convertCurrencyHandler,
  "finance.refreshRates": refreshRatesHandler,
  "finance.processVoice": processVoiceHandler,
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
    const message = error instanceof Error ? error.message : "Internal server error";
    return makeError(request.id, -32000, message);
  }
}
