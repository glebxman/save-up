import {
  MAX_FINANCE_AMOUNT,
  EXPENSE_CATEGORIES,
} from "@finance-twa/shared-types";
import type {
  ExpenseCategory,
  ExpenseTransaction,
  MonthReport,
  RecurringTransaction,
  RecurringTransactionPayload,
  Status,
  Transaction,
  TransactionType,
  CurrencyCode,
} from "@finance-twa/shared-types";
import {
  roundAmount as baseRoundAmount,
  normalizeNote as baseNormalizeNote,
  normalizeSavingsAmount as baseNormalizeSavingsAmount,
  normalizeGoal as baseNormalizeGoal,
  normalizeBalance as baseNormalizeBalance,
  getMonthKey,
} from "@finance-twa/shared-utils";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../config/database.js";
import { transactions, users, accounts, type AccountRow, type TransactionRow, type UserRow } from "../../db/schema/index.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { setCachedStatus } from "../cache.service.js";
import { buildStatus } from "../user/index.js";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ParsedTemplate {
  title: string;
  type: TransactionType;
  amount: number;
  savingsAmt: number | null;
  category: string | null;
  note: string | null;
}

export interface UserSnapshot {
  balance: number;
  savings: number;
  monthlyExp: number;
}

export const expenseCategories = new Set<ExpenseCategory>(EXPENSE_CATEGORIES);

export function roundAmount(value: number): number {
  return baseRoundAmount(value);
}

export function getPreviousMonthKey(date = new Date()): string {
  const previous = new Date(date);
  previous.setMonth(previous.getMonth() - 1);
  return getMonthKey(previous);
}

export function assertPositiveAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(ErrorCode.VALIDATION, "Amount must be a positive number");
  }

  if (amount > MAX_FINANCE_AMOUNT) {
    throw new AppError(
      ErrorCode.VALIDATION,
      `Amount is too large. Maximum allowed is ${MAX_FINANCE_AMOUNT.toFixed(2)}`,
    );
  }
}

export function normalizeNote(note?: string | null): string | null {
  return baseNormalizeNote(note);
}

export function parseOccurredAt(value?: string): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(ErrorCode.VALIDATION, "Transaction date is invalid");
  }

  return parsed;
}

export function normalizeSavingsAmount(amount: number, savingsAmt?: number | null): number {
  try {
    return baseNormalizeSavingsAmount(amount, savingsAmt);
  } catch (e) {
    throw new AppError(ErrorCode.VALIDATION, (e as Error).message);
  }
}

function normalizeNonNegativeAmount(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new AppError(ErrorCode.VALIDATION, `${fieldName} must be zero or a positive number`);
  }

  if (value > MAX_FINANCE_AMOUNT) {
    throw new AppError(ErrorCode.VALIDATION, `${fieldName} is too large. Maximum allowed is ${MAX_FINANCE_AMOUNT.toFixed(2)}`);
  }

  return baseRoundAmount(value);
}

export function normalizeGoal(goal: number): number {
  return normalizeNonNegativeAmount(goal, "Savings goal");
}

export function normalizeBalance(balance: number): number {
  return normalizeNonNegativeAmount(balance, "Balance");
}

export function normalizeExpenseCategory(category: unknown): ExpenseCategory | null {
  return typeof category === "string" && expenseCategories.has(category as ExpenseCategory)
    ? category as ExpenseCategory
    : null;
}

export function mapRecurringTemplates(row: UserRow): RecurringTransaction[] {
  const raw = row.recurringTemplates;

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item) => typeof item === "object" && item !== null)
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : randomUUID(),
      title: typeof item.title === "string" ? item.title : "Recurring",
      type: item.type as TransactionType,
      amount: typeof item.amount === "number" ? item.amount : 0,
      savingsAmt: typeof item.savingsAmt === "number" ? item.savingsAmt : null,
      category: item.category ?? null,
      note: typeof item.note === "string" ? item.note : null,
      accountId: typeof item.accountId === "string" ? item.accountId : null,
    }))
    .filter((item) => Number.isFinite(item.amount) && item.amount > 0);
}

