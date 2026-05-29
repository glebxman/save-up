import type {
  RecurringTransaction,
  RecurringTransactionPayload,
  Status,
} from "@finance-twa/shared-types";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../config/database.js";
import { users, type UserRow } from "../../db/schema/index.js";
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
  const nextTemplate: RecurringTransaction = {
    id: payload.id ?? randomUUID(),
    ...parsed,
    dayOfMonth:
      typeof payload.dayOfMonth === "number" && payload.dayOfMonth >= 1 && payload.dayOfMonth <= 28
        ? payload.dayOfMonth
        : null,
    autoApply: payload.autoApply === true,
    accountId: typeof payload.accountId === "string" ? payload.accountId : null,
  };
  const index = templates.findIndex((item) => item.id === nextTemplate.id);

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
  const template = mapRecurringTemplates(user).find((item) => item.id === templateId);

  if (!template) {
    throw new AppError(ErrorCode.NOT_FOUND, "Recurring transaction not found");
  }

  const updatedUser = await db.transaction(async (tx) => {
    if (template.type === "income") {
      return createTransaction(tx, user, {
        type: "income",
        amount: template.amount,
        savingsAmt: template.savingsAmt,
        note: template.note ?? template.title,
        accountId: template.accountId,
      });
    }

    if (template.type === "expense") {
      return createTransaction(tx, user, {
        type: "expense",
        amount: template.amount,
        category: template.category,
        note: template.note ?? template.title,
        accountId: template.accountId,
      });
    }

    return createTransaction(tx, user, {
      type: template.type,
      amount: template.amount,
      note: template.note ?? template.title,
      accountId: template.accountId,
    });
  });

  await invalidateStatusCache(telegramId);

  return persistStatus(updatedUser);
}
