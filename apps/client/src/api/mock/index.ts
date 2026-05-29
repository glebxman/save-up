/**
 * Mock RPC backend for `npm run dev:mock`.
 *
 * The handler map is split by domain (user, admin, transactions, account,
 * recurring, reports, voice). Each domain file owns its own handlers and
 * imports shared helpers from `_helpers`, storage from `_db`, and status
 * builders from `_status`. To add a method, drop it into the domain that owns
 * it and register it in the map below.
 */

import type { RpcMethod, RpcMethodMap } from "@finance-twa/shared-types";

import {
  adminListUsers,
  adminSetAdmin,
  adminResetPin,
} from "./admin";
import {
  financeConvertCurrency,
  financeNewMonth,
  financeRefreshRates,
  financeResetAccountData,
  financeUpdateBalance,
  financeUpdateSavingsGoal,
} from "./account";
import {
  financeApplyRecurringTransaction,
  financeDeleteRecurringTransaction,
  financeSaveRecurringTransaction,
} from "./recurring";
import {
  financeGetCategoryBreakdown,
  financeGetDailyTrend,
  financeGetReport,
} from "./reports";
import {
  financeAddExpense,
  financeAddIncome,
  financeArchiveTransaction,
  financeGetRecentExpenses,
  financeGetTransactions,
  financeRestoreTransaction,
  financeTransferSavings,
  financeUpdateTransaction,
  financeTransferBetweenAccounts,
} from "./transactions";
import {
  userAddCustomCategory,
  userCompleteOnboarding,
  userDeleteCustomCategory,
  userGetStatus,
  userInit,
  userSetCategoryCustomization,
  userSetCategoryLimits,
  userSetLanguage,
  userSetNotificationSettings,
  userSetPin,
  userVerifyPin,
  userRemovePin,
  userCreateAccount,
  userUpdateAccount,
  userDeleteAccount,
  userSendExportToTelegram,
} from "./user";
import { financeProcessVoice } from "./voice";
import type { MockHandlerMap } from "./_types";

const handlers: MockHandlerMap = {
  "user.init": userInit,
  "user.getStatus": userGetStatus,
  "user.completeOnboarding": userCompleteOnboarding,
  "user.setLanguage": userSetLanguage,
  "user.setCategoryCustomization": userSetCategoryCustomization,
  "user.addCustomCategory": userAddCustomCategory,
  "user.deleteCustomCategory": userDeleteCustomCategory,
  "user.setCategoryLimits": userSetCategoryLimits,
  "user.setNotificationSettings": userSetNotificationSettings,
  "user.setPin": userSetPin,
  "user.verifyPin": userVerifyPin,
  "user.removePin": userRemovePin,
  "user.createAccount": userCreateAccount,
  "user.updateAccount": userUpdateAccount,
  "user.deleteAccount": userDeleteAccount,
  "user.sendExportToTelegram": userSendExportToTelegram,
  "admin.listUsers": adminListUsers,
  "admin.setAdmin": adminSetAdmin,
  "admin.resetPin": adminResetPin,
  "finance.addIncome": financeAddIncome,
  "finance.addExpense": financeAddExpense,
  "finance.transferSavings": financeTransferSavings,
  "finance.getRecentExpenses": financeGetRecentExpenses,
  "finance.getTransactions": financeGetTransactions,
  "finance.updateTransaction": financeUpdateTransaction,
  "finance.archiveTransaction": financeArchiveTransaction,
  "finance.restoreTransaction": financeRestoreTransaction,
  "finance.updateSavingsGoal": financeUpdateSavingsGoal,
  "finance.updateBalance": financeUpdateBalance,
  "finance.resetAccountData": financeResetAccountData,
  "finance.saveRecurringTransaction": financeSaveRecurringTransaction,
  "finance.deleteRecurringTransaction": financeDeleteRecurringTransaction,
  "finance.applyRecurringTransaction": financeApplyRecurringTransaction,
  "finance.getReport": financeGetReport,
  "finance.getCategoryBreakdown": financeGetCategoryBreakdown,
  "finance.getDailyTrend": financeGetDailyTrend,
  "finance.newMonth": financeNewMonth,
  "finance.convertCurrency": financeConvertCurrency,
  "finance.refreshRates": financeRefreshRates,
  "finance.processVoice": financeProcessVoice,
  "finance.transferBetweenAccounts": financeTransferBetweenAccounts,
};

export async function mockRpcRequest<Method extends RpcMethod>(
  method: Method,
  params: RpcMethodMap[Method]["params"],
): Promise<RpcMethodMap[Method]["result"]> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, 120);
  });

  // The domain handlers are typed against their specific method; the map's
  // dynamic indexing is widened by TS so we narrow it here.
  return (handlers[method] as MockHandler<Method>)(params);
}

type MockHandler<M extends RpcMethod> = (
  params: RpcMethodMap[M]["params"],
) => RpcMethodMap[M]["result"] | Promise<RpcMethodMap[M]["result"]>;
