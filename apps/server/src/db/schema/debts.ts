import { boolean, index, numeric, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 128 }).notNull(),
    amount: numeric("amount", { precision: 15, scale: 2, mode: "number" }).notNull(),
    note: text("note"),
    direction: varchar("direction", { length: 20 }).notNull(), // "owed_to_me" | "i_owe"
    dueDate: timestamp("due_date", { withTimezone: true }),
    settled: boolean("settled").notNull().default(false),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("debts_user_id_idx").on(table.userId),
    settledIdx: index("debts_settled_idx").on(table.settled),
  }),
);

export type DebtRow = typeof debts.$inferSelect;
