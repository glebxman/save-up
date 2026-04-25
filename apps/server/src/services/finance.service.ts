import { randomUUID } from "node:crypto";

import {
  MAX_FINANCE_AMOUNT,
} from "@finance-twa/shared-types";

import type {
  CategoryBreakdown,
  CategoryBreakdownItem,
  ExpenseCategory,
  ExpenseTransaction,
  MonthReport,
  RecurringTransaction,
  RecurringTransactionPayload,
  SavingsTransferDirection,
  Status,
  Transaction,
  TransactionFilters,
  TransactionType,
  TransactionUpdatePayload,
} from "@finance-twa/shared-types";

import { and, count, desc, eq, ilike, isNull, sql } from "drizzle-orm";

import { db } from "../config/database.js";
import { transactions, users, type TransactionRow, type UserRow } from "../db/schema/index.js";
import { getMonthKey } from "../utils/daily-limit.js";
import { invalidateStatusCache, setCachedStatus } from "./cache.service.js";
import { buildStatus, ensureUser } from "./user.service.js";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface ParsedTemplate {
  title: string;
  type: TransactionType;
  amount: number;
  savingsAmt: number | null;
  category: ExpenseCategory | null;
  note: string | null;
}

interface UserSnapshot {
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

function roundAmount(value: number): number {
  return Number(value.toFixed(2));
}

function getPreviousMonthKey(date = new Date()): string {
  const previous = new Date(date);
  previous.setMonth(previous.getMonth() - 1);
  return getMonthKey(previous);
}

function assertPositiveAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  if (amount > MAX_FINANCE_AMOUNT) {
    throw new Error(`Amount is too large. Maximum allowed is ${MAX_FINANCE_AMOUNT.toFixed(2)}`);
  }
}

function normalizeNote(note?: string | null): string | null {
  const trimmed = note?.trim();
  return trimmed ? trimmed.slice(0, 240) : null;
}

function parseOccurredAt(value?: string): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Transaction date is invalid");
  }

  return parsed;
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

function normalizeExpenseCategory(category: unknown): ExpenseCategory | null {
  return typeof category === "string" && expenseCategories.has(category as ExpenseCategory)
    ? category as ExpenseCategory
    : null;
}

function mapRecurringTemplates(row: UserRow): RecurringTransaction[] {
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
    }))
    .filter((item) => Number.isFinite(item.amount) && item.amount > 0);
}

function mapTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as TransactionType,
    amount: row.amount,
    savingsAmt: row.savingsAmt,
    category: normalizeExpenseCategory(row.category),
    note: row.note,
    monthKey: row.monthKey,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
}

function mapExpenseTransaction(row: TransactionRow): ExpenseTransaction {
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

function buildMonthReport(monthKey: string, rows: TransactionRow[]): MonthReport {
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

function buildSnapshot(rows: TransactionRow[], currentMonthKey = getMonthKey()): UserSnapshot {
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

async function getActiveTransactionsForUser(tx: DbTransaction, userId: string): Promise<TransactionRow[]> {
  return tx
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), isNull(transactions.deletedAt)))
    .orderBy(transactions.occurredAt, transactions.createdAt);
}

async function syncUserSnapshot(tx: DbTransaction, user: UserRow): Promise<UserRow> {
  const rows = await getActiveTransactionsForUser(tx, user.id);
  const snapshot = buildSnapshot(rows);

  if (snapshot.balance < 0) {
    throw new Error("Operation would make balance negative");
  }

  if (snapshot.savings < 0) {
    throw new Error("Operation would make savings negative");
  }

  const updated = await tx
    .update(users)
    .set({
      balance: snapshot.balance,
      savings: snapshot.savings,
      monthlyExp: snapshot.monthlyExp,
    })
    .where(eq(users.id, user.id))
    .returning();

  return updated[0] as UserRow;
}

async function persistStatus(row: UserRow): Promise<Status> {
  const status = buildStatus(row);

  await setCachedStatus(row.telegramId, status);

  return status;
}

async function findTransactionForUser(
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
    throw new Error("Transaction not found");
  }

  return transaction;
}

