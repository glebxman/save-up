import {
  FREE_TRIAL_DAYS,
  type PaymentProvider,
  type SubscriptionPaymentLink,
  type SubscriptionPlanId,
} from "@finance-twa/shared-types";
import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "../../config/database.js";
import { env } from "../../config/env.js";
import { subscriptionPayments, users, type SubscriptionPaymentRow, type UserRow } from "../../db/schema/index.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { invalidateStatusCache } from "../cache.service.js";
import { buildStatus, ensureUser } from "../user/status.js";
import { addPlanMonths, getSubscriptionPlan, isSubscriptionPlanId } from "./plans.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface PaymeTransaction {
  id: string;
  paymentId: string;
  userId: string;
  planId: SubscriptionPlanId;
  amount: number;
  state: number;
  create_time: number;
  perform_time: number;
  cancel_time: number;
  reason: number | null;
}

export function paymentRowToPaymeTransaction(row: SubscriptionPaymentRow | null | undefined): PaymeTransaction | null {
  if (!row?.providerTransactionId || !isSubscriptionPlanId(row.planId)) return null;

  return {
    id: row.providerTransactionId,
    paymentId: row.id,
    userId: row.userId,
    planId: row.planId,
    amount: Number(row.amount),
    state: row.paymeState ?? 1,
    create_time: Number(row.paymeCreateTime ?? 0),
    perform_time: Number(row.paymePerformTime ?? 0),
    cancel_time: Number(row.paymeCancelTime ?? 0),
    reason: row.paymeReason ?? null,
  };
}

function requireProviderConfigured(provider: PaymentProvider): void {
  if (provider === "click") {
    if (!env.CLICK_MERCHANT_ID || !env.CLICK_SERVICE_ID || !env.CLICK_SECRET_KEY) {
      throw new AppError(ErrorCode.VALIDATION, "Click is not configured");
    }
    return;
  }

  if (!env.PAYME_MERCHANT_ID || (!env.PAYME_SECRET_KEY && !env.PAYME_TEST_KEY)) {
    throw new AppError(ErrorCode.VALIDATION, "Payme is not configured");
  }
}

function generateClickUrl(user: UserRow, amountUzs: number): string {
  const params = new URLSearchParams({
    service_id: env.CLICK_SERVICE_ID,
    merchant_id: env.CLICK_MERCHANT_ID,
    amount: String(amountUzs),
    transaction_param: user.id,
  });

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    params.set("additional_param3", fullName);
  }

  return `https://my.click.uz/services/pay?${params.toString()}`;
}

function generatePaymeUrl(userId: string, amountUzs: number): string {
  const amountTiyin = amountUzs * 100;
  const raw = [`m=${env.PAYME_MERCHANT_ID}`, `ac.user_id=${userId}`, `a=${amountTiyin}`].join(";");
  return `https://checkout.paycom.uz/${Buffer.from(raw).toString("base64")}`;
}

export async function createSubscriptionPaymentLink(
  telegramId: number,
  planId: SubscriptionPlanId,
  provider: PaymentProvider,
): Promise<SubscriptionPaymentLink> {
  requireProviderConfigured(provider);

  const plan = getSubscriptionPlan(planId);
  if (!plan) {
    throw new AppError(ErrorCode.VALIDATION, "Unknown subscription plan");
  }

  const user = await ensureUser(telegramId);
  const url = provider === "click"
    ? generateClickUrl(user, plan.priceUzs)
    : generatePaymeUrl(user.id, plan.priceUzs);

  return {
    provider,
    planId,
    amountUzs: plan.priceUzs,
    url,
  };
}

export async function startFreeTrial(telegramId: number) {
  const user = await ensureUser(telegramId);

  if (user.trialStartedAt) {
    throw new AppError(ErrorCode.CONFLICT, "Free trial already used");
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .update(users)
    .set({
      trialStartedAt: now,
      trialEndsAt,
    })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);
  return buildStatus(rows[0] as UserRow);
}

export async function findUserById(userId: string): Promise<UserRow | null> {
  const normalized = userId.trim();

  if (UUID_RE.test(normalized)) {
    const rows = await db.select().from(users).where(eq(users.id, normalized)).limit(1);
    return rows[0] ?? null;
  }

  if (/^\d+$/.test(normalized)) {
    const telegramId = Number(normalized);
    if (!Number.isSafeInteger(telegramId)) {
      return null;
    }

    const rows = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
    return rows[0] ?? null;
  }

  return null;
}

export async function findPaymeTransaction(txId: string): Promise<PaymeTransaction | null> {
  const rows = await db
    .select()
    .from(subscriptionPayments)
    .where(and(eq(subscriptionPayments.provider, "payme"), eq(subscriptionPayments.providerTransactionId, txId)))
    .limit(1);

  return paymentRowToPaymeTransaction(rows[0]);
}

export async function findPendingPaymeTransactionByUser(userId: string): Promise<PaymeTransaction | null> {
  const rows = await db
    .select()
    .from(subscriptionPayments)
    .where(
      and(
        eq(subscriptionPayments.provider, "payme"),
        eq(subscriptionPayments.userId, userId),
        eq(subscriptionPayments.paymeState, 1),
      ),
    )
    .orderBy(desc(subscriptionPayments.createdAt))
    .limit(1);

  return paymentRowToPaymeTransaction(rows[0]);
}

