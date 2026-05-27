import { appendTransaction, ensureUser, loadDatabase, saveDatabase, saveUser } from "./_db";
import {
  buildTransaction,
  getMonthKey,
  normalizeBalance,
  normalizeGoal,
  parseTelegramIdFromInitData,
  roundAmount,
} from "./_helpers";
import { buildStatus, getLedgerBalanceForUser } from "./_status";
import type { MockHandler } from "./_types";

export const financeUpdateSavingsGoal: MockHandler<"finance.updateSavingsGoal"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  user.savingsGoal = normalizeGoal(params.goal);
  saveUser(user);
  return await buildStatus(user);
};

export const financeUpdateBalance: MockHandler<"finance.updateBalance"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const targetBalance = normalizeBalance(params.balance);
  const currentBalance = getLedgerBalanceForUser(telegramId);
  const delta = roundAmount(targetBalance - currentBalance);

  if (delta !== 0) {
    const transaction = buildTransaction(user.id, {
      type: delta > 0 ? "income" : "expense",
      amount: Math.abs(delta),
      category: delta < 0 ? "other" : null,
    });
    appendTransaction(transaction);
  }

  return await buildStatus(user);
};

export const financeResetAccountData: MockHandler<"finance.resetAccountData"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const database = loadDatabase();

  database.transactions = database.transactions.filter((item) => item.userId !== user.id);
  user.balance = 0;
  user.savings = 0;
  user.monthlyExp = 0;
  user.savingsGoal = 0;
  user.recurringTransactions = [];
  database.users[telegramId] = user;

  saveDatabase(database);
  return await buildStatus(user);
};

export const financeNewMonth: MockHandler<"finance.newMonth"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const database = loadDatabase();
  const currentMonthKey = getMonthKey();
  const previousMonthKey = (new Date(new Date().setMonth(new Date().getMonth() - 1))).toISOString().slice(0, 7);

  database.transactions = database.transactions.map((transaction) => {
    if (
      transaction.userId === user.id
      && transaction.type === "expense"
      && transaction.monthKey === currentMonthKey
      && !transaction.deletedAt
    ) {
      return { ...transaction, monthKey: previousMonthKey };
    }
    return transaction;
  });

  saveDatabase(database);
  return await buildStatus(user);
};

export const financeConvertCurrency: MockHandler<"finance.convertCurrency"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  const database = loadDatabase();
  const { rate } = params;

  user.balance = roundAmount(user.balance * rate);
  user.savings = roundAmount(user.savings * rate);
  user.savingsGoal = roundAmount(user.savingsGoal * rate);
  user.monthlyExp = roundAmount(user.monthlyExp * rate);
  user.recurringTransactions = user.recurringTransactions.map((t) => ({
    ...t,
    amount: roundAmount(t.amount * rate),
    savingsAmt: t.savingsAmt ? roundAmount(t.savingsAmt * rate) : null,
  }));

  database.transactions = database.transactions.map((t) => {
    if (t.userId === user.id) {
      return {
        ...t,
        amount: roundAmount(t.amount * rate),
        savingsAmt: t.savingsAmt ? roundAmount(t.savingsAmt * rate) : null,
      };
    }
    return t;
  });

  database.users[telegramId] = user;
  saveDatabase(database);

  return await buildStatus(user);
};

export const financeRefreshRates: MockHandler<"finance.refreshRates"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);
  return await buildStatus(user);
};