function parseRecurringPayload(payload: RecurringTransactionPayload): ParsedTemplate {
  const title = payload.title.trim().slice(0, 60);

  if (!title) {
    throw new Error("Recurring transaction needs a title");
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
      throw new Error("Expense category is required");
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

async function createTransaction(
  tx: DbTransaction,
  user: UserRow,
  input: {
    type: TransactionType;
    amount: number;
    category?: ExpenseCategory | null;
    savingsAmt?: number | null;
    note?: string | null;
    occurredAt?: string;
  },
): Promise<UserRow> {
  const occurredAt = parseOccurredAt(input.occurredAt);

  await tx.insert(transactions).values({
    userId: user.id,
    type: input.type,
    amount: roundAmount(input.amount),
    category: input.category ?? null,
    savingsAmt: input.savingsAmt && input.savingsAmt > 0 ? roundAmount(input.savingsAmt) : null,
    note: normalizeNote(input.note),
    monthKey: getMonthKey(occurredAt),
    occurredAt,
  });

  return syncUserSnapshot(tx, user);
}

export async function addIncome(
  telegramId: number,
  amount: number,
  savingsAmt?: number,
  note?: string | null,
  occurredAt?: string,
): Promise<Status> {
  assertPositiveAmount(amount);

  const user = await ensureUser(telegramId);
  const nextSavingsAmt = normalizeSavingsAmount(amount, savingsAmt);
  const updatedUser = await db.transaction(async (tx) =>
    createTransaction(tx, user, {
      type: "income",
      amount,
      savingsAmt: nextSavingsAmt,
      note,
      occurredAt,
    }));

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function addExpense(
  telegramId: number,
  amount: number,
  category: ExpenseCategory,
  note?: string | null,
  occurredAt?: string,
): Promise<Status> {
  assertPositiveAmount(amount);

  const user = await ensureUser(telegramId);

  if (user.balance < amount) {
    throw new Error("Insufficient balance for expense");
  }

  const updatedUser = await db.transaction(async (tx) =>
    createTransaction(tx, user, {
      type: "expense",
      amount,
      category,
      note,
      occurredAt,
    }));

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function transferSavings(
  telegramId: number,
  amount: number,
  direction: SavingsTransferDirection,
  note?: string | null,
  occurredAt?: string,
): Promise<Status> {
  assertPositiveAmount(amount);

  const user = await ensureUser(telegramId);

  if (direction === "to_savings" && user.balance < amount) {
    throw new Error("Insufficient balance for transfer");
  }

  if (direction === "from_savings" && user.savings < amount) {
    throw new Error("Insufficient savings for transfer");
  }

  const updatedUser = await db.transaction(async (tx) =>
    createTransaction(tx, user, {
      type: direction === "to_savings" ? "transfer_to_savings" : "transfer_from_savings",
      amount,
      note,
      occurredAt,
    }));

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function getRecentExpenses(telegramId: number, limit = 5): Promise<ExpenseTransaction[]> {
  const user = await ensureUser(telegramId);
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 5, 1), 10);
  const monthKey = getMonthKey();
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.type, "expense"),
        eq(transactions.monthKey, monthKey),
        isNull(transactions.deletedAt),
      ),
    )
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
    .limit(safeLimit);

  return rows.map((row) => mapExpenseTransaction(row));
}

export async function getTransactions(
  telegramId: number,
  filters: TransactionFilters = {},
): Promise<Transaction[]> {
  const user = await ensureUser(telegramId);
  const whereClauses = [eq(transactions.userId, user.id)];

  if (!filters.includeDeleted) {
    whereClauses.push(isNull(transactions.deletedAt));
  }

  if (filters.monthKey) {
    whereClauses.push(eq(transactions.monthKey, filters.monthKey));
  }

  if (filters.type && filters.type !== "all") {
    whereClauses.push(eq(transactions.type, filters.type));
  }

  if (filters.category && filters.category !== "all") {
    whereClauses.push(eq(transactions.category, filters.category));
  }

  if (filters.search?.trim()) {
    whereClauses.push(ilike(transactions.note, `%${filters.search.trim()}%`));
  }

  const baseQuery = db
    .select()
    .from(transactions)
    .where(and(...whereClauses))
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt));
  const rows = filters.limit
    ? await baseQuery.limit(Math.min(Math.max(Math.trunc(filters.limit), 1), 200))
    : await baseQuery;

  return rows.map((row) => mapTransactionRow(row));
}