export async function savePendingPaymeTransaction(input: {
  txId: string;
  userId: string;
  planId: SubscriptionPlanId;
  amount: number;
  createTime: number;
}): Promise<PaymeTransaction> {
  const existing = await findPaymeTransaction(input.txId);
  if (existing) return existing;

  const rows = await db
    .insert(subscriptionPayments)
    .values({
      userId: input.userId,
      provider: "payme",
      planId: input.planId,
      amount: input.amount,
      status: "pending",
      providerTransactionId: input.txId,
      paymeState: 1,
      paymeCreateTime: input.createTime,
      paymePerformTime: 0,
      paymeCancelTime: 0,
    })
    .returning();

  const tx = paymentRowToPaymeTransaction(rows[0]);
  if (!tx) {
    throw new AppError(ErrorCode.INTERNAL, "Failed to create Payme transaction");
  }
  return tx;
}

export async function activateSubscriptionPayment(input: {
  userId: string;
  provider: PaymentProvider;
  planId: SubscriptionPlanId;
  amount: number;
  providerTransactionId?: string;
  providerPrepareId?: string;
  paymeState?: number;
  paymeCreateTime?: number;
  paymePerformTime?: number;
}): Promise<SubscriptionPaymentRow> {
  const plan = getSubscriptionPlan(input.planId);
  if (!plan) {
    throw new AppError(ErrorCode.VALIDATION, "Unknown subscription plan");
  }

  const result = await db.transaction(async (tx) => {
    const userRows = await tx.select().from(users).where(eq(users.id, input.userId)).limit(1);
    const user = userRows[0];
    if (!user) {
      throw new AppError(ErrorCode.NOT_FOUND, "User not found");
    }

    const existingRows = input.providerTransactionId
      ? await tx
          .select()
          .from(subscriptionPayments)
          .where(
            and(
              eq(subscriptionPayments.provider, input.provider),
              eq(subscriptionPayments.providerTransactionId, input.providerTransactionId),
            ),
          )
          .limit(1)
      : [];
    const existing = existingRows[0];

    if (existing?.status === "paid") {
      return { payment: existing, user };
    }

    const paidAt = new Date();
    const baseDate =
      user.subscriptionExpiresAt && user.subscriptionExpiresAt.getTime() > paidAt.getTime()
        ? user.subscriptionExpiresAt
        : paidAt;
    const activatedUntil = addPlanMonths(baseDate, plan.months);

    let payment: SubscriptionPaymentRow;
    if (existing) {
      const rows = await tx
        .update(subscriptionPayments)
        .set({
          planId: input.planId,
          amount: input.amount,
          status: "paid",
          providerPrepareId: input.providerPrepareId ?? existing.providerPrepareId,
          paymeState: input.paymeState ?? existing.paymeState,
          paymeCreateTime: input.paymeCreateTime ?? existing.paymeCreateTime,
          paymePerformTime: input.paymePerformTime ?? existing.paymePerformTime,
          activatedFrom: baseDate,
          activatedUntil,
          paidAt,
        })
        .where(eq(subscriptionPayments.id, existing.id))
        .returning();
      payment = rows[0] as SubscriptionPaymentRow;
    } else {
      const rows = await tx
        .insert(subscriptionPayments)
        .values({
          userId: user.id,
          provider: input.provider,
          planId: input.planId,
          amount: input.amount,
          status: "paid",
          providerTransactionId: input.providerTransactionId,
          providerPrepareId: input.providerPrepareId,
          paymeState: input.paymeState,
          paymeCreateTime: input.paymeCreateTime,
          paymePerformTime: input.paymePerformTime,
          activatedFrom: baseDate,
          activatedUntil,
          paidAt,
        })
        .returning();
      payment = rows[0] as SubscriptionPaymentRow;
    }

    await tx
      .update(users)
      .set({
        subscriptionPlan: input.planId,
        subscriptionExpiresAt: activatedUntil,
      })
      .where(eq(users.id, user.id));

    return { payment, user };
  });

  await invalidateStatusCache(result.user.telegramId);
  return result.payment;
}

export async function cancelPaymeTransaction(txId: string, reason: number): Promise<PaymeTransaction | null> {
  const tx = await findPaymeTransaction(txId);
  if (!tx) return null;

  if (tx.state === -1 || tx.state === -2) {
    return tx;
  }

  const cancelTime = Date.now();
  const nextState = tx.state === 2 ? -2 : -1;

  const result = await db.transaction(async (dbTx) => {
    const rows = await dbTx
      .update(subscriptionPayments)
      .set({
        status: "cancelled",
        paymeState: nextState,
        paymeCancelTime: cancelTime,
        paymeReason: reason,
        cancelledAt: new Date(cancelTime),
      })
      .where(eq(subscriptionPayments.id, tx.paymentId))
      .returning();

    if (tx.state === 2) {
      await dbTx
        .update(users)
        .set({
          subscriptionPlan: null,
          subscriptionExpiresAt: null,
        })
        .where(eq(users.id, tx.userId));

      const userRows = await dbTx.select().from(users).where(eq(users.id, tx.userId)).limit(1);
      const user = userRows[0];
      if (user) {
        await invalidateStatusCache(user.telegramId);
      }
    }

    return paymentRowToPaymeTransaction(rows[0]);
  });

  return result;
}

export async function getPaymeTransactionsForPeriod(from: number, to: number): Promise<PaymeTransaction[]> {
  const rows = await db
    .select()
    .from(subscriptionPayments)
    .where(
      and(
        eq(subscriptionPayments.provider, "payme"),
        gte(subscriptionPayments.paymeCreateTime, from),
        lte(subscriptionPayments.paymeCreateTime, to),
      ),
    )
    .orderBy(subscriptionPayments.paymeCreateTime);

  return rows
    .map((row) => paymentRowToPaymeTransaction(row))
    .filter((tx): tx is PaymeTransaction => !!tx);
}
