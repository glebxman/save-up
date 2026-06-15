import type { CryptoCode, CryptoHolding, CurrencyCode } from "@finance-twa/shared-types";
import type {
  AdminUserListItem,
  AdminUsersPage,
  CategoryBreakdown,
  DailyTrend,
  ExpenseCategory,
  MonthReport,
  NotificationFrequency,
  RecurringTransactionPayload,
  SavingsTransferDirection,
  Status,
  Transaction,
  TransactionFilters,
  TransactionUpdatePayload,
} from "@/types/finance";

import { rpcRequest } from "./client";

export function initUser(initData: string): Promise<Status> {
  return rpcRequest("user.init", { initData });
}

export function completeOnboarding(initData: string): Promise<{ ok: true }> {
  return rpcRequest("user.completeOnboarding", { initData });
}

export function setLanguage(initData: string, language: string): Promise<{ ok: true }> {
  return rpcRequest("user.setLanguage", { initData, language });
}

export function listAdminUsers(
  initData: string,
  params: { page?: number; pageSize?: number; search?: string } = {},
): Promise<AdminUsersPage> {
  return rpcRequest("admin.listUsers", { initData, ...params });
}

export function setAdminAccess(initData: string, userId: string, isAdmin: boolean): Promise<AdminUserListItem> {
  return rpcRequest("admin.setAdmin", { initData, userId, isAdmin });
}

export function resetUserPin(initData: string, userId: string): Promise<AdminUserListItem> {
  return rpcRequest("admin.resetPin", { initData, userId });
}

export function addIncome(
  initData: string,
  amount: number,
  savingsAmt?: number,
  note?: string | null,
  occurredAt?: string,
  accountId?: string,
): Promise<Status> {
  return rpcRequest("finance.addIncome", { initData, amount, savingsAmt, note, occurredAt, accountId });
}

export function addExpense(
  initData: string,
  amount: number,
  category: string,
  note?: string | null,
  occurredAt?: string,
  accountId?: string,
): Promise<Status> {
  return rpcRequest("finance.addExpense", { initData, amount, category, note, occurredAt, accountId });
}

export function transferSavings(
  initData: string,
  amount: number,
  direction: SavingsTransferDirection,
  note?: string | null,
  occurredAt?: string,
  accountId?: string,
): Promise<Status> {
  return rpcRequest("finance.transferSavings", { initData, amount, direction, note, occurredAt, accountId });
}

export function getTransactions(initData: string, filters?: TransactionFilters): Promise<Transaction[]> {
  return rpcRequest("finance.getTransactions", { initData, filters });
}

export function updateTransaction(initData: string, payload: TransactionUpdatePayload): Promise<Transaction> {
  return rpcRequest("finance.updateTransaction", { initData, payload });
}

export function archiveTransaction(initData: string, transactionId: string): Promise<Status> {
  return rpcRequest("finance.archiveTransaction", { initData, transactionId });
}

export function restoreTransaction(initData: string, transactionId: string): Promise<Status> {
  return rpcRequest("finance.restoreTransaction", { initData, transactionId });
}

export function updateSavingsGoal(initData: string, goal: number): Promise<Status> {
  return rpcRequest("finance.updateSavingsGoal", { initData, goal });
}

export function updateBalance(initData: string, balance: number): Promise<Status> {
  return rpcRequest("finance.updateBalance", { initData, balance });
}

export function resetAccountData(initData: string): Promise<Status> {
  return rpcRequest("finance.resetAccountData", { initData });
}

export function saveRecurringTransaction(initData: string, template: RecurringTransactionPayload): Promise<Status> {
  return rpcRequest("finance.saveRecurringTransaction", { initData, template });
}

export function deleteRecurringTransaction(initData: string, templateId: string): Promise<Status> {
  return rpcRequest("finance.deleteRecurringTransaction", { initData, templateId });
}

export function applyRecurringTransaction(initData: string, templateId: string): Promise<Status> {
  return rpcRequest("finance.applyRecurringTransaction", { initData, templateId });
}

