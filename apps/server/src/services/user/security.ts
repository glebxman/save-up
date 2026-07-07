import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "../../config/database.js";
import { users } from "../../db/schema/index.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { invalidateStatusCache } from "../cache.service.js";
import { ensureUser } from "./status.js";

const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
const PIN_HASH_ITERATIONS = 210_000;

const pinAttempts = new Map<number, { count: number; lockedUntil: number }>();

function hashPinServer(pin: string, salt: string): string {
  return pbkdf2Sync(pin, salt, PIN_HASH_ITERATIONS, 32, "sha256").toString("hex");
}

function hashPinLegacy(pin: string, salt: string): string {
  return createHash("sha256").update(`${salt}|${pin}`).digest("hex");
}

function safeEqualHex(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  try {
    return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
  } catch {
    return false;
  }
}

function verifyPinHash(pin: string, salt: string, storedHash: string): { ok: boolean; needsUpgrade: boolean } {
  const nextHash = hashPinServer(pin, salt);
  if (safeEqualHex(nextHash, storedHash)) {
    return { ok: true, needsUpgrade: false };
  }

  const legacyHash = hashPinLegacy(pin, salt);
  if (safeEqualHex(legacyHash, storedHash)) {
    return { ok: true, needsUpgrade: true };
  }

  return { ok: false, needsUpgrade: false };
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
  const { ok, needsUpgrade } = verifyPinHash(pin, user.pinSalt, user.pinHash);
  recordPinAttempt(telegramId, ok);

  if (ok && needsUpgrade) {
    await db
      .update(users)
      .set({ pinHash: hash })
      .where(eq(users.id, user.id));
  }

  return { ok };
}

export async function removeUserPin(telegramId: number, pin: string): Promise<{ ok: true }> {
  checkPinLockout(telegramId);

  const user = await ensureUser(telegramId);

  if (!user.pinHash || !user.pinSalt) {
    throw new AppError(ErrorCode.NOT_FOUND, "No PIN configured");
  }

  const { ok } = verifyPinHash(pin, user.pinSalt, user.pinHash);
  recordPinAttempt(telegramId, ok);

  if (!ok) {
    throw new AppError(ErrorCode.UNAUTHORIZED, "Wrong PIN");
  }

  await db
    .update(users)
    .set({ pinHash: null, pinSalt: null })
    .where(eq(users.id, user.id));

  await invalidateStatusCache(telegramId);
  return { ok: true };
}
