import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { CheckIcon, ChevronRightIcon } from "@/components/layout/icons";
import { Button, Card, CardContent, Select, Spinner } from "@/components/ui";
import { useStatus, useSubscription } from "@/hooks/useFinance";
import {
  AI_FREE_DAILY_LIMIT,
  FREE_TRIAL_DAYS,
  SUBSCRIPTION_PLANS,
  type PaymentProvider,
  type SubscriptionPlanId,
} from "@/types/finance";
import { formatDate, formatMoney } from "@/utils/format";

const benefitKeys = ["debts", "categories", "ai"] as const;

export function Subscription() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState<SubscriptionPlanId>("monthly");
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("click");
  const { status, statusQuery } = useStatus();
  const { startTrialMutation, createPaymentMutation } = useSubscription();
  const subscription = status?.user.subscription;
  const hasAccess = !!status?.user.isAdmin || !!subscription?.active;
  const selectedPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedPlanId) ?? SUBSCRIPTION_PLANS[0];
  const monthlyPrice = Math.round(selectedPlan.priceUzs / selectedPlan.months);

  const pay = (provider: PaymentProvider, planId: SubscriptionPlanId) => {
    createPaymentMutation.mutate({ provider, planId });
  };

  if (statusQuery.isLoading && !status) {
    return (
      <Card>
        <CardContent className="flex min-h-40 items-center justify-center">
          <Spinner size="md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5 pb-4">
      <header className="flex items-center gap-3">
        <button
          aria-label={t("common.back")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--foreground)] transition active:scale-95"
          onClick={() => navigate("/settings")}
          type="button"
        >
          <ChevronRightIcon className="h-4 w-4 rotate-180" />
        </button>
        <div className="min-w-0">
          <h1 className="m-0 text-[1.5rem] font-semibold tracking-[-0.03em]">
            {t("subscription.title")}
          </h1>
          <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
            {t("subscription.description")}
          </p>
        </div>
      </header>

      <Card variant="secondary">
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 text-sm font-semibold">
                {hasAccess ? t("subscription.statusActive") : t("subscription.statusInactive")}
              </p>
              <p className="m-0 mt-1 text-xs text-[var(--muted)]">
                {subscription?.expiresAt
                  ? t("subscription.statusUntil", { date: formatDate(subscription.expiresAt) })
                  : t("subscription.lockedNotice")}
              </p>
            </div>
            <span className="rounded-full bg-[var(--surface-tertiary)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
              {hasAccess ? t("subscription.unlocked") : t("subscription.locked")}
            </span>
          </div>
        </CardContent>
      </Card>

      {subscription?.trialAvailable ? (
        <Card>
          <CardContent className="space-y-3">
            <div>
              <h2 className="m-0 text-base font-semibold">{t("subscription.trialTitle")}</h2>
              <p className="m-0 mt-1 text-sm text-[var(--muted)]">
                {t("subscription.trialDescription", { days: FREE_TRIAL_DAYS })}
              </p>
            </div>
            <Button
              fullWidth
              isDisabled={startTrialMutation.isPending}
              onPress={() => startTrialMutation.mutate()}
              variant="primary"
            >
              {startTrialMutation.isPending ? "..." : t("subscription.startTrial")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          {t("subscription.plansTitle")}
        </h2>

        <Card>
          <CardContent className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {t("subscription.choosePlan")}
              </span>
              <span className="relative block">
                <Select
                  fullWidth
                  onChange={(event) => setSelectedPlanId(event.target.value as SubscriptionPlanId)}
                  value={selectedPlanId}
                  variant="secondary"
                >
                  {SUBSCRIPTION_PLANS.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {t(`subscription.plans.${plan.id}`)} - {formatMoney(plan.priceUzs, "UZS")}
                      {plan.savingsPct > 0 ? `, ${t("subscription.savings", { pct: plan.savingsPct })}` : ""}
                    </option>
                  ))}
                </Select>
                <ChevronRightIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-[var(--muted)]" />
              </span>
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-[var(--foreground)]">
                {t("subscription.paymentProvider", { defaultValue: "Payment provider" })}
              </span>
              <span className="relative block">
                <Select
                  fullWidth
                  onChange={(event) => setPaymentProvider(event.target.value as PaymentProvider)}
                  value={paymentProvider}
                  variant="secondary"
                >
                  {(["click", "payme"] as const).map((provider) => (
                    <option key={provider} value={provider}>
                      {t(`subscription.pay.${provider}`)}
                    </option>
                  ))}
                </Select>
                <ChevronRightIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-[var(--muted)]" />
              </span>
            </label>

            <div className="rounded-[20px] bg-[var(--surface-secondary)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {t("subscription.selectedPlan")}
                  </p>
                  <h3 className="m-0 mt-1 text-lg font-semibold">
                    {t(`subscription.plans.${selectedPlan.id}`)}
                  </h3>
                  <p className="m-0 mt-1 text-xs text-[var(--muted)]">
                    {t("subscription.planDuration", { count: selectedPlan.months })} |{" "}
                    {t("subscription.perMonth", { amount: formatMoney(monthlyPrice, "UZS") })}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="m-0 text-lg font-semibold">{formatMoney(selectedPlan.priceUzs, "UZS")}</p>
                  <p className="m-0 mt-1 text-xs text-[var(--muted)]">
                    {selectedPlan.savingsPct > 0
                      ? t("subscription.savings", { pct: selectedPlan.savingsPct })
                      : t("subscription.basePlan")}
                  </p>
                </div>
              </div>
            </div>

            <button
              className="click_logo w-full active:opacity-90 disabled:opacity-50"
              disabled={createPaymentMutation.isPending}
              onClick={() => pay(paymentProvider, selectedPlan.id)}
              type="button"
            >
              <i />
              {createPaymentMutation.isPending
                ? "..."
                : t("subscription.payButton", { provider: t(`subscription.pay.${paymentProvider}`) })}
            </button>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardContent className="space-y-3">
          <div>
            <h2 className="m-0 text-base font-semibold">{t("subscription.benefitsTitle")}</h2>
            <p className="m-0 mt-1 text-sm text-[var(--muted)]">
              {t("subscription.benefitsDescription")}
            </p>
          </div>

          <div className="grid gap-2">
            {benefitKeys.map((key) => (
              <div key={key} className="flex items-start gap-3 rounded-[18px] bg-[var(--surface-secondary)] p-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <p className="m-0 text-sm leading-5 text-[var(--foreground)]">
                  {t(`subscription.benefits.${key}`, {
                    dailyLimit: AI_FREE_DAILY_LIMIT,
                    days: FREE_TRIAL_DAYS,
                  })}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
