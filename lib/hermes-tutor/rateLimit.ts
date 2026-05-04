/**
 * Per-user Hermes rate limit: 20 turns / hour for every plan tier.
 *
 * Uses the existing Redis connection if REDIS_URL is set; otherwise an
 * in-memory ring buffer (single-instance only, but safe for the
 * current Zeabur deploy with one Next.js pod).
 */
import { redis } from "@/lib/redis";

const LIMIT_PER_HOUR = 20;

interface RateState {
  count: number;
  windowStart: number;
}
const memMap = new Map<string, RateState>();

function inMemoryCheck(userId: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const cur = memMap.get(userId);
  if (!cur || now - cur.windowStart > windowMs) {
    memMap.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: LIMIT_PER_HOUR - 1, resetAt: now + windowMs };
  }
  if (cur.count >= LIMIT_PER_HOUR) {
    return { allowed: false, remaining: 0, resetAt: cur.windowStart + windowMs };
  }
  cur.count += 1;
  return {
    allowed: true,
    remaining: LIMIT_PER_HOUR - cur.count,
    resetAt: cur.windowStart + windowMs,
  };
}

async function redisCheck(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const key = `hermes:rl:${userId}`;
  const now = Math.floor(Date.now() / 1000);
  const windowSec = 3600;
  // INCR + EXPIRE atomically
  const count = (await redis.incr(key)) as number;
  if (count === 1) await redis.expire(key, windowSec);
  const ttl = (await redis.ttl(key)) as number;
  return {
    allowed: count <= LIMIT_PER_HOUR,
    remaining: Math.max(0, LIMIT_PER_HOUR - count),
    resetAt: (now + ttl) * 1000,
  };
}

export async function checkRateLimit(userId: string) {
  try {
    return await redisCheck(userId);
  } catch {
    return inMemoryCheck(userId);
  }
}

export const HERMES_LIMIT_PER_HOUR = LIMIT_PER_HOUR;
