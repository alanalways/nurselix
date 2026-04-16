import { redis } from "@/lib/redis";

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Sliding-window rate limit on Redis.
 *
 *   const res = await rateLimit(`ip:${ip}`, { limit: 60, windowSec: 60 });
 *   if (!res.success) return NextResponse.json(..., { status: 429 });
 */
export async function rateLimit(
  key: string,
  { limit, windowSec }: { limit: number; windowSec: number },
): Promise<RateLimitResult> {
  const redisKey = `rl:${key}`;
  try {
    const multi = redis.multi();
    multi.incr(redisKey);
    multi.expire(redisKey, windowSec, "NX");
    multi.pttl(redisKey);

    const result = await multi.exec();
    if (!result) {
      return { success: true, remaining: limit, resetAt: Date.now() + windowSec * 1000, limit };
    }

    const current = Number(result[0]?.[1] ?? 0);
    const pttlMs = Number(result[2]?.[1] ?? windowSec * 1000);
    const resetAt = Date.now() + (pttlMs > 0 ? pttlMs : windowSec * 1000);

    return {
      success: current <= limit,
      remaining: Math.max(0, limit - current),
      resetAt,
      limit,
    };
  } catch (err) {
    // If Redis is temporarily unavailable, fail-open rather than blocking users.
    console.warn("[rateLimit] Redis error — failing open:", err instanceof Error ? err.message : err);
    return { success: true, remaining: limit, resetAt: Date.now() + windowSec * 1000, limit };
  }
}

/** Convenience wrapper for per-IP limits. */
export function ipRateLimit(ip: string, rule: { limit: number; windowSec: number }) {
  return rateLimit(`ip:${ip}`, rule);
}

/** Convenience wrapper for per-user limits. */
export function userRateLimit(userId: string, scope: string, rule: { limit: number; windowSec: number }) {
  return rateLimit(`user:${userId}:${scope}`, rule);
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
