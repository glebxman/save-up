import type { Transaction, User } from "@finance-twa/shared-types";

import { applyTelegramProfile, type MockTelegramUser } from "./_helpers";
import { createId } from "./_helpers";

export interface MockDatabase {
  users: Record<number, User>;
  transactions: Transaction[];
}

const STORAGE_KEY = "finance-twa.mock-db";

export function loadDatabase(): MockDatabase {
  const initialState: MockDatabase = { users: {}, transactions: [] };

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;

  try {
    return JSON.parse(raw) as MockDatabase;
  } catch {
    return initialState;
  }
}

export function saveDatabase(database: MockDatabase): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

export function ensureUser(telegramId: number, profile?: MockTelegramUser): User {
  const database = loadDatabase();
  const existing = database.users[telegramId];
  const userId = createId();
  const defaults: User = applyTelegramProfile({
    id: userId,
    telegramId,
    isAdmin: telegramId === 8246152069,
    balance: 24600,
    savings: 3120,
    savingsPct: 20,
    savingsGoal: 1000000,
    recurringTransactions: [],
    monthlyExp: 22550,
    onboardingCompleted: false,
    language: null,
    voiceDailyUsed: 0,
    categoryCustomizations: {},
    customCategories: [],
    categoryLimits: {},
    notificationsConfigured: false,
    notificationsEnabled: true,
    notificationFrequency: { mode: "every_n_days", days: 3, time: "09:00" },
    notificationTimezoneOffset: 0,
    subscription: {
      active: false,
      source: null,
      planId: null,
      expiresAt: null,
      trialAvailable: true,
      trialEndsAt: null,
    },
    hasPinConfigured: false,
    createdAt: new Date().toISOString(),
    accounts: [
      {
        id: createId(),
        userId: userId,
        name: "Основной счет",
        type: "cash",
        currency: "UZS",
        balance: 24600,
        createdAt: new Date().toISOString(),
      }
    ],
    currency: "UZS",
  }, profile);

  if (existing) {
    const nextUser: User = applyTelegramProfile({
      ...defaults,
      ...existing,
      recurringTransactions: existing.recurringTransactions ?? defaults.recurringTransactions,
    }, profile);

    database.users[telegramId] = nextUser;
    saveDatabase(database);

    return nextUser;
  }

  database.users[telegramId] = defaults;
  saveDatabase(database);

  return defaults;
}

export function saveUser(user: User): void {
  const database = loadDatabase();
  database.users[user.telegramId] = user;
  saveDatabase(database);
}

export function appendTransaction(transaction: Transaction): void {
  const database = loadDatabase();
  database.transactions.push(transaction);
  saveDatabase(database);
}

export function updateTransactionRecord(nextTransaction: Transaction): void {
  const database = loadDatabase();
  const index = database.transactions.findIndex((transaction) => transaction.id === nextTransaction.id);

  if (index === -1) {
    throw new Error("Transaction not found");
  }

  database.transactions[index] = nextTransaction;
  saveDatabase(database);
}

export function getTransactionsForUser(telegramId: number): Transaction[] {
  const user = ensureUser(telegramId);
  const database = loadDatabase();
  return database.transactions
    .filter((transaction) => transaction.userId === user.id)
    .map((transaction) => ({
      ...transaction,
      note: transaction.note ?? null,
      occurredAt: transaction.occurredAt ?? transaction.createdAt,
      deletedAt: transaction.deletedAt ?? null,
    }));
}

export function getTransactionById(telegramId: number, transactionId: string): Transaction {
  const transaction = getTransactionsForUser(telegramId).find((item) => item.id === transactionId);

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  return transaction;
}
