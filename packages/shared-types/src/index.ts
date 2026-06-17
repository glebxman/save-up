export type SavingsPct = number;

export interface CategoryCustomization {
  name?: string;
  emoji?: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  emoji: string;
}

export const MAX_CUSTOM_CATEGORIES = 8;

export type TransactionType = "income" | "expense" | "transfer_to_savings" | "transfer_from_savings" | "transfer_between_accounts";
export type SavingsTransferDirection = "to_savings" | "from_savings";
export type CurrencyCode = "UZS" | "RUB" | "USD" | "EUR" | "KZT" | "TRY" | "GBP" | "CNY" | "BTC" | "ETH" | "TON" | "USDT" | "NOTCOIN";

/** Currencies that represent crypto assets rather than fiat money. */
export type CryptoCode = Extract<CurrencyCode, "BTC" | "ETH" | "TON" | "USDT" | "NOTCOIN">;

/** Coins that a crypto account can hold. The order also drives the UI listing. */
export const CRYPTO_CODES: CryptoCode[] = ["BTC", "TON", "USDT", "NOTCOIN", "ETH"];

export const MAX_FINANCE_AMOUNT = 9_999_999_999_999.99;
export const VOICE_CREDITS_DAILY_LIMIT = 5;

export type ExpenseCategory =
  | "food"
  | "taxi"
  | "entertainment"
  | "shopping"
  | "utilities"
  | "health"
  | "education"
  | "other";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "food", "taxi", "entertainment", "shopping", "utilities", "health", "education", "other",
];

export type AccountType = "cash" | "card" | "crypto";

export type SupportedLanguage = "en" | "ru" | "uz" | "kk" | "zh" | "ja" | "ko" | "tr" | "es" | "fr" | "de";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  "en", "ru", "uz", "kk", "zh", "ja", "ko", "tr", "es", "fr", "de",
];

export const DEFAULT_EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  UZS: 12500,
  RUB: 92,
  EUR: 0.92,
  KZT: 450,
  TRY: 32,
  GBP: 0.79,
  CNY: 7.23,
  BTC: 0.000015,
  ETH: 0.0003,
  TON: 0.15,
  USDT: 1.0,
  NOTCOIN: 625,
};

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TransactionExtraction {
  type: "expense" | "income";
  amount: number;
  category: string;
  note?: string;
}

export interface Debt {
  id: string;
  userId: string;
  name: string;
  amount: number;
  note: string | null;
  direction: "owed_to_me" | "i_owe";
  dueDate: string | null;
  settled: boolean;
  settledAt: string | null;
  createdAt: string;
}

/** A single crypto asset held inside a crypto account. */
export interface CryptoHolding {
  symbol: CryptoCode;
  /** Amount of the coin held, in the coin's own units (e.g. 0.5 BTC). */
  amount: number;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  /**
   * For cash/card accounts this is the balance in `currency`.
   * For crypto accounts this is the total valuation in `currency` (USD),
   * derived from `holdings` and recomputed on every status build.
   */
  balance: number;
  /** Populated only for crypto accounts. */
  holdings?: CryptoHolding[];
  createdAt: string;
}

export interface RecurringTransaction {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  savingsAmt: number | null;
  category: string | null;
  note: string | null;
  dayOfMonth?: number | null;
  autoApply?: boolean;
  accountId: string | null;
}

export type NotificationFrequency =
  | { mode: "per_day"; times: string[] }
  | { mode: "every_n_days"; days: number; time: string };

export interface NotificationSettings {
  enabled: boolean;
  frequency: NotificationFrequency;
  /** Minutes east of UTC, e.g. +300 for UTC+5. Matches `-new Date().getTimezoneOffset()`. */
  timezoneOffset: number;
}

export interface User {
  id: string;
  telegramId: number;
  isAdmin: boolean;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  photoUrl?: string | null;
  balance: number;
  savings: number;
  savingsPct: SavingsPct;
  savingsGoal: number;
  recurringTransactions: RecurringTransaction[];
  monthlyExp: number;
  onboardingCompleted: boolean;
  language: string | null;
  voiceDailyUsed: number;
  categoryCustomizations: Partial<Record<ExpenseCategory, CategoryCustomization>>;
  customCategories: CustomCategory[];
  categoryLimits: Record<string, number>;
  notificationsConfigured: boolean;
  notificationsEnabled: boolean;
  notificationFrequency: NotificationFrequency;
  notificationTimezoneOffset: number;
  hasPinConfigured: boolean;
  createdAt: string;
  accounts: Account[];
  currency: CurrencyCode;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  savingsAmt: number | null;
  category: string | null;
  note: string | null;
  monthKey: string;
  occurredAt: string;
  createdAt: string;
  deletedAt: string | null;
  accountId: string | null;
  accountName?: string;
  toAccountId?: string | null;
  toAccountName?: string;
}

