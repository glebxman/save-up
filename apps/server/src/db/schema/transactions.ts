import { index, numeric, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense"]);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2, mode: "number" }).notNull(),
    savingsAmt: numeric("savings_amt", { precision: 15, scale: 2, mode: "number" }),
    monthKey: varchar("month_key", { length: 7 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    monthKeyIdx: index("transactions_month_key_idx").on(table.monthKey),
    userIdIdx: index("transactions_user_id_idx").on(table.userId),
  }),
);

export type TransactionRow = typeof transactions.$inferSelect;
export type InsertTransactionRow = typeof transactions.$inferInsert;
