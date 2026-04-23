import type {
  CategoryBreakdown,
  CategoryBreakdownItem,
  ExpenseCategory,
  ExpenseTransaction,
  MonthReport,
  RecurringTransaction,
  RecurringTransactionPayload,
  RpcMethod,
  RpcMethodMap,
  SavingsTransferDirection,
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

  return roundAmount(goal);
}

function normalizeExpenseCategory(category: unknown): ExpenseCategory | null {
  return typeof category === "string" && expenseCategories.has(category as ExpenseCategory)
    ? category as ExpenseCategory
    : null;
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

function ensureUser(telegramId: number): User {
  const database = loadDatabase();
  const existing = database.users[telegramId];
  const defaults: User = {
    id: createId(),
    telegramId,
    balance: 24600,
    savings: 3120,
    savingsPct: 20,
    savingsGoal: 1000000,
    recurringTransactions: [],
    monthlyExp: 22550,
    createdAt: new Date().toISOString(),
  };

  if (existing) {
    const nextUser: User = {
      ...defaults,
      ...existing,
      recurringTransactions: existing.recurringTransactions ?? defaults.recurringTransactions,
    };

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

function buildStatus(user: User): Status {
  const monthlyExp = getTransactionsForUser(user.telegramId)
    .filter((transaction) => !transaction.deletedAt && transaction.type === "expense" && transaction.monthKey === getMonthKey())
    .reduce((sum, transaction) => roundAmount(sum + transaction.amount), 0);
  const nextUser: User = {
    ...user,
    monthlyExp,
  };

  return {
    user: nextUser,
    dailyLimit: calculateDailyLimit(nextUser.balance),
  };
}

function parseTelegramIdFromInitData(initData: string): number {
  try {
    const params = new URLSearchParams(initData);
    const encodedUser = params.get("user");

    if (encodedUser) {
      const user = JSON.parse(encodedUser) as { id?: number };

      if (typeof user.id === "number" && Number.isFinite(user.id)) {
        return user.id;
      }
    }
  } catch {
    // Ignore malformed initData and fall back to demo id.
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

function buildTransaction(
  userId: string,
  input: {
    id?: string;
    type: TransactionType;
    amount: number;
    category?: ExpenseCategory | null;
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
    category: category as ExpenseCategory,
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
  "user.init": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    return buildStatus(user);
  },
  "user.getStatus": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    return buildStatus(user);
  },
  "finance.addIncome": (params) => {
    assertPositiveAmount(params.amount);
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

    return buildStatus(nextUser);
  },
  "finance.addExpense": (params) => {
    assertPositiveAmount(params.amount);
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

    return buildStatus(nextUser);
  },
  "finance.transferSavings": (params) => {
    assertPositiveAmount(params.amount);
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

    return buildStatus(nextUser);
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
  "finance.archiveTransaction": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const transaction = getTransactionById(telegramId, params.transactionId);

    if (!transaction.deletedAt) {
      const archived = { ...transaction, deletedAt: new Date().toISOString() };
      const nextUser = applyImpact(user, getTransactionImpact(transaction), -1);

      ensureNonNegative(nextUser);
      saveUser(nextUser);
      updateTransactionRecord(archived);

      return buildStatus(nextUser);
    }

    return buildStatus(user);
  },
  "finance.restoreTransaction": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const transaction = getTransactionById(telegramId, params.transactionId);
    const restored = { ...transaction, deletedAt: null };
    const nextUser = applyImpact(user, getTransactionImpact(restored), 1);

    ensureNonNegative(nextUser);
    saveUser(nextUser);
    updateTransactionRecord(restored);

    return buildStatus(nextUser);
  },
  "finance.updateSavingsGoal": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const nextUser: User = {
      ...user,
      savingsGoal: normalizeGoal(params.goal),
    };

    saveUser(nextUser);
    return buildStatus(nextUser);
  },
  "finance.saveRecurringTransaction": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const nextTemplate = parseRecurringPayload(params.template);
    const templates = [...user.recurringTransactions];
    const index = templates.findIndex((item) => item.id === nextTemplate.id);

    if (index >= 0) {
      templates[index] = nextTemplate;
    } else {
      templates.unshift(nextTemplate);
    }

    const nextUser: User = {
      ...user,
      recurringTransactions: templates,
    };

    saveUser(nextUser);
    return buildStatus(nextUser);
  },
  "finance.deleteRecurringTransaction": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const nextUser: User = {
      ...user,
      recurringTransactions: user.recurringTransactions.filter((item) => item.id !== params.templateId),
    };

    saveUser(nextUser);
    return buildStatus(nextUser);
  },
  "finance.applyRecurringTransaction": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const template = user.recurringTransactions.find((item) => item.id === params.templateId);

    if (!template) {
      throw new Error("Recurring transaction not found");
    }

    const transaction = buildTransaction(user.id, {
      type: template.type,
      amount: template.amount,
      category: template.category,
      savingsAmt: template.savingsAmt,
      note: template.note ?? template.title,
    });
    const nextUser = applyImpact(user, getTransactionImpact(transaction), 1);

    ensureNonNegative(nextUser);
    saveUser(nextUser);
    appendTransaction(transaction);

    return buildStatus(nextUser);
  },
  "finance.getReport": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    return getReportForUser(telegramId, params.monthKey);
  },
  "finance.getCategoryBreakdown": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    return getCategoryBreakdownForUser(telegramId, params.monthKey);
  },
  "finance.newMonth": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    return buildStatus(user);
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
