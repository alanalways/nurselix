/**
 * Admin Hermes endpoint — 重試失敗的 HermesJob（attempts < 3）。
 * Auth: Bearer HERMES_ADMIN_API_KEY 或 CRON_SECRET。
 * 每次最多重試 10 筆，避免一次 burn 掉 Anthropic 額度。
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runHermesForSession } from "@/lib/hermes/orchestrator";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE = 10;

function verifyAdminSecret(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const hermesKey = process.env.HERMES_ADMIN_API_KEY;
  const cronKey = process.env.CRON_SECRET;
  if (hermesKey && auth === `Bearer ${hermesKey}`) return true;
  if (cronKey && auth === `Bearer ${cronKey}`) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!verifyAdminSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const failedJobs = await prisma.hermesJob.findMany({
    where: { status: "failed", attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { updatedAt: "asc" },
    take: BATCH_SIZE,
  });

  const results: Array<{ id: string; sessionId: string; ok: boolean; error?: string }> = [];

  for (const job of failedJobs) {
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
    results,
  });
}

export async function GET(req: NextRequest) {
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
