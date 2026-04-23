// Payment feature goes public on May 1, 2026 (Asia/Taipei midnight).
// Until then, upgrade CTAs are hidden from navigation; direct URLs still work.
const LAUNCH_TS = new Date("2026-05-01T00:00:00+08:00").getTime();

export function isPaymentPublic(): boolean {
  return Date.now() >= LAUNCH_TS;
}
