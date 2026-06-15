import type {
  ExpenseTransaction,
  SavingsTransferDirection,
  Status,
  Transaction,
  TransactionFilters,
  TransactionUpdatePayload,
} from "@finance-twa/shared-types";

import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "../../config/database.js";
import { transactions, accounts } from "../../db/schema/index.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { escapeIlike } from "../../utils/sql.js";
import { getMonthKey } from "../../utils/daily-limit.js";
import { invalidateStatusCache } from "../cache.service.js";
import { ensureUser } from "../user/index.js";
import {
  assertPositiveAmount,
  createTransaction,
  findTransactionForUser,
  mapExpenseTransaction,
  mapTransactionRow,
  normalizeNote,
  normalizeSavingsAmount,
  parseOccurredAt,
  persistStatus,
  roundAmount,
  syncUserSnapshot,
  type DbTransaction,
} from "./_shared.js";

async function resolveDefaultAccountId(dbOrTx: typeof db | DbTransaction, userId: string): Promise<string | null> {
  const active = await dbOrTx
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt)))
    .orderBy(accounts.createdAt)
    .limit(1);
  return active.length > 0 ? active[0]!.id : null;
}

async function assertAccountOwnership(dbOrTx: typeof db | DbTransaction, accountId: string, userId: string) {
  const [acc] = await dbOrTx
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!acc) {
    throw new AppError(ErrorCode.NOT_FOUND, "Account not found");
  }
  return acc;
}

function selectTransactionWithJoins(aliasAcc: ReturnType<typeof alias>, aliasToAcc: ReturnType<typeof alias>) {
  return db
    .select({
      id: transactions.id,
      userId: transactions.userId,
      type: transactions.type,
      amount: transactions.amount,
      savingsAmt: transactions.savingsAmt,
      category: transactions.category,
      note: transactions.note,
      monthKey: transactions.monthKey,
      occurredAt: transactions.occurredAt,
      createdAt: transactions.createdAt,
      deletedAt: transactions.deletedAt,
      accountId: transactions.accountId,
      accountName: aliasAcc.name,
      toAccountId: transactions.toAccountId,
      toAccountName: aliasToAcc.name,
    })
    .from(transactions)
    .leftJoin(aliasAcc, eq(transactions.accountId, aliasAcc.id))
    .leftJoin(aliasToAcc, eq(transactions.toAccountId, aliasToAcc.id));
}

