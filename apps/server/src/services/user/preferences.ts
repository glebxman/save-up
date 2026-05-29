import type { NotificationFrequency, Status } from "@finance-twa/shared-types";

import { eq } from "drizzle-orm";

import { db } from "../../config/database.js";
import { users, type UserRow } from "../../db/schema/index.js";
import { invalidateStatusCache } from "../cache.service.js";
import { buildStatus, ensureUser } from "./status.js";

export async function completeOnboarding(telegramId: number): Promise<{ ok: true }> {
  const user = await ensureUser(telegramId);

  if (!user.onboardingCompleted) {
    await db
      .update(users)
      .set({ onboardingCompleted: true })
      .where(eq(users.id, user.id));
    await invalidateStatusCache(telegramId);
  }

  return { ok: true };
}

export async function setUserLanguage(telegramId: number, language: string): Promise<{ ok: true }> {
  const user = await ensureUser(telegramId);

  await db
    .update(users)
    .set({ language })
    .where(eq(users.id, user.id));

  await invalidateStatusCache(telegramId);

  return { ok: true };
}

export async function setNotificationSettings(
  telegramId: number,
  enabled: boolean,
  frequency: NotificationFrequency,
  timezoneOffset: number,
): Promise<Status> {
  const user = await ensureUser(telegramId);

  const rows = await db
    .update(users)
    .set({
      notificationsConfigured: true,
      notificationsEnabled: enabled,
      notificationFrequency: frequency,
      notificationTimezoneOffset: Math.max(-720, Math.min(840, Math.trunc(timezoneOffset))),
      // Reset slot key so the next eligible slot triggers a reminder.
      lastReminderSlotKey: null,
    })
    .where(eq(users.id, user.id))
    .returning();

  await invalidateStatusCache(telegramId);
  return buildStatus(rows[0] as UserRow);
}