export function mapTransactionRow(row: TransactionRow | Record<string, unknown>): Transaction {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    userId: r.userId as string,
    type: r.type as TransactionType,
    amount: Number(r.amount),
    savingsAmt: r.savingsAmt ? Number(r.savingsAmt) : null,
    category: normalizeExpenseCategory(r.category),
    note: r.note as string | null,
    monthKey: r.monthKey as string,
    occurredAt: r.occurredAt instanceof Date ? r.occurredAt.toISOString() : r.occurredAt as string,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt as string,
    deletedAt: r.deletedAt ? (r.deletedAt instanceof Date ? r.deletedAt.toISOString() : r.deletedAt as string) : null,
    accountId: r.accountId as string | null,
    accountName: (r.accountName as string) ?? undefined,
    toAccountId: r.toAccountId as string | null | undefined,
    toAccountName: (r.toAccountName as string) ?? undefined,
  };
}

export function mapExpenseTransaction(row: TransactionRow): ExpenseTransaction {
  const category = normalizeExpenseCategory(row.category) ?? "other";

  if (row.type !== "expense") {
    throw new Error("Expense transaction is invalid");
  }

  const base = mapTransactionRow(row);

  return {
    ...base,
    type: "expense",
    savingsAmt: null,
    category,
  };
}

