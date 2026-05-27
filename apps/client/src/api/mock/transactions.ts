import type {
  ExpenseTransaction,
  Transaction,
  TransactionFilters,
} from "@finance-twa/shared-types";

import { appendTransaction, ensureUser, getTransactionById, getTransactionsForUser, saveUser, updateTransactionRecord } from "./_db";
import {
  applyImpact,
  assertPositiveAmount,
  buildTransaction,
  ensureAmountWithinLimit,
  ensureNonNegative,
  getMonthKey,
  getTransactionImpact,
  normalizeSavingsAmount,
  parseTelegramIdFromInitData,
  roundAmount,
} from "./_helpers";
import { buildStatus } from "./_status";
import type { MockHandler } from "./_types";

export const financeAddIncome: MockHandler<"finance.addIncome"> = async (params) => {
  assertPositiveAmount(params.amount);
  ensureAmountWithinLimit(params.amount);
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const savingsAmt = normalizeSavingsAmount(params.amount, params.savingsAmt);
  const transaction = buildTransaction(user.id, {
    type: "income",
    amount: params.amount,
    savingsAmt,
    note: params.note,
    occurredAt: params.occurredAt,
  });
  const nextUser = applyImpact(user, getTransactionImpact(transaction), 1);

  ensureNonNegative(nextUser);
  saveUser(nextUser);
  appendTransaction(transaction);

  return await buildStatus(nextUser);
};

export const financeAddExpense: MockHandler<"finance.addExpense"> = async (params) => {
  assertPositiveAmount(params.amount);
  ensureAmountWithinLimit(params.amount);
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const transaction = buildTransaction(user.id, {
    type: "expense",
    amount: params.amount,
    category: params.category,
    note: params.note,
    occurredAt: params.occurredAt,
  });
  const nextUser = applyImpact(user, getTransactionImpact(transaction), 1);

  ensureNonNegative(nextUser);
  saveUser(nextUser);
  appendTransaction(transaction);

  return await buildStatus(nextUser);
};

export const financeTransferSavings: MockHandler<"finance.transferSavings"> = async (params) => {
  assertPositiveAmount(params.amount);
  ensureAmountWithinLimit(params.amount);
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const type = params.direction === "to_savings" ? "transfer_to_savings" : "transfer_from_savings";
  const transaction = buildTransaction(user.id, {
    type,
    amount: params.amount,
    note: params.note,
    occurredAt: params.occurredAt,
  });
  const nextUser = applyImpact(user, getTransactionImpact(transaction), 1);

  ensureNonNegative(nextUser);
  saveUser(nextUser);
  appendTransaction(transaction);

  return await buildStatus(nextUser);
};

export const financeGetRecentExpenses: MockHandler<"finance.getRecentExpenses"> = (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  return getRecentExpensesForUser(telegramId, params.limit);
};

export const financeGetTransactions: MockHandler<"finance.getTransactions"> = (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  return getFilteredTransactions(telegramId, params.filters);
};

export const financeUpdateTransaction: MockHandler<"finance.updateTransaction"> = (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const current = getTransactionById(telegramId, params.payload.transactionId);

  if (current.deletedAt) throw new Error("Transaction not found");

  assertPositiveAmount(params.payload.amount);
  ensureAmountWithinLimit(params.payload.amount);

  let nextTransaction = current;

  if (current.type === "income") {
    nextTransaction = buildTransaction(user.id, {
      id: current.id,
      type: "income",
      amount: params.payload.amount,
      savingsAmt: normalizeSavingsAmount(params.payload.amount, params.payload.savingsAmt ?? current.savingsAmt),
      note: params.payload.note ?? current.note,
      occurredAt: params.payload.occurredAt ?? current.occurredAt,
      createdAt: current.createdAt,
      deletedAt: current.deletedAt,
    });
  }

  if (current.type === "expense") {
    const category = params.payload.category ?? current.category;
    if (!category) throw new Error("Expense category is required");
    nextTransaction = buildTransaction(user.id, {
      id: current.id,
      type: "expense",
      amount: params.payload.amount,
      category,
      note: params.payload.note ?? current.note,
      occurredAt: params.payload.occurredAt ?? current.occurredAt,
      createdAt: current.createdAt,
      deletedAt: current.deletedAt,
    });
  }

  if (current.type === "transfer_to_savings" || current.type === "transfer_from_savings") {
    nextTransaction = buildTransaction(user.id, {
      id: current.id,
      type: current.type,
      amount: params.payload.amount,
      note: params.payload.note ?? current.note,
      occurredAt: params.payload.occurredAt ?? current.occurredAt,
      createdAt: current.createdAt,
      deletedAt: current.deletedAt,
    });
  }

  const revertedUser = applyImpact(user, getTransactionImpact(current), -1);
  const nextUser = applyImpact(revertedUser, getTransactionImpact(nextTransaction), 1);

  ensureNonNegative(nextUser);
  saveUser(nextUser);
  updateTransactionRecord(nextTransaction);

  return nextTransaction;
};

