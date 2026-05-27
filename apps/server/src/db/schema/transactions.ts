import { index, numeric, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { users, accounts } from "./users.js";

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(),
    category: varchar("category", { length: 50 }),
    amount: numeric("amount", { precision: 24, scale: 8, mode: "number" }).notNull(),
    savingsAmt: numeric("savings_amt", { precision: 24, scale: 8, mode: "number" }),
    note: text("note"),
    monthKey: varchar("month_key", { length: 7 }).notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    accountId: uuid("account_id")
      .references(() => accounts.id, { onDelete: "cascade" }),
    toAccountId: uuid("to_account_id")
      .references(() => accounts.id, { onDelete: "cascade" }),
  },
  (table) => ({
    monthKeyIdx: index("transactions_month_key_idx").on(table.monthKey),
    userIdIdx: index("transactions_user_id_idx").on(table.userId),
    categoryIdx: index("transactions_category_idx").on(table.category),
    occurredAtIdx: index("transactions_occurred_at_idx").on(table.occurredAt),
    deletedAtIdx: index("transactions_deleted_at_idx").on(table.deletedAt),
    accountIdIdx: index("transactions_account_id_idx").on(table.accountId),
    toAccountIdIdx: index("transactions_to_account_id_idx").on(table.toAccountId),
  }),
);

export type TransactionRow = typeof transactions.$inferSelect;
