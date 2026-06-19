import type { SubscriptionPlanId, SubscriptionState } from "@finance-twa/shared-types";

import type { UserRow } from "../../db/schema/index.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { isSuperAdmin } from "../user/_internal.js";
import { isSubscriptionPlanId } from "./plans.js";

type SubscriptionFields = Pick<
  UserRow,
  | "isAdmin"
  | "telegramId"
  | "subscriptionPlan"
  | "subscriptionExpiresAt"
  | "trialStartedAt"
  | "trialEndsAt"
>;

function isFuture(date: Date | null | undefined, now = new Date()): date is Date {
  return !!date && date.getTime() > now.getTime();
}

function formatDate(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}

export function mapSubscriptionState(row: SubscriptionFields): SubscriptionState {
  const now = new Date();
  const subscriptionExpiresAt = row.subscriptionExpiresAt;
  const trialEndsAt = row.trialEndsAt;
  const paidActive = isFuture(subscriptionExpiresAt, now);
  const trialActive = isFuture(trialEndsAt, now);
  const planId: SubscriptionPlanId | null = isSubscriptionPlanId(row.subscriptionPlan)
    ? row.subscriptionPlan
    : null;

  if (paidActive) {
    return {
      active: true,
      source: "paid",
      planId,
      expiresAt: subscriptionExpiresAt.toISOString(),
      trialAvailable: !row.trialStartedAt,
      trialEndsAt: formatDate(trialEndsAt),
    };
  }

  if (trialActive) {
    return {
      active: true,
      source: "trial",
      planId: null,
      expiresAt: trialEndsAt.toISOString(),
      trialAvailable: false,
      trialEndsAt: trialEndsAt.toISOString(),
    };
  }

  return {
    active: false,
    source: null,
    planId,
    expiresAt: null,
    trialAvailable: !row.trialStartedAt,
    trialEndsAt: formatDate(trialEndsAt),
  };
}

export function hasSubscriptionAccess(row: SubscriptionFields, telegramId = row.telegramId): boolean {
  return row.isAdmin || isSuperAdmin(telegramId) || mapSubscriptionState(row).active;
}

export function requireSubscriptionAccess(row: SubscriptionFields, telegramId = row.telegramId): void {
  if (!hasSubscriptionAccess(row, telegramId)) {
    throw new AppError(ErrorCode.FORBIDDEN, "Subscription required");
  }
}
