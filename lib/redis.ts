import { Redis } from "ioredis";

/**
 * Lazy / optional Redis client.
 *
 * - If `REDIS_URL` is set, we create a real ioredis client.
 * - If it is **not** set, we export a Proxy that throws a clear error on any
 *   property access. All current consumers (`lib/utils/rateLimit.ts`,
 *   `lib/utils/dailyLimit.ts`, `app/api/admin/agents/route.ts`) already wrap
 *   calls in `try/catch` and fail-open / report unhealthy, so this preserves
 *   behaviour without silently connecting to `localhost:6379`.
 *
 * BullMQ workers (audit-worker) instantiate their own `new Redis(...)` and do
 * not import this module, so this is purely the app-side client.
 */

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    // Build-time / misconfigured environments: defer the failure until first
    // use so build / static analysis does not crash. Consumers already handle
    // Redis errors and fail-open.
    return new Proxy({} as Redis, {
      get(_target, prop) {
        throw new Error(
          `[redis] REDIS_URL is not set — cannot perform Redis operation (${String(prop)}). ` +
            `Configure REDIS_URL in the environment to enable rate limiting, daily limits, and queue health checks.`,
        );
      },
    });
  }
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
  });
}

export const redis: Redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;
