import type {
  RecurringTransaction,
  RecurringTransactionPayload,
  Status,
} from "@finance-twa/shared-types";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { getMonthKey } from "@finance-twa/shared-utils";

import { db } from "../../config/database.js";
import { accounts, users, type UserRow } from "../../db/schema/index.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { invalidateStatusCache } from "../cache.service.js";
import { ensureUser } from "../user/index.js";
import {
  createTransaction,
  mapRecurringTemplates,
  parseRecurringPayload,
  persistStatus,
} from "./_shared.js";

export async function saveRecurringTransaction(
  telegramId: number,
  payload: RecurringTransactionPayload,
): Promise<Status> {
  const user = await ensureUser(telegramId);
  const parsed = parseRecurringPayload(payload);
  const templates = mapRecurringTemplates(user);
  const accountId = typeof payload.accountId === "string" ? payload.accountId : null;

  if (accountId) {
    const [account] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, user.id), isNull(accounts.deletedAt)))
      .limit(1);

    if (!account) {
      throw new AppError(ErrorCode.NOT_FOUND, "Account not found");
    }
  }

  const index = templates.findIndex((item) => item.id === payload.id);
  const existing = index >= 0 ? templates[index] : undefined;

  const nextTemplate: RecurringTransaction = {
    id: payload.id ?? randomUUID(),
    ...parsed,
    dayOfMonth:
      typeof payload.dayOfMonth === "number" && payload.dayOfMonth >= 1 && payload.dayOfMonth <= 28
        ? payload.dayOfMonth
        : null,
    autoApply: payload.autoApply === true,
    accountId,
    // Preserve "already applied this month" tracking across edits so changing
    // an unrelated field (note, amount, etc.) can't re-open the door to a duplicate apply.
    lastAppliedMonthKey: existing?.lastAppliedMonthKey ?? null,
  };

  if (index >= 0) {
    templates[index] = nextTemplate;
  } else {
    templates.unshift(nextTemplate);
  }

  const updated = await db
    .update(users)
    .set({ recurringTemplates: templates })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);

  return persistStatus(updated[0] as UserRow);
}

export async function deleteRecurringTransaction(
  telegramId: number,
  templateId: string,
): Promise<Status> {
  const user = await ensureUser(telegramId);
  const templates = mapRecurringTemplates(user).filter((item) => item.id !== templateId);
  const updated = await db
    .update(users)
    .set({ recurringTemplates: templates })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);

  return persistStatus(updated[0] as UserRow);
}

export async function applyRecurringTransaction(
  telegramId: number,
  templateId: string,
): Promise<Status> {
  const user = await ensureUser(telegramId);
  const templates = mapRecurringTemplates(user);
  const templateIndex = templates.findIndex((item) => item.id === templateId);
  const template = templateIndex >= 0 ? templates[templateIndex] : undefined;

  if (!template) {
    throw new AppError(ErrorCode.NOT_FOUND, "Recurring transaction not found");
  }

  // Record that this template has now been applied this month. The hourly auto-apply
  // scheduler (see recurring.ts) checks this before re-selecting a template, so this is
  // what stops the same due-today template from being inserted again on every later tick.
  const nextTemplates = [...templates];
  nextTemplates[templateIndex] = { ...template, lastAppliedMonthKey: getMonthKey() };

  const updatedUser = await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ recurringTemplates: nextTemplates })
      .where(eq(users.id, user.id));

    return createTransaction(tx, user, {
      type: template.type,
      amount: template.amount,
      category: template.category,
      savingsAmt: template.type === "income" ? template.savingsAmt : undefined,
      note: template.note ?? template.title,
      accountId: template.accountId,
    });
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}
