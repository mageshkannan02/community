import { redisClient, isRedisAvailable } from "../config/redis";

interface MemoryCacheEntry {
  value: any;
  expiresAt: number;
}

const memoryStore = new Map<string, MemoryCacheEntry>();

// Clean expired memory cache keys every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (entry.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
}, 120_000);

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    if (redisClient && isRedisAvailable) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
  } catch (err) {
    // Fall back to memoryStore
  }

  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  try {
    if (redisClient && isRedisAvailable) {
      await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    }
  } catch (err) {
    // Fall back to memoryStore
  }

  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDel(keys: string | string[]): Promise<void> {
  const keyList = Array.isArray(keys) ? keys : [keys];
  try {
    if (redisClient && isRedisAvailable && keyList.length > 0) {
      await redisClient.del(...keyList);
    }
  } catch (err) {
    // Continue
  }

  for (const k of keyList) {
    memoryStore.delete(k);
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  try {
    if (redisClient && isRedisAvailable) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }
  } catch (err) {
    // Continue
  }

  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  for (const k of memoryStore.keys()) {
    if (regex.test(k)) {
      memoryStore.delete(k);
    }
  }
}

export async function cacheWrap<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const result = await fn();
  if (result !== null && result !== undefined) {
    await cacheSet(key, result, ttlSeconds);
  }
  return result;
}
