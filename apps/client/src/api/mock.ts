import { MAX_FINANCE_AMOUNT, type CurrencyCode } from "@finance-twa/shared-types";


import type {
  AdminUserListItem,
  AdminUsersPage,
  CategoryBreakdown,
  CategoryBreakdownItem,
  ExpenseCategory,
  ExpenseTransaction,
  MonthReport,
  RecurringTransaction,
  RecurringTransactionPayload,
  RpcMethod,
  RpcMethodMap,
  Status,
  Transaction,
  TransactionFilters,
  TransactionType,
  User,
} from "@finance-twa/shared-types";

interface MockDatabase {
  users: Record<number, User>;
  transactions: Transaction[];
}

interface MockTelegramUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TransactionImpact {
  balance: number;
  savings: number;
  monthlyExp: number;
}

const expenseCategories = new Set<ExpenseCategory>([
  "food",
  "taxi",
  "entertainment",
  "shopping",
  "utilities",
  "health",
  "education",
  "other",
]);

const STORAGE_KEY = "finance-twa.mock-db";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");

  return `${year}-${month}`;
}

function calculateDailyLimit(balance: number): Status["dailyLimit"] {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = Math.max(lastDay - now.getDate() + 1, 1);

  return {
    daysRemaining,
    dailyLimit: Number((balance / daysRemaining).toFixed(2)),
  };
}

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

function assertPositiveAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }
}

function normalizeNote(note?: string | null): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed.slice(0, 240) : null;
}

function parseOccurredAt(value?: string): string {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Transaction date is invalid");
  }

  return parsed.toISOString();
}

function normalizeSavingsAmount(amount: number, savingsAmt?: number | null): number {
  if (savingsAmt === undefined || savingsAmt === null) {
    return 0;
  }

  if (!Number.isFinite(savingsAmt) || savingsAmt < 0) {
    throw new Error("Savings amount must be zero or a positive number");
  }

  if (savingsAmt > amount) {
    throw new Error("Savings amount cannot exceed income amount");
  }

  return roundAmount(savingsAmt);
}

function normalizeGoal(goal: number): number {
  if (!Number.isFinite(goal) || goal < 0) {
    throw new Error("Savings goal must be zero or a positive number");
  }

  if (goal > MAX_FINANCE_AMOUNT) {
    throw new Error(`Savings goal is too large. Maximum allowed is ${MAX_FINANCE_AMOUNT.toFixed(2)}`);
  }

  return roundAmount(goal);
}

function normalizeBalance(balance: number): number {
  if (!Number.isFinite(balance) || balance < 0) {
    throw new Error("Balance must be zero or a positive number");
  }

  if (balance > MAX_FINANCE_AMOUNT) {
    throw new Error(`Balance is too large. Maximum allowed is ${MAX_FINANCE_AMOUNT.toFixed(2)}`);
  }

  return roundAmount(balance);
}

function normalizeExpenseCategory(category: unknown): string | null {
  return typeof category === "string" && category.length > 0 ? category : null;
}

function loadDatabase(): MockDatabase {
  const initialState: MockDatabase = {
    users: {},
    transactions: [],
  };

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return initialState;
  }

  try {
    return JSON.parse(raw) as MockDatabase;
  } catch {
    return initialState;
  }
}

function saveDatabase(database: MockDatabase): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

function normalizeProfileValue(value: string | undefined, maxLength: number): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function applyTelegramProfile(user: User, profile?: MockTelegramUser): User {
  if (!profile) {
    return user;
  }

  return {
    ...user,
    firstName: normalizeProfileValue(profile?.first_name, 128),
    lastName: normalizeProfileValue(profile?.last_name, 128),
    username: normalizeProfileValue(profile?.username, 64),
    photoUrl: profile?.photo_url?.trim() ? profile.photo_url.trim() : null,
  };
}

