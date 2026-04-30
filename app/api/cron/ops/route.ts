import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runOpsAgentTeam } from "@/lib/ops/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — agent team takes 1–3 min

/**
 * GET /api/cron/ops
 *
 * Called daily by GitHub Actions (cron-ops.yml).
 * Also accepts manual calls with the CRON_SECRET header for testing:
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ops
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Deduplicate: skip if a daily report for today already exists and is done/running
  const today = new Date().toISOString().slice(0, 10);
  const existing = await prisma.opsReport.findFirst({
    where: { period: today, periodType: "daily", status: { in: ["done", "running"] } },
    select: { id: true, status: true },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: `Daily report for ${today} already ${existing.status} (id: ${existing.id})`,
    });
  }

  // Synchronous run — Zeabur serverless kills the function after the response,
  // so fire-and-forget would not actually finish the agent team. With
  // maxDuration=300 we have enough budget to await it.
  try {
    const result = await runOpsAgentTeam({ periodType: "daily", triggeredBy: "cron" });
    return NextResponse.json({ ok: true, message: `Daily ops report for ${today} done.`, result });
  } catch (err: any) {
    console.error("[cron/ops] agent team failed:", err?.message);
    return NextResponse.json({ ok: false, error: err?.message ?? "agent team failed" }, { status: 500 });
  }
}
