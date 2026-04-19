import type { MonthReport, SavingsPct, Status } from "@finance-twa/shared-types";

import { and, eq } from "drizzle-orm";

import { db } from "../config/database.js";
import { transactions, users, type TransactionRow, type UserRow } from "../db/schema/index.js";
import { getMonthKey } from "../utils/daily-limit.js";
import { invalidateStatusCache, setCachedStatus } from "./cache.service.js";
import { buildStatus, ensureUser } from "./user.service.js";

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

function buildMonthReport(monthKey: string, rows: TransactionRow[]): MonthReport {
  return rows.reduce<MonthReport>(
    (report, row) => {
      if (row.type === "income") {
        report.incomeTotal = Number((report.incomeTotal + row.amount).toFixed(2));
      }

      if (row.type === "expense") {
        report.expenseTotal = Number((report.expenseTotal + row.amount).toFixed(2));
      }

      if (row.savingsAmt) {
        report.savingsTotal = Number((report.savingsTotal + row.savingsAmt).toFixed(2));
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

async function persistStatus(row: UserRow): Promise<Status> {
  const status = buildStatus(row);

  await setCachedStatus(row.telegramId, status);

  return status;
}

export async function addIncome(
  telegramId: number,
  amount: number,
  savingsPct?: SavingsPct,
): Promise<Status> {
  assertPositiveAmount(amount);

  const user = await ensureUser(telegramId);
  const nextSavingsPct = normalizeSavingsPct(savingsPct) ?? (user.savingsPct as SavingsPct);
  const savingsAmt = Number((amount * (nextSavingsPct / 100)).toFixed(2));
  const balanceDelta = Number((amount - savingsAmt).toFixed(2));
  const monthKey = getMonthKey();

  const updatedUser = await db.transaction(async (tx) => {
    const updated = await tx
      .update(users)
      .set({
        balance: Number((user.balance + balanceDelta).toFixed(2)),
        savings: Number((user.savings + savingsAmt).toFixed(2)),
        savingsPct: nextSavingsPct,
      })
      .where(eq(users.id, user.id))
      .returning();

    await tx.insert(transactions).values({
      userId: user.id,
      type: "income",
      amount,
      savingsAmt,
      monthKey,
    });

    return updated[0] as UserRow;
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function addExpense(telegramId: number, amount: number): Promise<Status> {
  assertPositiveAmount(amount);

  const user = await ensureUser(telegramId);

  if (user.balance < amount) {
    throw new Error("Insufficient balance for expense");
  }

  const monthKey = getMonthKey();

  const updatedUser = await db.transaction(async (tx) => {
    const updated = await tx
      .update(users)
      .set({
        balance: Number((user.balance - amount).toFixed(2)),
        monthlyExp: Number((user.monthlyExp + amount).toFixed(2)),
      })
      .where(eq(users.id, user.id))
      .returning();

    await tx.insert(transactions).values({
      userId: user.id,
      type: "expense",
      amount,
      monthKey,
    });

    return updated[0] as UserRow;
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function getReport(telegramId: number, monthKey = getMonthKey()): Promise<MonthReport> {
  const user = await ensureUser(telegramId);
  const rows = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), eq(transactions.monthKey, monthKey)));

  return buildMonthReport(monthKey, rows);
}

export async function newMonth(telegramId: number): Promise<Status> {
  const user = await ensureUser(telegramId);

  const updated = await db
    .update(users)
    .set({
      monthlyExp: 0,
    })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);

  return persistStatus(updated[0] as UserRow);
}
