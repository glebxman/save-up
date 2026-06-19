import type { CategoryCustomization, CryptoHolding, CustomCategory, ExpenseCategory, RecurringTransaction } from "@finance-twa/shared-types";

import { bigint, boolean, jsonb, numeric, pgTable, smallint, text, timestamp, uniqueIndex, uuid, varchar, index } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    telegramId: bigint("telegram_id", { mode: "number" }).notNull(),
    isAdmin: boolean("is_admin").notNull().default(false),
    firstName: varchar("first_name", { length: 128 }),
    lastName: varchar("last_name", { length: 128 }),
    username: varchar("username", { length: 64 }),
    photoUrl: text("photo_url"),
    balance: numeric("balance", { precision: 15, scale: 2, mode: "number" }).notNull().default(0),
    savings: numeric("savings", { precision: 15, scale: 2, mode: "number" }).notNull().default(0),
    savingsPct: smallint("savings_pct").notNull().default(20),
    savingsGoal: numeric("savings_goal", { precision: 15, scale: 2, mode: "number" }).notNull().default(0),
    recurringTemplates: jsonb("recurring_templates").$type<RecurringTransaction[]>().notNull().default([]),
    categoryLimits: jsonb("category_limits").notNull().default({}),
    monthlyExp: numeric("monthly_exp", { precision: 15, scale: 2, mode: "number" }).notNull().default(0),
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    language: varchar("language", { length: 5 }),
    voiceDailyUsed: smallint("voice_daily_used").notNull().default(0),
    voiceDailyDate: varchar("voice_daily_date", { length: 10 }),
    categoryCustomizations: jsonb("category_customizations").$type<Partial<Record<ExpenseCategory, CategoryCustomization>>>().notNull().default({}),
    customCategories: jsonb("custom_categories").$type<CustomCategory[]>().notNull().default([]),
    notificationsConfigured: boolean("notifications_configured").notNull().default(false),
    notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
    /**
     * Either { mode: "per_day", times: ["09:00", "18:00"] }
     * or     { mode: "every_n_days", days: 2, time: "09:00" }.
     * Default mirrors the legacy "once every 3 days at 9am" behaviour.
     */
    notificationFrequency: jsonb("notification_frequency")
      .$type<import("@finance-twa/shared-types").NotificationFrequency>()
      .notNull()
      .default({ mode: "every_n_days", days: 3, time: "09:00" }),
    /** Minutes east of UTC. Matches `-new Date().getTimezoneOffset()`. */
    notificationTimezoneOffset: smallint("notification_timezone_offset").notNull().default(0),
    subscriptionPlan: varchar("subscription_plan", { length: 24 }),
    subscriptionExpiresAt: timestamp("subscription_expires_at", { withTimezone: true }),
    trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    /**
     * Last fully-delivered slot, encoded as `YYYY-MM-DD#HH:MM`.
     * Used to deduplicate scheduled batches without sending the same slot twice.
     */
    lastReminderSlotKey: varchar("last_reminder_slot_key", { length: 32 }),
    lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
    lastCategoryAlerts: jsonb("last_category_alerts").$type<Record<string, number>>(),
    lastMilestoneSent: smallint("last_milestone_sent"),
    pinHash: varchar("pin_hash", { length: 64 }),
    pinSalt: varchar("pin_salt", { length: 32 }),
    currency: varchar("currency", { length: 10 }).notNull().default("UZS"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    telegramIdIdx: uniqueIndex("users_telegram_id_idx").on(table.telegramId),
  }),
);

export type UserRow = typeof users.$inferSelect;

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    type: varchar("type", { length: 30 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull(),
    balance: numeric("balance", { precision: 24, scale: 8, mode: "number" }).notNull().default(0),
    holdings: jsonb("holdings").$type<CryptoHolding[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index("accounts_user_id_idx").on(table.userId),
  }),
);

export type AccountRow = typeof accounts.$inferSelect;
