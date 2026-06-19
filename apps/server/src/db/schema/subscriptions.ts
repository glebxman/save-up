import { bigint, index, numeric, pgTable, smallint, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

import { users } from "./users.js";

export const subscriptionPayments = pgTable(
  "subscription_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 16 }).notNull(),
    planId: varchar("plan_id", { length: 24 }).notNull(),
    amount: numeric("amount", { precision: 15, scale: 2, mode: "number" }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    providerTransactionId: varchar("provider_transaction_id", { length: 128 }),
    providerPrepareId: varchar("provider_prepare_id", { length: 128 }),
    paymeState: smallint("payme_state"),
    paymeCreateTime: bigint("payme_create_time", { mode: "number" }),
    paymePerformTime: bigint("payme_perform_time", { mode: "number" }),
    paymeCancelTime: bigint("payme_cancel_time", { mode: "number" }),
    paymeReason: smallint("payme_reason"),
    activatedFrom: timestamp("activated_from", { withTimezone: true }),
    activatedUntil: timestamp("activated_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index("subscription_payments_user_id_idx").on(table.userId),
    providerIdx: index("subscription_payments_provider_idx").on(table.provider),
    statusIdx: index("subscription_payments_status_idx").on(table.status),
    providerTransactionIdx: uniqueIndex("subscription_payments_provider_tx_idx").on(
      table.provider,
      table.providerTransactionId,
    ),
    paymeCreateTimeIdx: index("subscription_payments_payme_create_time_idx").on(table.paymeCreateTime),
  }),
);

export type SubscriptionPaymentRow = typeof subscriptionPayments.$inferSelect;

