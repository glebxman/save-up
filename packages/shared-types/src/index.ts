export type SavingsPct = number;
export type TransactionType = "income" | "expense" | "transfer_to_savings" | "transfer_from_savings";
export type SavingsTransferDirection = "to_savings" | "from_savings";

export type ExpenseCategory =
  | "food"
  | "taxi"
  | "entertainment"
  | "shopping"
  | "utilities"
  | "health"
  | "education"
  | "other";

export interface RecurringTransaction {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  savingsAmt: number | null;
  category: ExpenseCategory | null;
  note: string | null;
}

export interface User {
  id: string;
  telegramId: number;
  balance: number;
  savings: number;
  savingsPct: SavingsPct;
  savingsGoal: number;
  recurringTransactions: RecurringTransaction[];
  monthlyExp: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  savingsAmt: number | null;
  category: ExpenseCategory | null;
  note: string | null;
  monthKey: string;
  occurredAt: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface ExpenseTransaction extends Transaction {
  type: "expense";
  savingsAmt: null;
  category: ExpenseCategory;
}

export interface DailyLimit {
  daysRemaining: number;
  dailyLimit: number;
}

export interface Status {
  user: User;
  dailyLimit: DailyLimit;
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
  category: ExpenseCategory;
  total: number;
  count: number;
}

export interface CategoryBreakdown {
  monthKey: string;
  items: CategoryBreakdownItem[];
  expenseTotal: number;
}

export interface TransactionFilters {
  monthKey?: string;
  type?: TransactionType | "all";
  category?: ExpenseCategory | "all";
  search?: string;
  includeDeleted?: boolean;
  limit?: number;
}

export interface TransactionUpdatePayload {
  transactionId: string;
  amount: number;
  savingsAmt?: number;
  category?: ExpenseCategory | null;
  note?: string | null;
  occurredAt?: string;
}

export interface RecurringTransactionPayload {
  id?: string;
  title: string;
  type: TransactionType;
  amount: number;
  savingsAmt?: number | null;
  category?: ExpenseCategory | null;
  note?: string | null;
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
    };
    result: Status;
  };
  "finance.addExpense": {
    params: {
      initData: string;
      amount: number;
      category: ExpenseCategory;
      note?: string | null;
      occurredAt?: string;
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
    };
    result: Status;
  };
  "finance.getRecentExpenses": {
    params: {
      initData: string;
      limit?: number;
    };
    result: ExpenseTransaction[];
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
  "finance.newMonth": {
    params: {
      initData: string;
    };
    result: Status;
  };
}

export type RpcMethod = keyof RpcMethodMap;
