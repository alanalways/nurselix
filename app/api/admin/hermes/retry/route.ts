/**
 * Admin Hermes endpoint — 重試失敗的 HermesJob（attempts < 3）。
 * Auth: Bearer HERMES_ADMIN_API_KEY 或 CRON_SECRET。
 *
 * 為何 BATCH_SIZE=3、又加 deadline：
 *  - 每個 hermes job 約 30 秒（Analytics + Teaching agents），sequential 跑
 *    10 個就 5 分鐘 → 撞 Zeabur HTTP timeout，cron 會回 500 而所有結果丟失。
 *  - 改成每次最多 3 個並設 4 分鐘 hard deadline；剩下的留給下個 cron tick
 *    （cron 每 2 小時跑一次，足夠消化）。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runHermesForSession } from "@/lib/hermes/orchestrator";
import { ipRateLimit, getClientIp } from "@/lib/utils/rateLimit";

export const maxDuration = 300;

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 3;
// Hard ceiling so a slow agent batch can't overflow Zeabur's 5-min request budget.
const DEADLINE_MS = 4 * 60_000;

function verifyAdminSecret(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const hermesKey = process.env.HERMES_ADMIN_API_KEY;
  const cronKey = process.env.CRON_SECRET;
  if (hermesKey && auth === `Bearer ${hermesKey}`) return true;
  if (cronKey && auth === `Bearer ${cronKey}`) return true;
  return false;
}

export async function POST(req: NextRequest) {
  const rl = await ipRateLimit(getClientIp(req), { limit: 30, windowSec: 3600 });
  if (!rl.success) return NextResponse.json({ error: "rate limited" }, { status: 429 });

  if (!verifyAdminSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const overBudget = () => Date.now() - startedAt > DEADLINE_MS;

  const failedJobs = await prisma.hermesJob.findMany({
    where: { status: "failed", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { updatedAt: "asc" },
    take: BATCH_SIZE,
  });

  const results: Array<{ id: string; sessionId: string; ok: boolean; error?: string }> = [];
  let deadlineReached = false;

  for (const job of failedJobs) {
    if (overBudget()) {
      deadlineReached = true;
      results.push({ id: job.id, sessionId: job.sessionId, ok: false, error: "deadline_reached_before_processing" });
      continue;
    }

    // Reset to pending so orchestrator can pick it up via updateMany({ status: pending })
    await prisma.hermesJob.update({
      where: { id: job.id },
      data: { status: "pending", error: null },
    });

    try {
      await runHermesForSession(job.sessionId, job.userId);
      results.push({ id: job.id, sessionId: job.sessionId, ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: job.id, sessionId: job.sessionId, ok: false, error: msg.slice(0, 200) });
    }
  }

  const succeeded = results.filter((r) => r.ok).length;

  return NextResponse.json({
    ok: true,
    scanned: failedJobs.length,
    succeeded,
    failed: results.length - succeeded,
    durationMs: Date.now() - startedAt,
    deadlineReached,
    results,
  });
}

export async function GET(req: NextRequest) {
  const rl = await ipRateLimit(getClientIp(req), { limit: 60, windowSec: 3600 });
  if (!rl.success) return NextResponse.json({ error: "rate limited" }, { status: 429 });

  if (!verifyAdminSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [pending, running, failed, done, exhausted] = await Promise.all([
    prisma.hermesJob.count({ where: { status: "pending" } }),
    prisma.hermesJob.count({ where: { status: "running" } }),
    prisma.hermesJob.count({ where: { status: "failed", attempts: { lt: MAX_ATTEMPTS } } }),
    prisma.hermesJob.count({ where: { status: "done" } }),
    prisma.hermesJob.count({ where: { status: "failed", attempts: { gte: MAX_ATTEMPTS } } }),
  ]);

  return NextResponse.json({ ok: true, stats: { pending, running, failed, done, exhausted } });
}