export interface ExpenseTransaction extends Transaction {
  type: "expense";
  savingsAmt: null;
  category: string;
}

export interface DailyLimit {
  daysRemaining: number;
  dailyLimit: number;
}

export interface Status {
  user: User;
  dailyLimit: DailyLimit;
  rates: Record<CurrencyCode, number>;
  ratesUpdatedAt: string;
}

export interface AdminUserListItem {
  id: string;
  displayName: string;
  username: string | null;
  photoUrl: string | null;
  telegramIdMasked: string;
  isAdmin: boolean;
  hasPinConfigured: boolean;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  totalTransactions: number;
  totalBalance: number;
  totalSavings: number;
}

export interface AdminUsersPage {
  items: AdminUserListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  stats: AdminStats;
}

export interface MonthReport {
  monthKey: string;
  incomeTotal: number;
  expenseTotal: number;
  savingsTotal: number;
  savingsWithdrawnTotal: number;
  netSavingsTotal: number;
  transactionCount: number;
}

export interface CategoryBreakdownItem {
  category: string;
  total: number;
  count: number;
}

export interface CategoryBreakdown {
  monthKey: string;
  items: CategoryBreakdownItem[];
  expenseTotal: number;
}

export interface DailyTrendPoint {
  day: number;
  expense: number;
  income: number;
}

export interface DailyTrend {
  monthKey: string;
  points: DailyTrendPoint[];
}

export interface TransactionFilters {
  monthKey?: string;
  type?: TransactionType | "all";
  category?: string | "all";
  search?: string;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}

export interface TransactionUpdatePayload {
  transactionId: string;
  amount: number;
  savingsAmt?: number | null;
  category?: string | null;
  note?: string | null;
  occurredAt?: string;
}

export interface RecurringTransactionPayload {
  id?: string;
  title: string;
  type: TransactionType;
  amount: number;
  savingsAmt?: number | null;
  category?: string | null;
  note?: string | null;
  dayOfMonth?: number | null;
  autoApply?: boolean;
  accountId?: string | null;
}