export async function updateTransaction(
  telegramId: number,
  payload: TransactionUpdatePayload,
): Promise<Transaction> {
  const user = await ensureUser(telegramId);

  const updatedRow = await db.transaction(async (tx) => {
    const current = await findTransactionForUser(tx, user.id, payload.transactionId);
    const nextOccurredAt = parseOccurredAt(payload.occurredAt ?? current.occurredAt.toISOString());
    const nextAmount = roundAmount(payload.amount);

    assertPositiveAmount(nextAmount);

    let nextCategory = current.category as ExpenseCategory | null;
    let nextSavingsAmt = current.savingsAmt;

    if (current.type === "income") {
      nextCategory = null;
      nextSavingsAmt = normalizeSavingsAmount(nextAmount, payload.savingsAmt ?? current.savingsAmt);
    }

    if (current.type === "expense") {
      nextSavingsAmt = null;
      nextCategory = payload.category ?? (current.category as ExpenseCategory | null);

      if (!nextCategory) {
        throw new Error("Expense category is required");
      }
    }

    if (current.type === "transfer_to_savings" || current.type === "transfer_from_savings") {
      nextSavingsAmt = null;
      nextCategory = null;
    }

    const updated = await tx
      .update(transactions)
      .set({
        amount: nextAmount,
        category: nextCategory,
        savingsAmt: nextSavingsAmt && nextSavingsAmt > 0 ? nextSavingsAmt : null,
        note: normalizeNote(payload.note ?? current.note),
        occurredAt: nextOccurredAt,
        monthKey: getMonthKey(nextOccurredAt),
      })
      .where(eq(transactions.id, current.id))
      .returning();

    await syncUserSnapshot(tx, user);

    return updated[0] as TransactionRow;
  });

  await invalidateStatusCache(telegramId);

  return mapTransactionRow(updatedRow);
}

