import type {
  MonthReport,
  RpcMethod,
  RpcMethodMap,
  SavingsPct,
  Status,
  Transaction,
  User,
} from "@finance-twa/shared-types";

interface MockDatabase {
  users: Record<number, User>;
  transactions: Transaction[];
}

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

  if (existing) {
    return existing;
  }

  const user: User = {
    id: createId(),
    telegramId,
    balance: 24600,
    savings: 3120,
    savingsPct: 20,
    monthlyExp: 22550,
    createdAt: new Date().toISOString(),
  };

  database.users[telegramId] = user;
  saveDatabase(database);

  return user;
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

function buildStatus(user: User): Status {
  return {
    user,
    dailyLimit: calculateDailyLimit(user.balance),
  };
}

function assertPositiveAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }
}

function normalizeSavingsPct(value?: SavingsPct): SavingsPct | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value !== 10 && value !== 20 && value !== 30) {
    throw new Error("Savings percent must be one of 10, 20, or 30");
  }

  return value;
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

function getReportForUser(telegramId: number, monthKey = getMonthKey()): MonthReport {
  const user = ensureUser(telegramId);
  const database = loadDatabase();

  return database.transactions
    .filter((transaction) => transaction.userId === user.id && transaction.monthKey === monthKey)
    .reduce<MonthReport>(
      (report, transaction) => {
        if (transaction.type === "income") {
          report.incomeTotal = Number((report.incomeTotal + transaction.amount).toFixed(2));
        }

        if (transaction.type === "expense") {
          report.expenseTotal = Number((report.expenseTotal + transaction.amount).toFixed(2));
        }

        if (transaction.savingsAmt) {
          report.savingsTotal = Number((report.savingsTotal + transaction.savingsAmt).toFixed(2));
        }

        report.transactionCount += 1;

        return report;
      },
      {
        monthKey,
        incomeTotal: 0,
        expenseTotal: 0,
        savingsTotal: 0,
        transactionCount: 0,
      },
    );
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
    const nextSavingsPct = normalizeSavingsPct(params.savingsPct) ?? user.savingsPct;
    const savingsAmt = Number((params.amount * (nextSavingsPct / 100)).toFixed(2));
    const nextUser: User = {
      ...user,
      balance: Number((user.balance + params.amount - savingsAmt).toFixed(2)),
      savings: Number((user.savings + savingsAmt).toFixed(2)),
      savingsPct: nextSavingsPct,
    };

    saveUser(nextUser);
    appendTransaction({
      id: createId(),
      userId: nextUser.id,
      type: "income",
      amount: params.amount,
      savingsAmt,
      monthKey: getMonthKey(),
      createdAt: new Date().toISOString(),
    });

    return buildStatus(nextUser);
  },
  "finance.addExpense": (params) => {
    assertPositiveAmount(params.amount);

    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);

    if (user.balance < params.amount) {
      throw new Error("Insufficient balance for expense");
    }

    const nextUser: User = {
      ...user,
      balance: Number((user.balance - params.amount).toFixed(2)),
      monthlyExp: Number((user.monthlyExp + params.amount).toFixed(2)),
    };

    saveUser(nextUser);
    appendTransaction({
      id: createId(),
      userId: nextUser.id,
      type: "expense",
      amount: params.amount,
      savingsAmt: null,
      monthKey: getMonthKey(),
      createdAt: new Date().toISOString(),
    });

    return buildStatus(nextUser);
  },
  "finance.getReport": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    return getReportForUser(telegramId, params.monthKey);
  },
  "finance.newMonth": (params) => {
    const telegramId = parseTelegramIdFromInitData(params.initData);
    const user = ensureUser(telegramId);
    const nextUser: User = {
      ...user,
      monthlyExp: 0,
    };

    saveUser(nextUser);

    return buildStatus(nextUser);
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
