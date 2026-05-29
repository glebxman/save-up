import { createHash, randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { db } from "../../config/database.js";
import { users } from "../../db/schema/index.js";
import { AppError, ErrorCode } from "../../utils/errors.js";
import { invalidateStatusCache } from "../cache.service.js";
import { ensureUser } from "./status.js";

function hashPinServer(pin: string, salt: string): string {
  return createHash("sha256").update(`${salt}|${pin}`).digest("hex");
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
  const user = await ensureUser(telegramId);

  if (!user.pinHash || !user.pinSalt) {
    return { ok: false };
  }

  const hash = hashPinServer(pin, user.pinSalt);
  return { ok: hash === user.pinHash };
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