export function buildMonthReport(monthKey: string, rows: TransactionRow[]): MonthReport {
  return rows.reduce<MonthReport>(
    (report, row) => {
      if (row.type === "income") {
        report.incomeTotal = roundAmount(report.incomeTotal + row.amount);
        report.savingsTotal = roundAmount(report.savingsTotal + (row.savingsAmt ?? 0));
      }

      if (row.type === "expense") {
        report.expenseTotal = roundAmount(report.expenseTotal + row.amount);
      }

      if (row.type === "transfer_to_savings") {
        report.savingsTotal = roundAmount(report.savingsTotal + row.amount);
      }

      if (row.type === "transfer_from_savings") {
        report.savingsWithdrawnTotal = roundAmount(report.savingsWithdrawnTotal + row.amount);
      }

      report.transactionCount += 1;
      report.netSavingsTotal = roundAmount(report.savingsTotal - report.savingsWithdrawnTotal);

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

export function buildSnapshot(rows: TransactionRow[], currentMonthKey = getMonthKey()): UserSnapshot {
  return rows.reduce<UserSnapshot>(
    (snapshot, row) => {
      if (row.type === "income") {
        const savingsAmt = row.savingsAmt ?? 0;
        snapshot.balance = roundAmount(snapshot.balance + row.amount - savingsAmt);
        snapshot.savings = roundAmount(snapshot.savings + savingsAmt);
      }

      if (row.type === "expense") {
        snapshot.balance = roundAmount(snapshot.balance - row.amount);

        if (row.monthKey === currentMonthKey) {
          snapshot.monthlyExp = roundAmount(snapshot.monthlyExp + row.amount);
        }
      }

      if (row.type === "transfer_to_savings") {
        snapshot.balance = roundAmount(snapshot.balance - row.amount);
        snapshot.savings = roundAmount(snapshot.savings + row.amount);
      }

      if (row.type === "transfer_from_savings") {
        snapshot.balance = roundAmount(snapshot.balance + row.amount);
        snapshot.savings = roundAmount(snapshot.savings - row.amount);
      }

      return snapshot;
    },
    {
      balance: 0,
      savings: 0,
      monthlyExp: 0,
    },
  );
}

export async function getActiveTransactionsForUser(
  tx: DbTransaction,
  userId: string,
): Promise<TransactionRow[]> {
  return tx
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
    .orderBy(transactions.occurredAt, transactions.createdAt);
}

export async function syncUserSnapshot(tx: DbTransaction, user: UserRow): Promise<UserRow> {
  const activeAccounts = await tx
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, user.id), isNull(accounts.deletedAt)))
    .orderBy(accounts.createdAt);

  if (activeAccounts.length === 0) {
    // No accounts at all - reset totals to zero
    const updated = await tx
      .update(users)
      .set({
        balance: "0" as any,
        savings: "0" as any,
        monthlyExp: "0" as any,
      })
      .where(eq(users.id, user.id))
      .returning();
    return updated[0] as UserRow;
  }

  const { getExchangeRates } = await import("../currency.service.js");
  const { rates } = await getExchangeRates();

  const baseCurrency = user.currency;

  const accountBalances: Record<string, number> = {};
  const accountMap: Record<string, typeof activeAccounts[0]> = {};
  for (const acc of activeAccounts) {
    accountBalances[acc.id] = 0;
    accountMap[acc.id] = acc;
  }

  // The first account (oldest by created_at) is the "main" account.
  // Orphan transactions (account_id IS NULL) are attributed to it so that
  // users who existed before the multi-account feature keep their balance.
  const mainAccountId = activeAccounts[0]!.id;

  let totalSavings = 0;
  let monthlyExp = 0;
  const currentMonthKey = getMonthKey();
  const monthlyExpResetAt = user.monthlyExpResetAt;

  const rows = await getActiveTransactionsForUser(tx, user.id);

  const convertCurrency = (val: number, from: string, to: string) => {
    if (from === to) return val;
    const fromRate = rates[from as CurrencyCode] || 1;
    const toRate = rates[to as CurrencyCode] || 1;
    return val * (toRate / fromRate);
  };

  const getAccRoundFn = (id: string) => {
    const acc = accountMap[id];
    return acc && acc.type === "crypto"
      ? (val: number) => Number(val.toFixed(8))
      : (val: number) => Number(val.toFixed(2));
  };

  for (const row of rows) {
    // Route orphan transactions (no account_id or unknown account) to the main account
    const accId = (row.accountId && row.accountId in accountBalances)
      ? row.accountId
      : mainAccountId;

    const acc = accountMap[accId]!;
    const accCurrency = acc.currency;
    const roundAcc = getAccRoundFn(accId);
    const currentBalance = accountBalances[accId] ?? 0;

    if (row.type === "income") {
      const savingsAmt = row.savingsAmt ?? 0;
      accountBalances[accId] = roundAcc(currentBalance + row.amount - savingsAmt);
      totalSavings = roundAmount(totalSavings + convertCurrency(savingsAmt, accCurrency, baseCurrency));
    }

    else if (row.type === "expense") {
      accountBalances[accId] = roundAcc(currentBalance - row.amount);
      if (row.monthKey === currentMonthKey && (!monthlyExpResetAt || row.occurredAt > monthlyExpResetAt)) {
        monthlyExp = roundAmount(monthlyExp + convertCurrency(row.amount, accCurrency, baseCurrency));
      }
    }

    else if (row.type === "transfer_to_savings") {
      accountBalances[accId] = roundAcc(currentBalance - row.amount);
      totalSavings = roundAmount(totalSavings + convertCurrency(row.amount, accCurrency, baseCurrency));
    }

    else if (row.type === "transfer_from_savings") {
      accountBalances[accId] = roundAcc(currentBalance + row.amount);
      totalSavings = roundAmount(totalSavings - convertCurrency(row.amount, accCurrency, baseCurrency));
    }

    else if (row.type === "transfer_between_accounts") {
      accountBalances[accId] = roundAcc(currentBalance - row.amount);

      const toAccId = row.toAccountId;
      if (toAccId && toAccId in accountBalances) {
        const toAmount = row.savingsAmt ?? row.amount;
        const toRoundAcc = getAccRoundFn(toAccId);
        const targetBalance = accountBalances[toAccId] ?? 0;
        accountBalances[toAccId] = toRoundAcc(targetBalance + toAmount);
      }
    }
  }

  for (const acc of activeAccounts) {
    const bal = accountBalances[acc.id]!;
    if (bal < 0 && acc.type !== "crypto") {
      throw new AppError(
        ErrorCode.INSUFFICIENT_FUNDS,
        `Operation would make balance negative on account "${acc.name}"`
      );
    }
  }

  if (totalSavings < 0) {
    throw new AppError(ErrorCode.INSUFFICIENT_FUNDS, "Operation would make savings negative");
  }

  for (const acc of activeAccounts) {
    const nextBal = accountBalances[acc.id]!;
    if (Number(acc.balance) !== nextBal) {
      await tx
        .update(accounts)
        .set({ balance: String(nextBal) as any })
        .where(eq(accounts.id, acc.id));
    }
  }

  let totalBalance = 0;
  for (const acc of activeAccounts) {
    const bal = accountBalances[acc.id]!;
    totalBalance = roundAmount(totalBalance + convertCurrency(bal, acc.currency, baseCurrency));
  }

  const updated = await tx
    .update(users)
    .set({
      balance: String(totalBalance) as any,
      savings: String(totalSavings) as any,
      monthlyExp: String(monthlyExp) as any,
    })
    .where(eq(users.id, user.id))
    .returning();

  return updated[0] as UserRow;
}