export const financeArchiveTransaction: MockHandler<"finance.archiveTransaction"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const transaction = getTransactionById(telegramId, params.transactionId);
  transaction.deletedAt = new Date().toISOString();
  updateTransactionRecord(transaction);
  return await buildStatus(user);
};

export const financeRestoreTransaction: MockHandler<"finance.restoreTransaction"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const transaction = getTransactionById(telegramId, params.transactionId);
  transaction.deletedAt = null;
  updateTransactionRecord(transaction);
  return await buildStatus(user);
};

// helpers used by the read handlers
function getRecentExpensesForUser(telegramId: number, limit = 5): ExpenseTransaction[] {
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 5, 1), 10);
  return getTransactionsForUser(telegramId)
    .filter(
      (transaction): transaction is ExpenseTransaction =>
        !transaction.deletedAt
        && transaction.monthKey === getMonthKey()
        && transaction.type === "expense"
        && transaction.category !== null,
    )
    .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
    .slice(0, safeLimit);
}

function getFilteredTransactions(telegramId: number, filters: TransactionFilters = {}): Transaction[] {
  let items = getTransactionsForUser(telegramId);

  if (!filters.includeDeleted) items = items.filter((tx) => !tx.deletedAt);
  if (filters.monthKey) items = items.filter((tx) => tx.monthKey === filters.monthKey);
  if (filters.type && filters.type !== "all") items = items.filter((tx) => tx.type === filters.type);
  if (filters.category && filters.category !== "all") items = items.filter((tx) => tx.category === filters.category);

  if (filters.search?.trim()) {
    const query = filters.search.trim().toLowerCase();
    items = items.filter((tx) =>
      (tx.note ?? "").toLowerCase().includes(query)
      || (tx.category ?? "").includes(query)
      || tx.type.includes(query),
    );
  }

  items = items.sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  if (filters.limit) {
    items = items.slice(0, Math.min(Math.max(Math.trunc(filters.limit), 1), 200));
  }

  return items;
}

export const financeTransferBetweenAccounts: MockHandler<"finance.transferBetweenAccounts"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);

  const fromAcc = user.accounts?.find(a => a.id === params.fromAccountId);
  const toAcc = user.accounts?.find(a => a.id === params.toAccountId);

  if (!fromAcc || !toAcc) {
    throw new Error("Account not found");
  }

  if (fromAcc.balance < params.amount && fromAcc.type !== "crypto") {
    throw new Error("Insufficient funds in source account");
  }

  const toAmount = params.toAmount || params.amount;

  fromAcc.balance = roundAmount(fromAcc.balance - params.amount);
  toAcc.balance = roundAmount(toAcc.balance + toAmount);

  const transaction = buildTransaction(user.id, {
    type: "transfer_between_accounts",
    amount: params.amount,
    savingsAmt: toAmount,
    note: `Transfer from ${fromAcc.name} to ${toAcc.name}`,
    accountId: params.fromAccountId,
  });

  appendTransaction(transaction);
  saveUser(user);

  return await buildStatus(user);
};
