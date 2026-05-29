/**
 * Low-level helpers shared across the user service modules.
 *
 * Keep this module dependency-light (env + schema types only) so the focused
 * domain modules (status, admin, accounts, …) can import it without creating
 * cycles.
 */
import type { UserRow } from "../../db/schema/index.js";
import type { TelegramUser } from "../../utils/telegram.js";
import { env } from "../../config/env.js";

const SUPER_ADMIN_IDS = new Set<number>(env.SUPER_ADMIN_TELEGRAM_IDS);

/** Telegram IDs that always receive admin access, sourced from env. */
export const SUPER_ADMIN_TELEGRAM_IDS: readonly number[] = env.SUPER_ADMIN_TELEGRAM_IDS;

export function isSuperAdmin(telegramId: number): boolean {
  return SUPER_ADMIN_IDS.has(telegramId);
}

export function maskTelegramId(telegramId: number): string {
  const value = String(telegramId);
  return `${"*".repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

function normalizeProfileValue(value: string | undefined, maxLength: number): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function mapTelegramProfile(profile?: TelegramUser) {
  return {
    firstName: normalizeProfileValue(profile?.first_name, 128),
    lastName: normalizeProfileValue(profile?.last_name, 128),
    username: normalizeProfileValue(profile?.username, 64),
    photoUrl: profile?.photo_url?.trim() ? profile.photo_url.trim() : null,
  };
}

export function hasProfileChanges(row: UserRow, profile: ReturnType<typeof mapTelegramProfile>): boolean {
  return row.firstName !== profile.firstName
    || row.lastName !== profile.lastName
    || row.username !== profile.username
    || row.photoUrl !== profile.photoUrl;
}

export function buildAdminLabel(row: UserRow): string {
  if (row.username) {
    return `@${row.username}`;
  }

  const fullName = [row.firstName, row.lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  return `User ${row.id.slice(0, 8)}`;
}