export interface RpcMethodMap {
  "user.init": {
    params: {
      initData: string;
    };
    result: Status;
  };
  "user.getStatus": {
    params: {
      initData: string;
    };
    result: Status;
  };
  "finance.addIncome": {
    params: {
      initData: string;
      amount: number;
      savingsAmt?: number;
      note?: string | null;
      occurredAt?: string;
      accountId?: string;
    };
    result: Status;
  };
  "finance.addExpense": {
    params: {
      initData: string;
      amount: number;
      category: string;
      note?: string | null;
      occurredAt?: string;
      accountId?: string;
    };
    result: Status;
  };
  "finance.transferSavings": {
    params: {
      initData: string;
      amount: number;
      direction: SavingsTransferDirection;
      note?: string | null;
      occurredAt?: string;
      accountId?: string;
    };
    result: Status;
  };
  "finance.getTransactions": {
    params: {
      initData: string;
      filters?: TransactionFilters;
    };
    result: Transaction[];
  };
  "finance.updateTransaction": {
    params: {
      initData: string;
      payload: TransactionUpdatePayload;
    };
    result: Transaction;
  };
  "finance.archiveTransaction": {
    params: {
      initData: string;
      transactionId: string;
    };
    result: Status;
  };
  "finance.restoreTransaction": {
    params: {
      initData: string;
      transactionId: string;
    };
    result: Status;
  };
  "finance.updateSavingsGoal": {
    params: {
      initData: string;
      goal: number;
    };
    result: Status;
  };
  "finance.updateBalance": {
    params: {
      initData: string;
      balance: number;
    };
    result: Status;
  };
  "finance.resetAccountData": {
    params: {
      initData: string;
    };
    result: Status;
  };
  "finance.saveRecurringTransaction": {
    params: {
      initData: string;
      template: RecurringTransactionPayload;
    };
    result: Status;
  };
  "finance.deleteRecurringTransaction": {
    params: {
      initData: string;
      templateId: string;
    };
    result: Status;
  };
  "finance.applyRecurringTransaction": {
    params: {
      initData: string;
      templateId: string;
    };
    result: Status;
  };
  "finance.getReport": {
    params: {
      initData: string;
      monthKey?: string;
    };
    result: MonthReport;
  };
  "finance.getCategoryBreakdown": {
    params: {
      initData: string;
      monthKey?: string;
    };
    result: CategoryBreakdown;
  };
  "finance.getDailyTrend": {
    params: {
      initData: string;
      monthKey?: string;
    };
    result: DailyTrend;
  };
  "finance.newMonth": {
    params: {
      initData: string;
    };
    result: Status;
  };
  "user.completeOnboarding": {
    params: {
      initData: string;
    };
    result: { ok: true };
  };
  "user.setLanguage": {
    params: {
      initData: string;
      language: string;
    };
    result: { ok: true };
  };
  "user.sendExportToTelegram": {
    params: {
      initData: string;
      base64Data: string;
      filename: string;
    };
    result: { ok: boolean };
  };
  "admin.listUsers": {
    params: {
      initData: string;
      page?: number;
      pageSize?: number;
      search?: string;
    };
    result: AdminUsersPage;
  };
  "admin.setAdmin": {
    params: {
      initData: string;
      userId: string;
      isAdmin: boolean;
    };
    result: AdminUserListItem;
  };
  "admin.resetPin": {
    params: {
      initData: string;
      userId: string;
    };
    result: AdminUserListItem;
  };
  "finance.convertCurrency": {
    params: {
      initData: string;
      rate: number;
    };
    result: Status;
  };
  "finance.refreshRates": {
    params: {
      initData: string;
    };
    result: Status;
  };
  "finance.processVoice": {
    params: {
      initData: string;
      base64Audio: string;
    };
    result: {
      type: "expense" | "income";
      amount: number;
      category: string;
      note?: string;
    } | null;
  };
  "user.setCategoryCustomization": {
    params: {
      initData: string;
      category: ExpenseCategory;
      name: string;
      emoji: string;
    };
    result: { ok: true };
  };
  "user.addCustomCategory": {
    params: {
      initData: string;
      name: string;
      emoji: string;
    };
    result: Status;
  };
  "user.deleteCustomCategory": {
    params: {
      initData: string;
      id: string;
    };
    result: Status;
  };
  "user.setCategoryLimits": {
    params: {
      initData: string;
      limits: Record<string, number>;
    };
    result: Status;
  };
  "user.setNotificationSettings": {
    params: {
      initData: string;
      enabled: boolean;
      frequency: NotificationFrequency;
      timezoneOffset: number;
    };
    result: Status;
  };
  "user.createAccount": {
    params: {
      initData: string;
      name: string;
      type: AccountType;
      currency: CurrencyCode;
      initialBalance: number;
      /** Initial crypto holdings, used only when `type === "crypto"`. */
      holdings?: CryptoHolding[];
    };
    result: Status;
  };
  "user.updateAccount": {
    params: {
      initData: string;
      accountId: string;
      name: string;
    };
    result: Status;
  };
  "user.setCryptoHolding": {
    params: {
      initData: string;
      accountId: string;
      symbol: CryptoCode;
      /** Absolute amount of the coin to hold. Set to 0 to remove the coin. */
      amount: number;
    };
    result: Status;
  };
  "user.deleteAccount": {
    params: {
      initData: string;
      accountId: string;
    };
    result: Status;
  };
  "finance.transferBetweenAccounts": {
    params: {
      initData: string;
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      toAmount?: number;
    };
    result: Status;
  };
  "user.setPin": {
    params: {
      initData: string;
      pin: string;
    };
    result: { ok: true };
  };
  "user.verifyPin": {
    params: {
      initData: string;
      pin: string;
    };
    result: { ok: boolean };
  };
  "user.removePin": {
    params: {
      initData: string;
      pin: string;
    };
    result: { ok: true };
  };
  "finance.addDebt": {
    params: {
      initData: string;
      name: string;
      amount: number;
      direction: "owed_to_me" | "i_owe";
      note?: string;
      dueDate?: string;
    };
    result: Debt;
  };
  "finance.getDebts": {
    params: {
      initData: string;
    };
    result: Debt[];
  };
  "finance.settleDebt": {
    params: {
      initData: string;
      debtId: string;
    };
    result: { ok: true };
  };
  "finance.deleteDebt": {
    params: {
      initData: string;
      debtId: string;
    };
    result: { ok: true };
  };
}


export type RpcMethod = keyof RpcMethodMap;