export async function archiveTransaction(telegramId: number, transactionId: string): Promise<Status> {
  const user = await ensureUser(telegramId);
  const updatedUser = await db.transaction(async (tx) => {
    await findTransactionForUser(tx, user.id, transactionId);

    await tx
      .update(transactions)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(transactions.id, transactionId));

    return syncUserSnapshot(tx, user);
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function restoreTransaction(telegramId: number, transactionId: string): Promise<Status> {
  const user = await ensureUser(telegramId);
  const updatedUser = await db.transaction(async (tx) => {
    await findTransactionForUser(tx, user.id, transactionId, true);

    await tx
      .update(transactions)
      .set({
        deletedAt: null,
      })
      .where(eq(transactions.id, transactionId));

    return syncUserSnapshot(tx, user);
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function updateSavingsGoal(telegramId: number, goal: number): Promise<Status> {
  const user = await ensureUser(telegramId);
  const updated = await db
    .update(users)
    .set({
      savingsGoal: normalizeGoal(goal),
    })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);

  return persistStatus(updated[0] as UserRow);
}

export async function updateBalance(telegramId: number, balance: number): Promise<Status> {
  const user = await ensureUser(telegramId);
  const targetBalance = normalizeBalance(balance);
  const updatedUser = await db.transaction(async (tx) => {
    const rows = await getActiveTransactionsForUser(tx, user.id);
    const snapshot = buildSnapshot(rows);
    const delta = roundAmount(targetBalance - snapshot.balance);

    if (delta !== 0) {
      const amount = Math.abs(delta);

      assertPositiveAmount(amount);

      await tx.insert(transactions).values({
        userId: user.id,
        type: delta > 0 ? "income" : "expense",
        amount,
        category: delta < 0 ? "other" : null,
        savingsAmt: null,
        note: null,
        monthKey: getMonthKey(),
        occurredAt: new Date(),
      });
    }

    return syncUserSnapshot(tx, user);
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function resetAccountData(telegramId: number): Promise<Status> {
  const user = await ensureUser(telegramId);
  const updatedUser = await db.transaction(async (tx) => {
    await tx
      .delete(transactions)
      .where(eq(transactions.userId, user.id));

    const updated = await tx
      .update(users)
      .set({
        balance: 0,
        savings: 0,
        monthlyExp: 0,
        savingsGoal: 0,
        recurringTemplates: [],
      })
      .where(eq(users.id, user.id))
      .returning();

    return updated[0] as UserRow;
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function saveRecurringTransaction(
  telegramId: number,
  payload: RecurringTransactionPayload,
): Promise<Status> {
  const user = await ensureUser(telegramId);
  const parsed = parseRecurringPayload(payload);
  const templates = mapRecurringTemplates(user);
  const nextTemplate: RecurringTransaction = {
    id: payload.id ?? randomUUID(),
    ...parsed,
  };
  const index = templates.findIndex((item) => item.id === nextTemplate.id);

  if (index >= 0) {
    templates[index] = nextTemplate;
  } else {
    templates.unshift(nextTemplate);
  }

  const updated = await db
    .update(users)
    .set({
      recurringTemplates: templates,
    })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);

  return persistStatus(updated[0] as UserRow);
}

export async function deleteRecurringTransaction(telegramId: number, templateId: string): Promise<Status> {
  const user = await ensureUser(telegramId);
  const templates = mapRecurringTemplates(user).filter((item) => item.id !== templateId);
  const updated = await db
    .update(users)
    .set({
      recurringTemplates: templates,
    })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);

  return persistStatus(updated[0] as UserRow);
}

export async function applyRecurringTransaction(telegramId: number, templateId: string): Promise<Status> {
  const user = await ensureUser(telegramId);
  const template = mapRecurringTemplates(user).find((item) => item.id === templateId);

  if (!template) {
    throw new Error("Recurring transaction not found");
  }

  const updatedUser = await db.transaction(async (tx) => {
    if (template.type === "income") {
      return createTransaction(tx, user, {
        type: "income",
        amount: template.amount,
        savingsAmt: template.savingsAmt,
        note: template.note ?? template.title,
      });
    }

    if (template.type === "expense") {
      return createTransaction(tx, user, {
        type: "expense",
        amount: template.amount,
        category: template.category,
        note: template.note ?? template.title,
      });
    }

    return createTransaction(tx, user, {
      type: template.type,
      amount: template.amount,
      note: template.note ?? template.title,
    });
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function getReport(telegramId: number, monthKey = getMonthKey()): Promise<MonthReport> {
  const user = await ensureUser(telegramId);
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.monthKey, monthKey),
        isNull(transactions.deletedAt),
      ),
    );

  return buildMonthReport(monthKey, rows);
}

export async function getCategoryBreakdown(
  telegramId: number,
  monthKey = getMonthKey(),
): Promise<CategoryBreakdown> {
  const user = await ensureUser(telegramId);
  const rows = await db
    .select({
      category: transactions.category,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)::numeric(15,2)`,
      count: count(),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.monthKey, monthKey),
        eq(transactions.type, "expense"),
        isNull(transactions.deletedAt),
      ),
    )
    .groupBy(transactions.category);

  const items: CategoryBreakdownItem[] = rows
    .filter((row) => row.category !== null)
    .map((row) => ({
      category: row.category as ExpenseCategory,
      total: Number(row.total),
      count: Number(row.count),
    }));
  const expenseTotal = items.reduce((sum, item) => roundAmount(sum + item.total), 0);

  return { monthKey, items, expenseTotal };
}

export async function newMonth(telegramId: number): Promise<Status> {
  const user = await ensureUser(telegramId);
  const currentMonthKey = getMonthKey();
  const previousMonthKey = getPreviousMonthKey();

  const updatedUser = await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({
        monthKey: previousMonthKey,
      })
      .where(
        and(
          eq(transactions.userId, user.id),
          eq(transactions.type, "expense"),
          eq(transactions.monthKey, currentMonthKey),
          isNull(transactions.deletedAt),
        ),
      );

    return syncUserSnapshot(tx, user);
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}
