import { z } from "zod";
import { EXPENSE_CATEGORIES, MAX_FINANCE_AMOUNT, SUPPORTED_LANGUAGES, CRYPTO_CODES, SUBSCRIPTION_PLANS, type SupportedLanguage, type ExpenseCategory, type CryptoCode, type SubscriptionPlanId } from "@finance-twa/shared-types";

export const initDataSchema = z.string();

const dateLikeSchema = z.string().refine(
  (value) => Number.isFinite(new Date(value).getTime()),
  "Date is invalid",
);

const fiatCurrencySchema = z.enum(["UZS", "RUB", "USD", "EUR", "KZT", "TRY", "GBP", "CNY"]);
const amountSchema = z.number().positive().max(MAX_FINANCE_AMOUNT);
const nonNegativeAmountSchema = z.number().min(0).max(MAX_FINANCE_AMOUNT);

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
  language: z.enum(SUPPORTED_LANGUAGES as [SupportedLanguage, ...SupportedLanguage[]]),
});

export const userSendExportToTelegramSchema = z.object({
  initData: initDataSchema,
  base64Data: z.string().min(1).max(12_000_000),
  filename: z.string().min(1).max(128),
});

export const financeAddIncomeSchema = z.object({
  initData: initDataSchema,
  amount: amountSchema,
  savingsAmt: nonNegativeAmountSchema.nullable().optional(),
  note: z.string().max(240).nullable().optional(),
  occurredAt: dateLikeSchema.optional(),
  accountId: z.string().uuid().optional(),
});

export const financeAddExpenseSchema = z.object({
  initData: initDataSchema,
  amount: amountSchema,
  category: z.string().min(1),
  note: z.string().max(240).nullable().optional(),
  occurredAt: dateLikeSchema.optional(),
  accountId: z.string().uuid().optional(),
});

export const financeTransferSavingsSchema = z.object({
  initData: initDataSchema,
  amount: amountSchema,
  direction: z.enum(["to_savings", "from_savings"]),
  note: z.string().max(240).nullable().optional(),
  occurredAt: dateLikeSchema.optional(),
  accountId: z.string().uuid().optional(),
});

export const transactionFiltersSchema = z.object({
  monthKey: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  type: z.enum(["income", "expense", "all", "transfer_to_savings", "transfer_from_savings", "transfer_between_accounts"]).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
  includeDeleted: z.boolean().optional(),
});

export const financeGetTransactionsSchema = z.object({
  initData: initDataSchema,
  filters: transactionFiltersSchema.optional(),
});

export const transactionPayloadSchema = z.object({
  transactionId: z.string().min(1),
  amount: amountSchema,
  category: z.string().nullable().optional(),
  savingsAmt: nonNegativeAmountSchema.nullable().optional(),
  note: z.string().max(240).nullable().optional(),
  occurredAt: dateLikeSchema.optional(),
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
  goal: nonNegativeAmountSchema,
});

export const financeResetAccountDataSchema = z.object({
  initData: initDataSchema,
});

export const recurringPayloadSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(60),
  type: z.enum(["income", "expense", "transfer_to_savings", "transfer_from_savings"]),
  amount: amountSchema,
  category: z.string().nullable().optional(),
  savingsAmt: nonNegativeAmountSchema.nullable().optional(),
  note: z.string().max(240).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(28).nullable().optional(),
  autoApply: z.boolean().optional(),
  accountId: z.string().uuid().optional(),
});

