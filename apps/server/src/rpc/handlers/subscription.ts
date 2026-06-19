import {
  createSubscriptionPaymentLink,
  startFreeTrial,
} from "../../services/subscription/index.js";
import {
  subscriptionCreatePaymentSchema,
  subscriptionStartTrialSchema,
} from "../validation.js";
import { defineAuthenticatedRpc } from "./shared.js";

export const startTrialHandler = defineAuthenticatedRpc(
  "subscription.startTrial",
  subscriptionStartTrialSchema,
  ({ telegramId }) => startFreeTrial(telegramId),
);

export const createPaymentHandler = defineAuthenticatedRpc(
  "subscription.createPayment",
  subscriptionCreatePaymentSchema,
  ({ telegramId, provider, planId }) => createSubscriptionPaymentLink(telegramId, planId, provider),
);

