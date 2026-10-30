import { Redis } from "ioredis";
import { env } from "./env";

let redisClient: Redis | null = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: () => null, // Do not spam reconnects if not running
  });

  redisClient.on("connect", () => {
    isRedisAvailable = true;
    console.log("Redis connected successfully.");
  });

  redisClient.on("error", (err) => {
    if (isRedisAvailable) {
      console.warn("Redis connection error, switching to in-memory fallback:", err.message);
    }
    isRedisAvailable = false;
  });

  // Attempt non-blocking initial connect
  redisClient.connect().catch(() => {
    isRedisAvailable = false;
    console.log("Redis not reachable. Using fast in-memory fallback cache.");
  });
} catch (e) {
  isRedisAvailable = false;
  console.log("Using in-memory cache fallback.");
}

export { redisClient, isRedisAvailable };