export const financeUpdateBalanceSchema = z.object({
  initData: initDataSchema,
  balance: nonNegativeAmountSchema,
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

export const financeGetDailyTrendSchema = z.object({
  initData: initDataSchema,
  monthKey: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const financeNewMonthSchema = z.object({
  initData: initDataSchema,
});

export const financeConvertCurrencySchema = z.object({
  initData: initDataSchema,
  rate: z.number().positive(),
  currency: fiatCurrencySchema.optional(),
});

export const financeRefreshRatesSchema = z.object({
  initData: initDataSchema,
});

export const financeProcessVoiceSchema = z.object({
  initData: initDataSchema,
  base64Audio: z.string().min(1).max(5_242_880),
});

export const userSetCategoryCustomizationSchema = z.object({
  initData: initDataSchema,
  category: z.enum(EXPENSE_CATEGORIES as [ExpenseCategory, ...ExpenseCategory[]]),
  name: z.string().max(30),
  emoji: z.string().max(8),
});

export const userAddCustomCategorySchema = z.object({
  initData: initDataSchema,
  name: z.string().min(1).max(30),
  emoji: z.string().min(1).max(8),
});

export const userDeleteCustomCategorySchema = z.object({
  initData: initDataSchema,
  id: z.string().min(1).max(20),
});

export const userSetCategoryLimitsSchema = z.object({
  initData: initDataSchema,
  limits: z.record(z.string().min(1).max(64), nonNegativeAmountSchema),
});

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM");

const notificationFrequencySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("per_day"),
    times: z.array(timeOfDaySchema).min(1).max(9),
  }),
  z.object({
    mode: z.literal("every_n_days"),
    days: z.number().int().min(1).max(30),
    time: timeOfDaySchema,
  }),
]);

export const userSetNotificationSettingsSchema = z.object({
  initData: initDataSchema,
  enabled: z.boolean(),
  frequency: notificationFrequencySchema,
  timezoneOffset: z.number().int().min(-720).max(840),
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

export const adminResetPinSchema = z.object({
  initData: initDataSchema,
  userId: z.string().min(1),
});

const subscriptionPlanIds = SUBSCRIPTION_PLANS.map((plan) => plan.id) as [SubscriptionPlanId, ...SubscriptionPlanId[]];

export const adminSetSubscriptionSchema = z.object({
  initData: initDataSchema,
  userId: z.string().min(1),
  planId: z.enum(subscriptionPlanIds),
  durationMonths: z.number().int().min(1).max(36),
});

export const subscriptionStartTrialSchema = z.object({
  initData: initDataSchema,
});

export const subscriptionCreatePaymentSchema = z.object({
  initData: initDataSchema,
  provider: z.enum(["click", "payme"]),
  planId: z.enum(subscriptionPlanIds),
});

export const userCreateAccountSchema = z.object({
  initData: initDataSchema,
  name: z.string().min(1).max(64),
  type: z.enum(["cash", "card", "crypto"]),
  currency: fiatCurrencySchema,
  initialBalance: nonNegativeAmountSchema,
  holdings: z
    .array(
      z.object({
        symbol: z.enum(CRYPTO_CODES as [CryptoCode, ...CryptoCode[]]),
        amount: amountSchema,
      }),
    )
    .optional(),
});

export const userSetCryptoHoldingSchema = z.object({
  initData: initDataSchema,
  accountId: z.string().uuid(),
  symbol: z.enum(CRYPTO_CODES as [CryptoCode, ...CryptoCode[]]),
  amount: nonNegativeAmountSchema,
});

export const userUpdateAccountSchema = z.object({
  initData: initDataSchema,
  accountId: z.string().uuid(),
  name: z.string().min(1).max(64),
});

export const userDeleteAccountSchema = z.object({
  initData: initDataSchema,
  accountId: z.string().uuid(),
});

export const financeTransferBetweenAccountsSchema = z.object({
  initData: initDataSchema,
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  amount: amountSchema,
  toAmount: amountSchema.optional(),
});

export const userSetPinSchema = z.object({
  initData: initDataSchema,
  pin: z.string().regex(/^\d{4,6}$/),
});

export const userVerifyPinSchema = z.object({
  initData: initDataSchema,
  pin: z.string().min(4).max(6),
});

export const userRemovePinSchema = z.object({
  initData: initDataSchema,
  pin: z.string().min(4).max(6),
});

export const financeAddDebtSchema = z.object({
  initData: initDataSchema,
  name: z.string().min(1).max(128),
  amount: amountSchema,
  direction: z.enum(["owed_to_me", "i_owe"]),
  note: z.string().max(240).optional(),
  dueDate: dateLikeSchema.optional(),
});

export const financeGetDebtsSchema = z.object({
  initData: initDataSchema,
});

export const financeSettleDebtSchema = z.object({
  initData: initDataSchema,
  debtId: z.string().min(1),
});

export const financeDeleteDebtSchema = z.object({
  initData: initDataSchema,
  debtId: z.string().min(1),
});
