import type { CryptoCode, CryptoHolding, Status } from "@finance-twa/shared-types";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "../../config/database.js";
import { transactions, accounts, type AccountRow } from "../../db/schema/index.js";
import { getMonthKey } from "../../utils/daily-limit.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { invalidateStatusCache } from "../cache.service.js";
import { ensureUser, getStatusByTelegramId } from "./status.js";
import { sanitizeHoldings } from "./crypto.js";

async function getActiveAccountsForUser(userId: string): Promise<AccountRow[]> {
  return db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), isNull(accounts.deletedAt)));
}

export async function createAccount(
  telegramId: number,
  params: { name: string; type: "cash" | "card" | "crypto"; currency: string; initialBalance: number; holdings?: CryptoHolding[] }
): Promise<Status> {
  const user = await ensureUser(telegramId);
  const isCrypto = params.type === "crypto";
  const holdings = isCrypto ? sanitizeHoldings(params.holdings) : [];

  await db.transaction(async (tx) => {
    // Check if this is the user's first account being created.
    // If so, any existing transactions without account_id belong to this account.
    const existingAccounts = await getActiveAccountsForUser(user.id);

    const isFirstAccount = existingAccounts.length === 0;

    const [acc] = await tx
      .insert(accounts)
      .values({
        userId: user.id,
        name: params.name.trim(),
        type: params.type,
        currency: isCrypto ? "USD" : params.currency,
        balance: 0,
        holdings,
      })
      .returning();

    if (!acc) {
      throw new Error("Failed to create account");
    }

    // Re-attach all orphan transactions (account_id IS NULL) to this first account
    // so that the user's historical balance is preserved and not lost.
    if (isFirstAccount) {
      await tx
        .update(transactions)
        .set({ accountId: acc.id })
        .where(and(eq(transactions.userId, user.id), isNull(transactions.accountId), isNull(transactions.deletedAt)));
    }

    // Only cash/card initial balances feed the transaction ledger.
    if (!isCrypto && params.initialBalance > 0) {
      await tx.insert(transactions).values({
        userId: user.id,
        accountId: acc.id,
        type: "income",
        amount: params.initialBalance,
        note: "Initial balance",
        monthKey: getMonthKey(),
        occurredAt: new Date(),
      });
    }

    const { syncUserSnapshot } = await import("../finance/_shared.js");
    await syncUserSnapshot(tx, user);
  });

  await invalidateStatusCache(telegramId);
  return getStatusByTelegramId(telegramId);
}

export async function setCryptoHolding(
  telegramId: number,
  params: { accountId: string; symbol: CryptoCode; amount: number }
): Promise<Status> {
  const user = await ensureUser(telegramId);

  const [acc] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.id, params.accountId), eq(accounts.userId, user.id), isNull(accounts.deletedAt)))
    .limit(1);

  if (!acc) {
    throw new AppError(ErrorCode.VALIDATION, "Account not found");
  }
  if (acc.type !== "crypto") {
    throw new AppError(ErrorCode.VALIDATION, "Only crypto accounts can hold coins");
  }

  const amount = Number.isFinite(params.amount) && params.amount > 0 ? Number(params.amount.toFixed(8)) : 0;
  const current = sanitizeHoldings(acc.holdings).filter((h) => h.symbol !== params.symbol);
  const nextHoldings = amount > 0 ? [...current, { symbol: params.symbol, amount }] : current;

  await db
    .update(accounts)
    .set({ holdings: nextHoldings })
    .where(and(eq(accounts.id, params.accountId), eq(accounts.userId, user.id)));

  await invalidateStatusCache(telegramId);
  return getStatusByTelegramId(telegramId);
}

export async function updateAccount(
  telegramId: number,
  params: { accountId: string; name: string }
): Promise<Status> {
  const user = await ensureUser(telegramId);

  await db
    .update(accounts)
    .set({ name: params.name.trim() })
    .where(and(eq(accounts.id, params.accountId), eq(accounts.userId, user.id)));

  await invalidateStatusCache(telegramId);
  return getStatusByTelegramId(telegramId);
}

export async function deleteAccount(
  telegramId: number,
  accountIdVal: string
): Promise<Status> {
  const user = await ensureUser(telegramId);

  const activeAccounts = await getActiveAccountsForUser(user.id);

  if (activeAccounts.length <= 1) {
    throw new AppError(ErrorCode.VALIDATION, "Cannot delete the last remaining account");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(accounts)
      .set({ deletedAt: new Date() })
      .where(and(eq(accounts.id, accountIdVal), eq(accounts.userId, user.id)));

    await tx
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(and(eq(transactions.accountId, accountIdVal), eq(transactions.userId, user.id)));

    const { syncUserSnapshot } = await import("../finance/_shared.js");
    await syncUserSnapshot(tx, user);
  });

  await invalidateStatusCache(telegramId);
  return getStatusByTelegramId(telegramId);
}
