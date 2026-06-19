import { FREE_TRIAL_DAYS, SUBSCRIPTION_PLANS } from "@finance-twa/shared-types";

import { ensureUser, saveUser } from "./_db";
import { parseTelegramIdFromInitData } from "./_helpers";
import { buildStatus } from "./_status";
import type { MockHandler } from "./_types";

export const subscriptionStartTrial: MockHandler<"subscription.startTrial"> = async (params) => {
  const telegramId = parseTelegramIdFromInitData(params.initData);
  const user = ensureUser(telegramId);

  if (!user.subscription.trialAvailable) {
    throw new Error("Free trial already used");
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  user.subscription = {
    active: true,
    source: "trial",
    planId: null,
    expiresAt: endsAt,
    trialAvailable: false,
    trialEndsAt: endsAt,
  };
  saveUser(user);
  return buildStatus(user);
};

export const subscriptionCreatePayment: MockHandler<"subscription.createPayment"> = (params) => {
  const plan = SUBSCRIPTION_PLANS.find((item) => item.id === params.planId);
  if (!plan) throw new Error("Unknown subscription plan");

  return {
    provider: params.provider,
    planId: params.planId,
    amountUzs: plan.priceUzs,
    url: `https://example.com/mock-payment/${params.provider}/${params.planId}`,
  };
};

