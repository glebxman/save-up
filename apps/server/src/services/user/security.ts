import { createHash, randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "../../config/database.js";
import { users } from "../../db/schema/index.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { invalidateStatusCache } from "../cache.service.js";
import { ensureUser } from "./status.js";

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const pinAttempts = new Map<number, { count: number; lockedUntil: number }>();

function hashPinServer(pin: string, salt: string): string {
  return createHash("sha256").update(`${salt}|${pin}`).digest("hex");
}

function checkPinLockout(telegramId: number): void {
  const entry = pinAttempts.get(telegramId);
  if (!entry) return;

  if (entry.lockedUntil > Date.now()) {
    const remaining = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    throw new AppError(ErrorCode.TOO_MANY_REQUESTS, `Too many attempts. Try again in ${remaining}s`);
  }

  if (entry.lockedUntil > 0 && entry.lockedUntil <= Date.now()) {
    pinAttempts.delete(telegramId);
  }
}

function recordPinAttempt(telegramId: number, success: boolean): void {
  if (success) {
    pinAttempts.delete(telegramId);
    return;
  }

  const entry = pinAttempts.get(telegramId) ?? { count: 0, lockedUntil: 0 };
  entry.count += 1;

  if (entry.count >= PIN_MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + PIN_LOCKOUT_MS;
    entry.count = 0;
  }

  pinAttempts.set(telegramId, entry);
}

export async function setUserPin(telegramId: number, pin: string): Promise<{ ok: true }> {
  if (!/^\d{4,6}$/.test(pin)) {
    throw new AppError(ErrorCode.VALIDATION, "PIN must be 4-6 digits");
  }

  const user = await ensureUser(telegramId);
  const salt = randomBytes(16).toString("hex");
  const hash = hashPinServer(pin, salt);

  await db
    .update(users)
    .set({ pinHash: hash, pinSalt: salt })
    .where(eq(users.id, user.id));

  await invalidateStatusCache(telegramId);
  return { ok: true };
}

export async function verifyUserPin(telegramId: number, pin: string): Promise<{ ok: boolean }> {
  checkPinLockout(telegramId);

  const user = await ensureUser(telegramId);

  if (!user.pinHash || !user.pinSalt) {
    return { ok: false };
  }

  const hash = hashPinServer(pin, user.pinSalt);
  const ok = hash === user.pinHash;
  recordPinAttempt(telegramId, ok);
  return { ok };
}

export async function removeUserPin(telegramId: number, pin: string): Promise<{ ok: true }> {
  const user = await ensureUser(telegramId);

  if (!user.pinHash || !user.pinSalt) {
    throw new AppError(ErrorCode.NOT_FOUND, "No PIN configured");
  }

  const hash = hashPinServer(pin, user.pinSalt);
  if (hash !== user.pinHash) {
    throw new AppError(ErrorCode.UNAUTHORIZED, "Wrong PIN");
  }

  await db
    .update(users)
    .set({ pinHash: null, pinSalt: null })
    .where(eq(users.id, user.id));

  await invalidateStatusCache(telegramId);
  return { ok: true };
}
