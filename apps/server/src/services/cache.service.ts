import type { Status } from "@finance-twa/shared-types";

import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { logger } from "../utils/logger.js";

const log = logger.child({ service: "cache" });

interface MemoryCacheEntry {
  expiresAt: number;
  status: Status;
}

const memoryCache = new Map<number, MemoryCacheEntry>();
const MEMORY_CACHE_MAX = 500;
/** How long to stay on the in-memory fallback after a Redis connectivity error before trying Redis again. */
const REDIS_RETRY_COOLDOWN_MS = 30_000;
let redisDisabledUntil = 0;
let redisWarningShown = false;

function getStatusKey(telegramId: number): string {
  return `status:${telegramId}`;
}

function getMemoryStatus(telegramId: number): Status | null {
  const entry = memoryCache.get(telegramId);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(telegramId);
    return null;
  }

  return entry.status;
}

function setMemoryStatus(telegramId: number, status: Status): void {
  if (memoryCache.size >= MEMORY_CACHE_MAX) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey !== undefined) memoryCache.delete(oldestKey);
  }

  memoryCache.set(telegramId, {
    status,
    expiresAt: Date.now() + env.CACHE_TTL_SECONDS * 1000,
  });
}

function invalidateMemoryStatus(telegramId: number): void {
  memoryCache.delete(telegramId);
}

/** Disable Redis for a cooldown window after a *connectivity* failure — never called for a bad cached value. */
function disableRedis(error: unknown): void {
  redisDisabledUntil = Date.now() + REDIS_RETRY_COOLDOWN_MS;

  if (redisWarningShown) {
    return;
  }

  redisWarningShown = true;
  log.warn({ err: error }, "Redis is unavailable. Falling back to in-memory cache.");
}

/** Called after any Redis operation succeeds, so a transient outage doesn't disable caching for the rest of the process's life. */
function reenableRedis(): void {
  if (redisDisabledUntil === 0) {
    return;
  }

  redisDisabledUntil = 0;

  if (redisWarningShown) {
    redisWarningShown = false;
    log.info("Redis connection recovered — resuming Redis-backed cache.");
  }
}

async function ensureRedisConnection(): Promise<boolean> {
  if (redisDisabledUntil !== 0 && Date.now() < redisDisabledUntil) {
    return false;
  }

  if (redis.status === "wait") {
    try {
      await redis.connect();
    } catch (error) {
      disableRedis(error);
      return false;
    }
  }

  return true;
}

export async function getCachedStatus(telegramId: number): Promise<Status | null> {
  const canUseRedis = await ensureRedisConnection();

  if (!canUseRedis) {
    return getMemoryStatus(telegramId);
  }

  let raw: string | null;
  try {
    raw = await redis.get(getStatusKey(telegramId));
    reenableRedis();
  } catch (error) {
    disableRedis(error);
    return getMemoryStatus(telegramId);
  }

  if (!raw) return null;

  try {
    return JSON.parse(raw) as Status;
  } catch (error) {
    // A malformed cached value is a data problem for this one key, not a Redis
    // outage — don't disable Redis for every other user over it.
    log.warn({ err: error, telegramId }, "Discarding corrupt cached status");
    return null;
  }
}

export async function setCachedStatus(telegramId: number, status: Status): Promise<void> {
  const canUseRedis = await ensureRedisConnection();

  if (!canUseRedis) {
    setMemoryStatus(telegramId, status);
    return;
  }

  try {
    await redis.set(getStatusKey(telegramId), JSON.stringify(status), "EX", env.CACHE_TTL_SECONDS);
    reenableRedis();
  } catch (error) {
    disableRedis(error);
    setMemoryStatus(telegramId, status);
  }
}

export async function invalidateStatusCache(telegramId: number): Promise<void> {
  const canUseRedis = await ensureRedisConnection();

  if (!canUseRedis) {
    invalidateMemoryStatus(telegramId);
    return;
  }

  try {
    await redis.del(getStatusKey(telegramId));
    reenableRedis();
  } catch (error) {
    disableRedis(error);
    invalidateMemoryStatus(telegramId);
  }
}
