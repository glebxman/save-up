import {
  SUBSCRIPTION_PLANS,
  type PaymentProvider,
  type SubscriptionPlanId,
} from "@finance-twa/shared-types";

const PLAN_IDS = new Set<SubscriptionPlanId>(SUBSCRIPTION_PLANS.map((plan) => plan.id));

export function isSubscriptionPlanId(value: string | null | undefined): value is SubscriptionPlanId {
  return !!value && PLAN_IDS.has(value as SubscriptionPlanId);
}

export function getSubscriptionPlan(planId: SubscriptionPlanId) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === planId) ?? null;
}

export function getSubscriptionPlanByAmount(amountUzs: number) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.priceUzs === amountUzs) ?? null;
}

export function addPlanMonths(baseDate: Date, months: number): Date {
  const next = new Date(baseDate);
  const day = next.getDate();

  next.setMonth(next.getMonth() + months);

  if (next.getDate() !== day) {
    next.setDate(0);
  }

  return next;
}

export function assertPaymentProvider(value: PaymentProvider): PaymentProvider {
  if (value === "click" || value === "payme") return value;
  throw new Error(`Unsupported payment provider: ${value}`);
}

