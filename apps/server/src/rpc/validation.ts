import { z } from "zod";

export const initDataSchema = z.string();

export const userInitSchema = z.object({
  initData: initDataSchema,
});

export const userGetStatusSchema = z.object({
  initData: initDataSchema,
});

export const userCompleteOnboardingSchema = z.object({
  initData: initDataSchema,
});

export const userSetLanguageSchema = z.object({
  initData: initDataSchema,
  language: z.enum(["en", "ru", "uz", "kk", "zh", "ja", "ko", "tr", "es", "fr", "de"]),
});

export const financeAddIncomeSchema = z.object({
  initData: initDataSchema,
  amount: z.number().positive(),
  savingsAmt: z.number().min(0).nullable().optional(),
  note: z.string().max(240).nullable().optional(),
  occurredAt: z.string().datetime().optional(),
});

export const financeAddExpenseSchema = z.object({
  initData: initDataSchema,
  amount: z.number().positive(),
  category: z.string().min(1),
  note: z.string().max(240).nullable().optional(),
  occurredAt: z.string().datetime().optional(),
});

export const financeTransferSavingsSchema = z.object({
  initData: initDataSchema,
  amount: z.number().positive(),
  direction: z.enum(["to_savings", "from_savings"]),
  note: z.string().max(240).nullable().optional(),
  occurredAt: z.string().datetime().optional(),
});

export const financeGetRecentExpensesSchema = z.object({
  initData: initDataSchema,
  limit: z.number().int().min(1).max(10).optional(),
});

export const transactionFiltersSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  type: z.enum(["income", "expense", "all", "transfer_to_savings", "transfer_from_savings"]).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  includeDeleted: z.boolean().optional(),
});

export const financeGetTransactionsSchema = z.object({
  initData: initDataSchema,
  filters: transactionFiltersSchema.optional(),
});

export const transactionPayloadSchema = z.object({
  transactionId: z.string().min(1),
  type: z.enum(["income", "expense", "transfer_to_savings", "transfer_from_savings"]),
  amount: z.number().positive(),
  category: z.string().nullable().optional(),
  savingsAmt: z.number().min(0).nullable().optional(),
  note: z.string().max(240).nullable().optional(),
  occurredAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export const financeUpdateTransactionSchema = z.object({
  initData: initDataSchema,
  payload: transactionPayloadSchema,
});

export const financeArchiveTransactionSchema = z.object({
  initData: initDataSchema,
  transactionId: z.string().min(1),
});

export const financeRestoreTransactionSchema = z.object({
  initData: initDataSchema,
  transactionId: z.string().min(1),
});

export const financeUpdateSavingsGoalSchema = z.object({
  initData: initDataSchema,
  goal: z.number().min(0),
});

export const financeResetAccountDataSchema = z.object({
  initData: initDataSchema,
});

export const recurringPayloadSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(60),
  type: z.enum(["income", "expense", "transfer_to_savings", "transfer_from_savings"]),
  amount: z.number().positive(),
  category: z.string().nullable().optional(),
  savingsAmt: z.number().min(0).nullable().optional(),
  note: z.string().max(240).nullable().optional(),
});


export const financeUpdateBalanceSchema = z.object({
  initData: initDataSchema,
  balance: z.number(),
});

export const financeSaveRecurringTransactionSchema = z.object({
  initData: initDataSchema,
  template: recurringPayloadSchema,
});

export const financeDeleteRecurringTransactionSchema = z.object({
  initData: initDataSchema,
  templateId: z.string().min(1),
});

export const financeApplyRecurringTransactionSchema = z.object({
  initData: initDataSchema,
  templateId: z.string().min(1),
});

export const financeGetReportSchema = z.object({
  initData: initDataSchema,
  monthKey: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const financeGetCategoryBreakdownSchema = z.object({
  initData: initDataSchema,
  monthKey: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const financeNewMonthSchema = z.object({
  initData: initDataSchema,
});

export const financeConvertCurrencySchema = z.object({
  initData: initDataSchema,
  rate: z.number().positive(),
});

export const financeRefreshRatesSchema = z.object({
  initData: initDataSchema,
});

export const financeProcessVoiceSchema = z.object({
  initData: initDataSchema,
  base64Audio: z.string().min(1),
});

export const adminListUsersSchema = z.object({
  initData: initDataSchema,
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
  search: z.string().optional(),
});

export const adminSetAdminSchema = z.object({
  initData: initDataSchema,
  userId: z.string().min(1),
  isAdmin: z.boolean(),
});
