import type { CategoryCustomization, CustomCategory, ExpenseCategory, RecurringTransaction } from "@finance-twa/shared-types";

import { bigint, boolean, jsonb, numeric, pgTable, smallint, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

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
    lastReminderSentAt: timestamp("last_reminder_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    telegramIdIdx: uniqueIndex("users_telegram_id_idx").on(table.telegramId),
  }),
);

export type UserRow = typeof users.$inferSelect;
