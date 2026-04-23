import { index, numeric, pgEnum, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer_to_savings",
  "transfer_from_savings",
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "food",
  "taxi",
  "entertainment",
  "shopping",
  "utilities",
  "health",
  "education",
  "other",
]);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    category: expenseCategoryEnum("category"),
    amount: numeric("amount", { precision: 15, scale: 2, mode: "number" }).notNull(),
    savingsAmt: numeric("savings_amt", { precision: 15, scale: 2, mode: "number" }),
    note: text("note"),
    monthKey: varchar("month_key", { length: 7 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    monthKeyIdx: index("transactions_month_key_idx").on(table.monthKey),
    userIdIdx: index("transactions_user_id_idx").on(table.userId),
    categoryIdx: index("transactions_category_idx").on(table.category),
    occurredAtIdx: index("transactions_occurred_at_idx").on(table.occurredAt),
    deletedAtIdx: index("transactions_deleted_at_idx").on(table.deletedAt),
  }),
);

export type TransactionRow = typeof transactions.$inferSelect;
export type InsertTransactionRow = typeof transactions.$inferInsert;
