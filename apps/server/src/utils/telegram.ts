import { createHmac, timingSafeEqual } from "node:crypto";
import type { TelegramUser } from "@finance-twa/shared-types";

export type { TelegramUser } from "@finance-twa/shared-types";

export interface TelegramInitData {
  authDate: number;
  hash: string;
  queryId?: string;
  user?: TelegramUser;
  raw: string;
}

function parseUser(value: string | null): TelegramUser | undefined {
  if (!value) {
    return undefined;
  }

  return JSON.parse(value) as TelegramUser;
}

export function verifyTelegramInitData(
  initDataRaw: string,
  botToken: string,
  maxAgeSeconds = 86_400,
): TelegramInitData {
  if (!initDataRaw) {
    throw new Error("Telegram initData is required");
  }

  const params = new URLSearchParams(initDataRaw);
  const hash = params.get("hash");

  if (!hash) {
    throw new Error("Telegram initData hash is missing");
  }

  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (hash.length !== calculatedHash.length) {
    throw new Error("Telegram initData hash length mismatch");
  }

  const receivedHash = Buffer.from(hash, "hex");
  const expectedHash = Buffer.from(calculatedHash, "hex");

  if (!timingSafeEqual(receivedHash, expectedHash)) {
    throw new Error("Telegram initData signature is invalid");
  }

  const authDate = Number(params.get("auth_date") ?? 0);
  const now = Math.floor(Date.now() / 1000);

  if (!Number.isFinite(authDate) || authDate <= 0) {
    throw new Error("Telegram initData auth_date is invalid");
  }

  if (now - authDate > maxAgeSeconds) {
    throw new Error("Telegram initData has expired");
  }

  return {
    authDate,
    hash,
    queryId: params.get("query_id") ?? undefined,
    user: parseUser(params.get("user")),
    raw: initDataRaw,
  };
}
