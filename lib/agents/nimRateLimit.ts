/**
 * Process-wide NIM rate limiter — token bucket capped at 40 RPM total.
 *
 * Why: every agent in the system (ops, quality, marketing, audit-worker,
 * CEO) calls NIM. Without a shared limiter we'd burst past whatever
 * implicit quota NIM enforces and trigger the 429 cascades we saw on
 * deepseek-v4-pro. User mandate: ≤ 40 requests/minute total.
 *
 * Implementation: classic token bucket. Refills 40 tokens/min linearly
 * (1 every 1500ms). acquire() resolves when one is available — never
 * throws, just delays. Distributed nodes? Not yet — current Zeabur deploy
 * has one Next.js + one audit-worker, so per-process limiter ≈ global.
 *
 * To centralise across processes (when we scale): swap the in-memory
 * counter for a Redis INCR with TTL.
 */

const RPM = 40;
const REFILL_INTERVAL_MS = 60_000 / RPM; // 1500 ms
const BUCKET_MAX = RPM;

let tokens = BUCKET_MAX;
let lastRefillAt = Date.now();
let pending = 0;

function refill() {
  const now = Date.now();
  const elapsed = now - lastRefillAt;
  const add = elapsed / REFILL_INTERVAL_MS;
  if (add >= 1) {
    tokens = Math.min(BUCKET_MAX, tokens + Math.floor(add));
    lastRefillAt = now - (elapsed - Math.floor(add) * REFILL_INTERVAL_MS);
  }
}

/** Acquire one token. Resolves immediately if available, otherwise waits. */
export async function acquireNimToken(): Promise<void> {
  pending++;
  try {
    while (true) {
      refill();
      if (tokens >= 1) {
        tokens -= 1;
        return;
      }
      // Sleep until at least one token would be added
      const wait = REFILL_INTERVAL_MS - ((Date.now() - lastRefillAt) % REFILL_INTERVAL_MS);
      await new Promise((r) => setTimeout(r, Math.max(50, wait)));
    }
  } finally {
    pending--;
  }
}

/** Diagnostic snapshot — used by health endpoints. */
export function rateLimitStatus() {
  refill();
  return {
    rpm: RPM,
    tokensAvailable: Math.max(0, Math.floor(tokens)),
    pendingWaiters: pending,
    maxBucket: BUCKET_MAX,
  };
}
