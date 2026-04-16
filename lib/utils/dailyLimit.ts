import { redis } from "@/lib/redis";
import type { Plan } from "@/types";

export const DAILY_LIMITS: Record<Plan, number> = {
  FREE: 10,
  BASIC: 50,
  PRO: 100000,   // effectively unlimited
  ELITE: 100000, // effectively unlimited
};

export interface DailyLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  resetAt: number;
}

function dailyKey(userId: string): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `daily:${y}${m}${d}:${userId}`;
}

function midnightUtc(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.getTime();
}

/** Peek at the current usage without incrementing. */
export async function getDailyUsage(userId: string, plan: Plan): Promise<DailyLimitResult> {
  const limit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.FREE;
  try {
    const used = Number((await redis.get(dailyKey(userId))) ?? 0);
    return { allowed: used < limit, used, limit, resetAt: midnightUtc() };
  } catch {
    return { allowed: true, used: 0, limit, resetAt: midnightUtc() };
  }
}

/**
 * Atomically increment today's counter. Returns `allowed=false` if the user
 * has already hit the cap (counter is NOT incremented in that case).
 */
export async function consumeDaily(userId: string, plan: Plan): Promise<DailyLimitResult> {
  const limit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.FREE;
  const key = dailyKey(userId);

  try {
    const current = Number((await redis.get(key)) ?? 0);
    if (current >= limit) {
      return { allowed: false, used: current, limit, resetAt: midnightUtc() };
    }
    const newCount = await redis.incr(key);
    // Set expiry on first increment so Redis GCs the key.
    if (newCount === 1) {
      const secondsUntilMidnight = Math.max(60, Math.floor((midnightUtc() - Date.now()) / 1000));
      await redis.expire(key, secondsUntilMidnight);
    }
    return { allowed: true, used: newCount, limit, resetAt: midnightUtc() };
  } catch (err) {
    console.warn("[dailyLimit] Redis error — failing open:", err instanceof Error ? err.message : err);
    return { allowed: true, used: 0, limit, resetAt: midnightUtc() };
  }
}

/**
 * Manually reset a user's counter (admin use). Used by Hermes cron at 00:00.
 */
export async function resetDaily(userId: string): Promise<void> {
  try {
    await redis.del(dailyKey(userId));
  } catch {
    // ignore
  }
}
