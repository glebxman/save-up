export type SavingsPct = 10 | 20 | 30;
export type TransactionType = "income" | "expense";

export interface User {
  id: string;
  telegramId: number;
  balance: number;
  savings: number;
  savingsPct: SavingsPct;
  monthlyExp: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  savingsAmt: number | null;
  monthKey: string;
  createdAt: string;
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
  transactionCount: number;
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
      telegramId: number;
    };
    result: Status;
  };
  "finance.addIncome": {
    params: {
      telegramId: number;
      amount: number;
      savingsPct?: SavingsPct;
    };
    result: Status;
  };
  "finance.addExpense": {
    params: {
      telegramId: number;
      amount: number;
    };
    result: Status;
  };
  "finance.getReport": {
    params: {
      telegramId: number;
      monthKey?: string;
    };
    result: MonthReport;
  };
  "finance.newMonth": {
    params: {
      telegramId: number;
    };
    result: Status;
  };
}

export type RpcMethod = keyof RpcMethodMap;
