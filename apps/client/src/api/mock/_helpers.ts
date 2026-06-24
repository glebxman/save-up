import { MAX_FINANCE_AMOUNT } from "@finance-twa/shared-types";
import type {
  RecurringTransaction,
  RecurringTransactionPayload,
  Transaction,
  TransactionType,
  User,
} from "@finance-twa/shared-types";
import {
  roundAmount,
  getMonthKey,
  calculateDailyLimit,
  normalizeNote,
  normalizeSavingsAmount,
  normalizeGoal,
  normalizeBalance,
  assertPositiveAmount,
  normalizeString,
} from "@finance-twa/shared-utils";

export interface MockTelegramUser {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface TransactionImpact {
  balance: number;
  savings: number;
  monthlyExp: number;
}

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export { roundAmount, getMonthKey, calculateDailyLimit, normalizeNote, normalizeSavingsAmount, normalizeGoal, normalizeBalance, assertPositiveAmount };

export function ensureAmountWithinLimit(amount: number): void {
  if (amount > MAX_FINANCE_AMOUNT) {
    throw new Error(`Amount is too large. Maximum allowed is ${MAX_FINANCE_AMOUNT.toFixed(2)}`);
  }
}

export function parseOccurredAt(value?: string): string {
  if (!value) {
    return new Date().toISOString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Transaction date is invalid");
  }
  return parsed.toISOString();
}

export function normalizeProfileValue(value: string | undefined, maxLength: number): string | null {
  return normalizeString(value, maxLength);
}

export function applyTelegramProfile(user: User, profile?: MockTelegramUser): User {
  if (!profile) return user;
  return {
    ...user,
    firstName: normalizeProfileValue(profile?.first_name, 128),
    lastName: normalizeProfileValue(profile?.last_name, 128),
    username: normalizeProfileValue(profile?.username, 64),
    photoUrl: profile?.photo_url?.trim() ? profile.photo_url.trim() : null,
  };
}

export function parseTelegramUserFromInitData(initData: string): MockTelegramUser | undefined {
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

export function parseTelegramIdFromInitData(initData: string): number {
  const user = parseTelegramUserFromInitData(initData);
  if (typeof user?.id === "number" && Number.isFinite(user.id)) {
    return user.id;
  }
  return Number(import.meta.env.VITE_DEMO_TELEGRAM_ID ?? 1);
}

export function getTransactionImpact(transaction: Transaction): TransactionImpact {
  if (transaction.deletedAt) {
    return { balance: 0, savings: 0, monthlyExp: 0 };
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

export function applyImpact(
  user: User,
  impact: TransactionImpact,
  direction: 1 | -1,
  accountId?: string | null,
): User {
  const nextAccounts = (user.accounts ?? []).map((acc) => {
    if (acc.id === accountId && acc.type !== "crypto") {
      return {
        ...acc,
        balance: roundAmount(acc.balance + impact.balance * direction),
      };
    }
    return acc;
  });

  return {
    ...user,
    balance: roundAmount(user.balance + impact.balance * direction),
    savings: roundAmount(user.savings + impact.savings * direction),
    monthlyExp: roundAmount(Math.max(user.monthlyExp + impact.monthlyExp * direction, 0)),
    accounts: nextAccounts,
  };
}

export function ensureNonNegative(user: User): void {
  if (user.balance < 0) throw new Error("Operation would make balance negative");
  if (user.savings < 0) throw new Error("Operation would make savings negative");
}

export function buildTransaction(
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
    accountId?: string | null;
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
    accountId: input.accountId ?? null,
  };
}

export function parseRecurringPayload(payload: RecurringTransactionPayload): RecurringTransaction {
  const title = payload.title.trim().slice(0, 60);
  if (!title) throw new Error("Recurring transaction needs a title");
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
      accountId: payload.accountId ?? null,
    };
  }

  if (payload.type === "expense") {
    if (!payload.category) throw new Error("Expense category is required");
    return {
      id: payload.id ?? createId(),
      title,
      type: "expense",
      amount: roundAmount(payload.amount),
      savingsAmt: null,
      category: payload.category,
      note: normalizeNote(payload.note),
      accountId: payload.accountId ?? null,
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
    accountId: payload.accountId ?? null,
  };
}