function ensureUser(telegramId: number, profile?: MockTelegramUser): User {
  const database = loadDatabase();
  const existing = database.users[telegramId];
  const defaults: User = applyTelegramProfile({
    id: createId(),
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
    createdAt: new Date().toISOString(),
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

function saveUser(user: User): void {
  const database = loadDatabase();
  database.users[user.telegramId] = user;
  saveDatabase(database);
}

function appendTransaction(transaction: Transaction): void {
  const database = loadDatabase();
  database.transactions.push(transaction);
  saveDatabase(database);
}

function updateTransactionRecord(nextTransaction: Transaction): void {
  const database = loadDatabase();
  const index = database.transactions.findIndex((transaction) => transaction.id === nextTransaction.id);

  if (index === -1) {
    throw new Error("Transaction not found");
  }

  database.transactions[index] = nextTransaction;
  saveDatabase(database);
}

const FALLBACK_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  UZS: 12500,
  RUB: 92,
  EUR: 0.92,
  KZT: 450,
  TRY: 32,
  GBP: 0.79,
  CNY: 7.23,
};

async function getMockExchangeRates(): Promise<Record<CurrencyCode, number>> {
  try {
    const response = await fetch("https://api.coinbase.com/v2/exchange-rates?currency=USD");
    const data = await response.json();

    if (data && data.data && data.data.rates) {
      const rates: Partial<Record<CurrencyCode, number>> = {};
      const codes: CurrencyCode[] = ["USD", "UZS", "RUB", "EUR", "KZT", "TRY", "GBP", "CNY"];

      for (const code of codes) {
        const value = data.data.rates[code];
        rates[code] = value ? parseFloat(value) : FALLBACK_RATES[code];
      }

      return rates as Record<CurrencyCode, number>;
    }
  } catch (error) {
    console.error("Mock: Failed to fetch exchange rates:", error);
  }

  return FALLBACK_RATES;
}


async function buildStatus(user: User): Promise<Status> {  const monthlyExp = getTransactionsForUser(user.telegramId)
    .filter((transaction) => !transaction.deletedAt && transaction.type === "expense" && transaction.monthKey === getMonthKey())
    .reduce((sum, transaction) => roundAmount(sum + transaction.amount), 0);
  const nextUser: User = {
    ...user,
    monthlyExp,
  };

  const rates = await getMockExchangeRates();

  return {
    user: nextUser,
    dailyLimit: calculateDailyLimit(nextUser.balance),
    rates,
    ratesUpdatedAt: new Date().toISOString(),
  };
}

function parseTelegramUserFromInitData(initData: string): MockTelegramUser | undefined {
  try {
    const params = new URLSearchParams(initData);
    const encodedUser = params.get("user");

    if (encodedUser) {
      return JSON.parse(encodedUser) as MockTelegramUser;
    }
  } catch {
    // Ignore malformed initData and fall back to demo id.
  }

  return undefined;
}

function parseTelegramIdFromInitData(initData: string): number {
  const user = parseTelegramUserFromInitData(initData);

  if (typeof user?.id === "number" && Number.isFinite(user.id)) {
    return user.id;
  }

  return Number(import.meta.env.VITE_DEMO_TELEGRAM_ID ?? 1);
}

function getTransactionImpact(transaction: Transaction): TransactionImpact {
  if (transaction.deletedAt) {
    return {
      balance: 0,
      savings: 0,
      monthlyExp: 0,
    };
  }

  if (transaction.type === "income") {
    const savingsAmt = transaction.savingsAmt ?? 0;

    return {
      balance: roundAmount(transaction.amount - savingsAmt),
      savings: roundAmount(savingsAmt),
      monthlyExp: 0,
    };
  }

  if (transaction.type === "expense") {
    return {
      balance: roundAmount(-transaction.amount),
      savings: 0,
      monthlyExp: transaction.monthKey === getMonthKey() ? roundAmount(transaction.amount) : 0,
    };
  }

  if (transaction.type === "transfer_to_savings") {
    return {
      balance: roundAmount(-transaction.amount),
      savings: roundAmount(transaction.amount),
      monthlyExp: 0,
    };
  }

  return {
    balance: roundAmount(transaction.amount),
    savings: roundAmount(-transaction.amount),
    monthlyExp: 0,
  };
}

function getLedgerBalanceForUser(telegramId: number): number {
  return getTransactionsForUser(telegramId)
    .filter((transaction) => !transaction.deletedAt)
    .reduce((sum, transaction) => roundAmount(sum + getTransactionImpact(transaction).balance), 0);
}

function applyImpact(user: User, impact: TransactionImpact, direction: 1 | -1): User {
  return {
    ...user,
    balance: roundAmount(user.balance + impact.balance * direction),
    savings: roundAmount(user.savings + impact.savings * direction),
    monthlyExp: roundAmount(Math.max(user.monthlyExp + impact.monthlyExp * direction, 0)),
  };
}

function ensureNonNegative(user: User): void {
  if (user.balance < 0) {
    throw new Error("Operation would make balance negative");
  }

  if (user.savings < 0) {
    throw new Error("Operation would make savings negative");
  }
}

function ensureAmountWithinLimit(amount: number): void {
  if (amount > MAX_FINANCE_AMOUNT) {
    throw new Error(`Amount is too large. Maximum allowed is ${MAX_FINANCE_AMOUNT.toFixed(2)}`);
  }
}

function buildTransaction(
  userId: string,
  input: {
    id?: string;
    type: TransactionType;
    amount: number;
    category?: string | null;
    savingsAmt?: number | null;
    note?: string | null;
    occurredAt?: string;
    createdAt?: string;
    deletedAt?: string | null;
  },
): Transaction {
  const occurredAt = parseOccurredAt(input.occurredAt);

  return {
    id: input.id ?? createId(),
    userId,
    type: input.type,
    amount: roundAmount(input.amount),
    savingsAmt: input.savingsAmt && input.savingsAmt > 0 ? roundAmount(input.savingsAmt) : null,
    category: input.category ?? null,
    note: normalizeNote(input.note),
    monthKey: getMonthKey(new Date(occurredAt)),
    occurredAt,
    createdAt: input.createdAt ?? new Date().toISOString(),
    deletedAt: input.deletedAt ?? null,
  };
}

function getTransactionsForUser(telegramId: number): Transaction[] {
  const user = ensureUser(telegramId);
  const database = loadDatabase();
  return database.transactions
    .filter((transaction) => transaction.userId === user.id)
    .map((transaction) => ({
      ...transaction,
      category: normalizeExpenseCategory(transaction.category),
      note: transaction.note ?? null,
      occurredAt: transaction.occurredAt ?? transaction.createdAt,
      deletedAt: transaction.deletedAt ?? null,
    }));
}

function getReportForUser(telegramId: number, monthKey = getMonthKey()): MonthReport {
  return getTransactionsForUser(telegramId)
    .filter((transaction) => transaction.monthKey === monthKey && !transaction.deletedAt)
    .reduce<MonthReport>(
      (report, transaction) => {
        if (transaction.type === "income") {
          report.incomeTotal = roundAmount(report.incomeTotal + transaction.amount);
          report.savingsTotal = roundAmount(report.savingsTotal + (transaction.savingsAmt ?? 0));
        }

        if (transaction.type === "expense") {
          report.expenseTotal = roundAmount(report.expenseTotal + transaction.amount);
        }

        if (transaction.type === "transfer_to_savings") {
          report.savingsTotal = roundAmount(report.savingsTotal + transaction.amount);
        }

        if (transaction.type === "transfer_from_savings") {
          report.savingsWithdrawnTotal = roundAmount(report.savingsWithdrawnTotal + transaction.amount);
        }

        report.netSavingsTotal = roundAmount(report.savingsTotal - report.savingsWithdrawnTotal);
        report.transactionCount += 1;

        return report;
      },
      {
        monthKey,
        incomeTotal: 0,
        expenseTotal: 0,
        savingsTotal: 0,
        savingsWithdrawnTotal: 0,
        netSavingsTotal: 0,
        transactionCount: 0,
      },
    );
}

function getCategoryBreakdownForUser(telegramId: number, monthKey = getMonthKey()): CategoryBreakdown {
  const expenses = getTransactionsForUser(telegramId).filter(
    (transaction) => !transaction.deletedAt && transaction.monthKey === monthKey && transaction.type === "expense",
  );
  const grouped = new Map<string, { total: number; count: number }>();
  let expenseTotal = 0;

  for (const transaction of expenses) {
    const category = transaction.category ?? "other";
    const current = grouped.get(category) ?? { total: 0, count: 0 };
    current.total = roundAmount(current.total + transaction.amount);
    current.count += 1;
    grouped.set(category, current);
    expenseTotal = roundAmount(expenseTotal + transaction.amount);
  }

  const items: CategoryBreakdownItem[] = Array.from(grouped.entries()).map(([category, data]) => ({
    category,
    ...data,
  }));

  return { monthKey, items, expenseTotal };
}

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

  if (!filters.includeDeleted) {
    items = items.filter((transaction) => !transaction.deletedAt);
  }

  if (filters.monthKey) {
    items = items.filter((transaction) => transaction.monthKey === filters.monthKey);
  }

  if (filters.type && filters.type !== "all") {
    items = items.filter((transaction) => transaction.type === filters.type);
  }

  if (filters.category && filters.category !== "all") {
    items = items.filter((transaction) => transaction.category === filters.category);
  }

  if (filters.search?.trim()) {
    const query = filters.search.trim().toLowerCase();
    items = items.filter((transaction) =>
      (transaction.note ?? "").toLowerCase().includes(query)
      || (transaction.category ?? "").includes(query)
      || transaction.type.includes(query),
    );
  }

  items = items.sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  if (filters.limit) {
    items = items.slice(0, Math.min(Math.max(Math.trunc(filters.limit), 1), 200));
  }

  return items;
}

function maskTelegramId(telegramId: number): string {
  const value = String(telegramId);
  return `${"•".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function mapAdminUser(user: User): AdminUserListItem {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();

  return {
    id: user.id,
    displayName: user.username ? `@${user.username}` : name || `User ${user.id.slice(0, 8)}`,
    username: user.username ?? null,
    photoUrl: user.photoUrl ?? null,
    telegramIdMasked: maskTelegramId(user.telegramId),
    isAdmin: !!user.isAdmin,
    createdAt: user.createdAt,
  };
}

function getAdminUsersPage(params: { page?: number; pageSize?: number; search?: string }): AdminUsersPage {
  const database = loadDatabase();
  const pageSize = Math.min(Math.max(Math.trunc(params.pageSize ?? 12), 1), 50);
  const page = Math.max(Math.trunc(params.page ?? 1), 1);
  const search = params.search?.trim().toLowerCase() ?? "";
  const items = Object.values(database.users)
    .filter((user) => {
      if (!search) {
        return true;
      }

      const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").toLowerCase();

      return user.id.toLowerCase().includes(search)
        || String(user.telegramId).includes(search)
        || (user.username ?? "").toLowerCase().includes(search)
        || fullName.includes(search);
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  const totalItems = items.length;
  const totalPages = Math.max(Math.ceil(totalItems / pageSize), 1);
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const pagedItems = items.slice(startIndex, startIndex + pageSize).map(mapAdminUser);
  const totalUsers = Object.keys(database.users).length;
  const stats = {
    totalUsers,
    totalAdmins: Object.values(database.users).filter((user) => user.isAdmin).length,
    totalTransactions: database.transactions.length,
    totalBalance: Object.values(database.users).reduce((sum, user) => roundAmount(sum + user.balance), 0),
    totalSavings: Object.values(database.users).reduce((sum, user) => roundAmount(sum + user.savings), 0),
  };

  return {
    items: pagedItems,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    stats,
  };
}

function getTransactionById(telegramId: number, transactionId: string): Transaction {
  const transaction = getTransactionsForUser(telegramId).find((item) => item.id === transactionId);

  if (!transaction) {
    throw new Error("Transaction not found");
  }

  return transaction;
}

function parseRecurringPayload(payload: RecurringTransactionPayload): RecurringTransaction {
  const title = payload.title.trim().slice(0, 60);

  if (!title) {
    throw new Error("Recurring transaction needs a title");
  }

  assertPositiveAmount(payload.amount);

  if (payload.type === "income") {
    return {
      id: payload.id ?? createId(),
      title,
      type: "income",
      amount: roundAmount(payload.amount),
      savingsAmt: normalizeSavingsAmount(payload.amount, payload.savingsAmt),
      category: null,
      note: normalizeNote(payload.note),
    };
  }

  if (payload.type === "expense") {
    if (!payload.category) {
      throw new Error("Expense category is required");
    }

    return {
      id: payload.id ?? createId(),
      title,
      type: "expense",
      amount: roundAmount(payload.amount),
      savingsAmt: null,
      category: payload.category,
      note: normalizeNote(payload.note),
    };
  }

  return {
    id: payload.id ?? createId(),
    title,
    type: payload.type,
    amount: roundAmount(payload.amount),
    savingsAmt: null,
    category: null,
    note: normalizeNote(payload.note),
  };
}

const mockHandlers: {
  [Method in RpcMethod]: (
    params: RpcMethodMap[Method]["params"],
  ) => RpcMethodMap[Method]["result"] | Promise<RpcMethodMap[Method]["result"]>;
} = {
  "user.init": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId, parseTelegramUserFromInitData(params.initData));
    return await buildStatus(user);
  },
  "user.getStatus": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId, parseTelegramUserFromInitData(params.initData));
    return await buildStatus(user);
  },

  "user.completeOnboarding": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    user.onboardingCompleted = true;
    saveUser(user);
    return { ok: true as const };
  },
  "user.setLanguage": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    user.language = params.language;
    saveUser(user);
    return { ok: true as const };
  },
  "user.setCategoryCustomization": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    user.categoryCustomizations = {
      ...(user.categoryCustomizations ?? {}),
      [params.category]: {
        name: params.name.trim() || undefined,
        emoji: params.emoji.trim() || undefined,
      },
    };
    saveUser(user);
    return { ok: true as const };
  },
  "user.addCustomCategory": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const current = user.customCategories ?? [];
    if (current.length >= 8) {
      throw new Error("Maximum of 8 custom categories reached");
    }
    const id = `c_${Math.random().toString(36).slice(2, 12)}`;
    user.customCategories = [...current, { id, name: params.name.trim(), emoji: params.emoji.trim() }];
    saveUser(user);
    return buildStatus(user);
  },
  "user.deleteCustomCategory": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    user.customCategories = (user.customCategories ?? []).filter((c) => c.id !== params.id);
    saveUser(user);
    return buildStatus(user);
  },
  "admin.listUsers": (params) => {
    return getAdminUsersPage({
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
    });
  },
  "admin.setAdmin": (params) => {
    const database = loadDatabase();
    const user = Object.values(database.users).find((item) => item.id === params.userId);

    if (!user) {
      throw new Error("User not found");
    }

    if (user.telegramId === 8246152069 && !params.isAdmin) {
      throw new Error("Super admin access cannot be removed");
    }

    user.isAdmin = params.isAdmin;
    saveDatabase(database);

    return mapAdminUser(user);
  },
  "finance.addIncome": async (params) => {

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
  },
  "finance.addExpense": async (params) => {
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
  },
  "finance.transferSavings": async (params) => {
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
  },

  "finance.getRecentExpenses": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    return getRecentExpensesForUser(telegramId, params.limit);
  },
  "finance.getTransactions": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    return getFilteredTransactions(telegramId, params.filters);
  },
  "finance.updateTransaction": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const current = getTransactionById(telegramId, params.payload.transactionId);

    if (current.deletedAt) {
      throw new Error("Transaction not found");
    }

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

      if (!category) {
        throw new Error("Expense category is required");
      }

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
  },
  "finance.archiveTransaction": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const transaction = getTransactionById(telegramId, params.transactionId);

    transaction.deletedAt = new Date().toISOString();
    updateTransactionRecord(transaction);

    return await buildStatus(user);
  },
  "finance.restoreTransaction": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const transaction = getTransactionById(telegramId, params.transactionId);

    transaction.deletedAt = null;
    updateTransactionRecord(transaction);

    return await buildStatus(user);
  },
  "finance.updateSavingsGoal": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    user.savingsGoal = normalizeGoal(params.goal);
    saveUser(user);
    return await buildStatus(user);
  },
  "finance.updateBalance": async (params) => {
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
  },
  "finance.resetAccountData": async (params) => {
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
  },
  "finance.saveRecurringTransaction": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const nextTemplate = parseRecurringPayload(params.template);
    const index = user.recurringTransactions.findIndex((item) => item.id === nextTemplate.id);

    if (index >= 0) {
      user.recurringTransactions[index] = nextTemplate;
    } else {
      user.recurringTransactions.unshift(nextTemplate);
    }

    saveUser(user);
    return await buildStatus(user);
  },
  "finance.deleteRecurringTransaction": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    user.recurringTransactions = user.recurringTransactions.filter((item) => item.id !== params.templateId);
    saveUser(user);
    return await buildStatus(user);
  },
  "finance.applyRecurringTransaction": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const template = user.recurringTransactions.find((item) => item.id === params.templateId);

    if (!template) {
      throw new Error("Recurring transaction not found");
    }

    const transaction = buildTransaction(user.id, {
      type: template.type,
      amount: template.amount,
      savingsAmt: template.savingsAmt,
      category: template.category,
      note: template.note ?? template.title,
    });

    const nextUser = applyImpact(user, getTransactionImpact(transaction), 1);
    ensureNonNegative(nextUser);
    saveUser(nextUser);
    appendTransaction(transaction);

    return await buildStatus(nextUser);
  },
  "finance.getReport": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    return getReportForUser(telegramId, params.monthKey);
  },
  "finance.getCategoryBreakdown": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    return getCategoryBreakdownForUser(telegramId, params.monthKey);
  },
  "finance.newMonth": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const database = loadDatabase();
    const currentMonthKey = getMonthKey();
    const previousMonthKey = (new Date(new Date().setMonth(new Date().getMonth() - 1))).toISOString().slice(0, 7);

    database.transactions = database.transactions.map((transaction) => {
      if (transaction.userId === user.id && transaction.type === "expense" && transaction.monthKey === currentMonthKey && !transaction.deletedAt) {
        return { ...transaction, monthKey: previousMonthKey };
      }
      return transaction;
    });

    saveDatabase(database);
    return await buildStatus(user);
  },
  "finance.convertCurrency": async (params) => {
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
  },
  "finance.refreshRates": async (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    return await buildStatus(user);
  },
  "finance.processVoice": async (_params) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const amounts = [500, 1200, 3500, 450];
    const categories: ExpenseCategory[] = ["taxi", "food", "shopping", "entertainment"];
    const randomIdx = Math.floor(Math.random() * amounts.length);
    
    return {
      type: "expense" as const,
      amount: amounts[randomIdx]!,
      category: categories[randomIdx]!,
      note: "MOCK: real AI requires npm run dev",
    };
  },
};

export async function mockRpcRequest<Method extends RpcMethod>(
  method: Method,
  params: RpcMethodMap[Method]["params"],
): Promise<RpcMethodMap[Method]["result"]> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, 120);
  });

  return mockHandlers[method](params);
}