export function getReport(initData: string, monthKey?: string): Promise<MonthReport> {
  return rpcRequest("finance.getReport", { initData, monthKey });
}

export function getCategoryBreakdown(initData: string, monthKey?: string): Promise<CategoryBreakdown> {
  return rpcRequest("finance.getCategoryBreakdown", { initData, monthKey });
}

export function newMonth(initData: string): Promise<Status> {
  return rpcRequest("finance.newMonth", { initData });
}

export function convertCurrency(initData: string, rate: number): Promise<Status> {
  return rpcRequest("finance.convertCurrency", { initData, rate });
}

export function refreshRates(initData: string): Promise<Status> {
  return rpcRequest("finance.refreshRates", { initData });
}

export function processVoice(
  initData: string,
  base64Audio: string,
): Promise<{
  type: "expense" | "income";
  amount: number;
  category: string;
  note?: string;
} | null> {
  return rpcRequest("finance.processVoice", { initData, base64Audio });
}

export function setCategoryCustomization(
  initData: string,
  category: ExpenseCategory,
  name: string,
  emoji: string,
): Promise<{ ok: true }> {
  return rpcRequest("user.setCategoryCustomization", { initData, category, name, emoji });
}

export function addCustomCategory(
  initData: string,
  name: string,
  emoji: string,
): Promise<Status> {
  return rpcRequest("user.addCustomCategory", { initData, name, emoji });
}

export function deleteCustomCategory(
  initData: string,
  id: string,
): Promise<Status> {
  return rpcRequest("user.deleteCustomCategory", { initData, id });
}

export function setCategoryLimits(
  initData: string,
  limits: Record<string, number>,
): Promise<Status> {
  return rpcRequest("user.setCategoryLimits", { initData, limits });
}

export function getDailyTrend(initData: string, monthKey?: string): Promise<DailyTrend> {
  return rpcRequest("finance.getDailyTrend", { initData, monthKey });
}

export function setNotificationSettings(
  initData: string,
  enabled: boolean,
  frequency: NotificationFrequency,
  timezoneOffset: number,
): Promise<Status> {
  return rpcRequest("user.setNotificationSettings", {
    initData,
    enabled,
    frequency,
    timezoneOffset,
  });
}

export function createAccount(
  initData: string,
  name: string,
  type: "cash" | "card" | "crypto",
  currency: string,
  initialBalance: number,
  holdings?: CryptoHolding[],
): Promise<Status> {
  return rpcRequest("user.createAccount", {
    initData,
    name,
    type,
    currency: currency as CurrencyCode,
    initialBalance,
    holdings,
  });
}

export function setCryptoHolding(
  initData: string,
  accountId: string,
  symbol: CryptoCode,
  amount: number,
): Promise<Status> {
  return rpcRequest("user.setCryptoHolding", { initData, accountId, symbol, amount });
}

export function updateAccount(
  initData: string,
  accountId: string,
  name: string,
): Promise<Status> {
  return rpcRequest("user.updateAccount", { initData, accountId, name });
}

export function deleteAccount(
  initData: string,
  accountId: string,
): Promise<Status> {
  return rpcRequest("user.deleteAccount", { initData, accountId });
}

export function transferBetweenAccounts(
  initData: string,
  params: { fromAccountId: string; toAccountId: string; amount: number; toAmount?: number },
): Promise<Status> {
  return rpcRequest("finance.transferBetweenAccounts", { initData, ...params });
}

export function setPin(initData: string, pin: string): Promise<{ ok: true }> {
  return rpcRequest("user.setPin", { initData, pin });
}

export function verifyPin(initData: string, pin: string): Promise<{ ok: boolean }> {
  return rpcRequest("user.verifyPin", { initData, pin });
}

export function removePin(initData: string, pin: string): Promise<{ ok: true }> {
  return rpcRequest("user.removePin", { initData, pin });
}

export function sendExportToTelegram(
  initData: string,
  base64Data: string,
  filename: string,
): Promise<{ ok: boolean }> {
  return rpcRequest("user.sendExportToTelegram", { initData, base64Data, filename });
}