export async function addIncome(
  telegramId: number,
  amount: number,
  savingsAmt?: number,
  note?: string | null,
  occurredAt?: string,
  accountId?: string,
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
      accountId,
    }),
  );

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function addExpense(
  telegramId: number,
  amount: number,
  category: string,
  note?: string | null,
  occurredAt?: string,
  accountId?: string,
): Promise<Status> {
  assertPositiveAmount(amount);

  const user = await ensureUser(telegramId);

  const targetAccountId = accountId || await resolveDefaultAccountId(db, user.id);

  if (targetAccountId) {
    const acc = await assertAccountOwnership(db, targetAccountId, user.id);
    if (acc.type !== "crypto" && Number(acc.balance) < amount) {
      throw new AppError(ErrorCode.INSUFFICIENT_FUNDS, `Insufficient balance in account "${acc.name}"`);
    }
  }

  const updatedUser = await db.transaction(async (tx) =>
    createTransaction(tx, user, {
      type: "expense",
      amount,
      category,
      note,
      occurredAt,
      accountId: targetAccountId,
    }),
  );

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function transferSavings(
  telegramId: number,
  amount: number,
  direction: SavingsTransferDirection,
  note?: string | null,
  occurredAt?: string,
  accountId?: string,
): Promise<Status> {
  assertPositiveAmount(amount);

  const user = await ensureUser(telegramId);

  const targetAccountId = accountId || await resolveDefaultAccountId(db, user.id);

  if (targetAccountId) {
    const acc = await assertAccountOwnership(db, targetAccountId, user.id);

    if (direction === "to_savings" && Number(acc.balance) < amount) {
      throw new AppError(ErrorCode.INSUFFICIENT_FUNDS, `Insufficient balance in account "${acc.name}" for savings transfer`);
    }
  }

  if (direction === "from_savings" && user.savings < amount) {
    throw new AppError(ErrorCode.INSUFFICIENT_FUNDS, "Insufficient savings for transfer");
  }

  const updatedUser = await db.transaction(async (tx) =>
    createTransaction(tx, user, {
      type: direction === "to_savings" ? "transfer_to_savings" : "transfer_from_savings",
      amount,
      note,
      occurredAt,
      accountId: targetAccountId,
    }),
  );

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}

export async function getRecentExpenses(telegramId: number, limit = 5): Promise<ExpenseTransaction[]> {
  const user = await ensureUser(telegramId);
  const safeLimit = Math.min(Math.max(Math.trunc(limit) || 5, 1), 10);
  const monthKey = getMonthKey();

  const aliasAcc = alias(accounts, "acc");
  const aliasToAcc = alias(accounts, "toAcc");

  const rows = await selectTransactionWithJoins(aliasAcc, aliasToAcc)
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
    const escaped = escapeIlike(filters.search.trim());
    whereClauses.push(ilike(transactions.note, `%${escaped}%`));
  }

  const limit = Math.min(Math.max(Math.trunc(filters.limit ?? 50), 1), 200);
  const offset = Math.max(Math.trunc(filters.offset ?? 0), 0);

  const aliasAcc = alias(accounts, "acc");
  const aliasToAcc = alias(accounts, "toAcc");

  const rows = await selectTransactionWithJoins(aliasAcc, aliasToAcc)
    .where(and(...whereClauses))
    .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);

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

    let nextCategory: string | null = current.category ?? null;
    let nextSavingsAmt = current.savingsAmt;

    if (current.type === "income") {
      nextCategory = null;
      nextSavingsAmt = normalizeSavingsAmount(nextAmount, payload.savingsAmt ?? current.savingsAmt);
    }

    if (current.type === "expense") {
      nextSavingsAmt = null;
      nextCategory = payload.category ?? current.category;

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

    return updated[0];
  });

  await invalidateStatusCache(telegramId);

  return mapTransactionRow(updatedRow!);
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

export async function transferBetweenAccounts(
  telegramId: number,
  params: { fromAccountId: string; toAccountId: string; amount: number; toAmount?: number }
): Promise<Status> {
  assertPositiveAmount(params.amount);
  if (params.toAmount !== undefined) {
    assertPositiveAmount(params.toAmount);
  }

  const user = await ensureUser(telegramId);

  const updatedUser = await db.transaction(async (tx) => {
    const [fromAcc] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, params.fromAccountId), eq(accounts.userId, user.id)))
      .limit(1);

    if (!fromAcc) {
      throw new AppError(ErrorCode.NOT_FOUND, "Source account not found");
    }

    const [toAcc] = await tx
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, params.toAccountId), eq(accounts.userId, user.id)))
      .limit(1);

    if (!toAcc) {
      throw new AppError(ErrorCode.NOT_FOUND, "Destination account not found");
    }

    // Crypto balances are derived from holdings, so they can't take part in
    // plain balance transfers. Adjust crypto via the holdings editor instead.
    if (fromAcc.type === "crypto" || toAcc.type === "crypto") {
      throw new AppError(ErrorCode.VALIDATION, "Crypto accounts cannot be used in transfers; edit holdings instead");
    }

    if (Number(fromAcc.balance) < params.amount) {
      throw new AppError(ErrorCode.INSUFFICIENT_FUNDS, `Insufficient funds in account "${fromAcc.name}"`);
    }

    return createTransaction(tx, user, {
      type: "transfer_between_accounts",
      amount: params.amount,
      savingsAmt: params.toAmount ?? params.amount,
      accountId: params.fromAccountId,
      toAccountId: params.toAccountId,
      note: `Transfer from ${fromAcc.name} to ${toAcc.name}`,
    });
  });

  await invalidateStatusCache(telegramId);
  return persistStatus(updatedUser);
}