export async function persistStatus(row: UserRow): Promise<Status> {
  const status = await buildStatus(row);

  await setCachedStatus(row.telegramId, status);

  return status;
}

export async function findTransactionForUser(
  tx: DbTransaction,
  userId: string,
  transactionId: string,
  includeDeleted = false,
): Promise<TransactionRow> {
  const conditions = [eq(transactions.userId, userId), eq(transactions.id, transactionId)];

  if (!includeDeleted) {
    conditions.push(isNull(transactions.deletedAt));
  }

  const rows = await tx
    .select()
    .from(transactions)
    .where(and(...conditions))
    .limit(1);

  const transaction = rows[0];

  if (!transaction) {
    throw new AppError(ErrorCode.NOT_FOUND, "Transaction not found");
  }

  return transaction;
}

export function parseRecurringPayload(payload: RecurringTransactionPayload): ParsedTemplate {
  const title = payload.title.trim().slice(0, 60);

  if (!title) {
    throw new AppError(ErrorCode.VALIDATION, "Recurring transaction needs a title");
  }

  assertPositiveAmount(payload.amount);

  if (payload.type === "income") {
    return {
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
      throw new AppError(ErrorCode.VALIDATION, "Expense category is required");
    }

    return {
      title,
      type: "expense",
      amount: roundAmount(payload.amount),
      savingsAmt: null,
      category: payload.category,
      note: normalizeNote(payload.note),
    };
  }

  return {
    title,
    type: payload.type,
    amount: roundAmount(payload.amount),
    savingsAmt: null,
    category: null,
    note: normalizeNote(payload.note),
  };
}

export async function createTransaction(
  tx: DbTransaction,
  user: UserRow,
  input: {
    type: TransactionType;
    amount: number;
    category?: string | null;
    savingsAmt?: number | null;
    note?: string | null;
    occurredAt?: string;
    accountId?: string | null;
    toAccountId?: string | null;
  },
): Promise<UserRow> {
  const occurredAt = parseOccurredAt(input.occurredAt);

  let targetAccountId = input.accountId;
  let targetAccount: AccountRow | null = null;
  if (!targetAccountId) {
    const active = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, user.id), isNull(accounts.deletedAt)))
      .orderBy(accounts.createdAt)
      .limit(1);

    if (active.length > 0) {
      targetAccount = active[0]!;
      targetAccountId = targetAccount.id;
    } else {
      // No accounts exist yet - create a default "Main" account on the fly
      const accountName = user.language === "ru" ? "Основной" : "Main";
      const [newAcc] = await tx
        .insert(accounts)
        .values({
          userId: user.id,
          name: accountName,
          type: "cash",
          currency: user.currency || "UZS",
          balance: 0,
        })
        .returning();
      targetAccount = newAcc!;
      targetAccountId = targetAccount.id;
    }
  }

  if (targetAccountId && !targetAccount) {
    const [account] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, targetAccountId), eq(accounts.userId, user.id), isNull(accounts.deletedAt)))
      .limit(1);

    if (!account) {
      throw new AppError(ErrorCode.NOT_FOUND, "Account not found");
    }

    targetAccount = account;
  }

  if (input.toAccountId) {
    const [toAccount] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, input.toAccountId), eq(accounts.userId, user.id), isNull(accounts.deletedAt)))
      .limit(1);

    if (!toAccount) {
      throw new AppError(ErrorCode.NOT_FOUND, "Destination account not found");
    }
  }

  let amountStr = String(roundAmount(input.amount));
  let savingsAmtStr = input.savingsAmt && input.savingsAmt > 0 ? String(roundAmount(input.savingsAmt)) : null;

  if (targetAccount?.type === "crypto") {
    amountStr = String(Number(input.amount.toFixed(8)));
    savingsAmtStr = input.savingsAmt && input.savingsAmt > 0 ? String(Number(input.savingsAmt.toFixed(8))) : null;
  }

  await tx.insert(transactions).values({
    userId: user.id,
    type: input.type,
    amount: amountStr as any,
    category: input.category ?? null,
    savingsAmt: savingsAmtStr as any,
    note: normalizeNote(input.note),
    monthKey: getMonthKey(occurredAt),
    occurredAt,
    accountId: targetAccountId ?? null,
    toAccountId: input.toAccountId ?? null,
  });

  return syncUserSnapshot(tx, user);
}
