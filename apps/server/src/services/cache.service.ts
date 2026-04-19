import type { Status } from "@finance-twa/shared-types";

import { env } from "../config/env.js";
import { redis } from "../config/redis.js";

interface MemoryCacheEntry {
  expiresAt: number;
  status: Status;
}

const memoryCache = new Map<number, MemoryCacheEntry>();
let redisDisabled = false;
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
  memoryCache.set(telegramId, {
    status,
    expiresAt: Date.now() + env.CACHE_TTL_SECONDS * 1000,
  });
}

function invalidateMemoryStatus(telegramId: number): void {
  memoryCache.delete(telegramId);
}

function disableRedis(error: unknown): void {
  redisDisabled = true;

  if (redisWarningShown) {
    return;
  }

  redisWarningShown = true;
  console.warn("Redis is unavailable. Falling back to in-memory cache.", error);
}

async function ensureRedisConnection(): Promise<boolean> {
  if (redisDisabled) {
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

  try {
    const payload = await redis.get(getStatusKey(telegramId));

    if (!payload) {
      return null;
    }

    return JSON.parse(payload) as Status;
  } catch (error) {
    disableRedis(error);
    return getMemoryStatus(telegramId);
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
  } catch (error) {
    disableRedis(error);
    invalidateMemoryStatus(telegramId);
  }
}
