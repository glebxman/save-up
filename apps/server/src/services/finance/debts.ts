import { and, desc, eq, lte } from "drizzle-orm";
import type { Debt } from "@finance-twa/shared-types";

import { db } from "../../config/database.js";
import { debts, type DebtRow } from "../../db/schema/index.js";
import { requireSubscriptionAccess } from "../subscription/state.js";
import { ensureUser } from "../user/index.js";

export interface DebtInput {
  name: string;
  amount: number;
  direction: "owed_to_me" | "i_owe";
  note?: string;
  dueDate?: string;
}

export function mapDebtRow(row: DebtRow): Debt {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    amount: row.amount,
    note: row.note,
    direction: row.direction as Debt["direction"],
    dueDate: row.dueDate?.toISOString() ?? null,
    settled: row.settled,
    settledAt: row.settledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function addDebt(telegramId: number, input: DebtInput): Promise<DebtRow> {
  const user = await ensureUser(telegramId);
  requireSubscriptionAccess(user, telegramId);

  const [debt] = await db
    .insert(debts)
    .values({
      userId: user.id,
      name: input.name.trim().slice(0, 128),
      amount: input.amount,
      direction: input.direction,
      note: input.note?.trim()?.slice(0, 240) ?? null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    })
    .returning();

  return debt!;
}

export async function settleDebt(telegramId: number, debtId: string): Promise<void> {
  const user = await ensureUser(telegramId);
  requireSubscriptionAccess(user, telegramId);

  await db
    .update(debts)
    .set({ settled: true, settledAt: new Date() })
    .where(and(eq(debts.id, debtId), eq(debts.userId, user.id)));
}

export async function getActiveDebts(telegramId: number): Promise<DebtRow[]> {
  const user = await ensureUser(telegramId);
  requireSubscriptionAccess(user, telegramId);

  return db
    .select()
    .from(debts)
    .where(and(eq(debts.userId, user.id), eq(debts.settled, false)))
    .orderBy(desc(debts.createdAt));
}

export async function getDueDebts(telegramId: number): Promise<DebtRow[]> {
  const user = await ensureUser(telegramId);
  requireSubscriptionAccess(user, telegramId);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);

  return db
    .select()
    .from(debts)
    .where(
      and(
        eq(debts.userId, user.id),
        eq(debts.settled, false),
        lte(debts.dueDate, tomorrow),
      ),
    )
    .orderBy(desc(debts.createdAt));
}

export async function deleteDebt(telegramId: number, debtId: string): Promise<void> {
  const user = await ensureUser(telegramId);
  requireSubscriptionAccess(user, telegramId);

  await db
    .delete(debts)
    .where(and(eq(debts.id, debtId), eq(debts.userId, user.id)));
}
