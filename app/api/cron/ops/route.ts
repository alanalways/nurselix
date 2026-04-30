import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OPS_MODEL } from "@/lib/ops/client";
import { runOpsAgentTeam } from "@/lib/ops/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min HTTP cap on Zeabur serverless

// Hard timeout for the agent team — must be < maxDuration so we still have
// budget to UPDATE the row + return 200 before the platform aborts us.
const AGENT_TIMEOUT_MS = 4 * 60 * 1000; // 4 min

// A "running" row older than this is treated as a stale ghost (LLM hung,
// process killed, etc.) and the dedupe check lets a fresh run proceed.
const RUNNING_STALE_MS = 30 * 60 * 1000; // 30 min

/**
 * GET /api/cron/ops
 *
 * Called daily by GitHub Actions (cron-ops.yml).
 * Also accepts manual calls with the CRON_SECRET header for testing:
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ops
 *
 * Resilience contract:
 *   1. We INSERT a sentinel OpsReport row (status='running') BEFORE any LLM
 *      call, so even if the orchestrator hangs before its own create(), we
 *      always have a diagnostic row.
 *   2. The agent team is wrapped in Promise.race with a 4-minute hard
 *      timeout — we always return 200 within ~4 min, never let the
 *      scheduler hit the 5-min HTTP abort.
 *   3. Dedupe still skips today's done/running reports, but a "running"
 *      row older than 30 min is considered stale (hung) and re-runnable.
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

  // ── Dedupe: today's report ────────────────────────────────────────────────
  // Skip only if it's done OR running-and-fresh. A running row older than
  // RUNNING_STALE_MS is a ghost (previous invocation hung) — let this one through.
  const today = new Date().toISOString().slice(0, 10);
  const staleCutoff = new Date(Date.now() - RUNNING_STALE_MS);
  const existing = await prisma.opsReport.findFirst({
    where: {
      period: today,
      periodType: "daily",
      OR: [
        { status: "done" },
        { status: "running", createdAt: { gt: staleCutoff } },
      ],
    },
    select: { id: true, status: true, createdAt: true },
  });
  if (existing) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: `Daily report for ${today} already ${existing.status} (id: ${existing.id})`,
    });
  }

  // ── Sentinel row: written BEFORE any LLM call ─────────────────────────────
  // If runOpsAgentTeam hangs before its own prisma.opsReport.create, this row
  // is still in the DB so we can see the request did reach the endpoint.
  let sentinelId: string | null = null;
  try {
    const sentinel = await prisma.opsReport.create({
      data: {
        period: today,
        periodType: "daily",
        status: "running",
        model: OPS_MODEL,
        triggeredBy: "cron:sentinel",
      },
      select: { id: true },
    });
    sentinelId = sentinel.id;
  } catch (err: any) {
    // Even DB write failed — bail without burning the cron slot.
    console.error("[cron/ops] sentinel insert failed:", err?.message);
    return NextResponse.json(
      { ok: false, error: `sentinel insert failed: ${err?.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  // ── Race the agent team against a 4-min hard timeout ──────────────────────
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<{ __timeout: true }>((resolve) => {
    timeoutHandle = setTimeout(() => resolve({ __timeout: true }), AGENT_TIMEOUT_MS);
  });

  try {
    const raced = await Promise.race([
      runOpsAgentTeam({ periodType: "daily", triggeredBy: "cron" }).then((r) => ({ __timeout: false as const, result: r })),
      timeoutPromise,
    ]);

    if (timeoutHandle) clearTimeout(timeoutHandle);

    if ("result" in raced && raced.__timeout === false) {
      // Success — orchestrator finished within budget. Mark sentinel as
      // handed-off so it doesn't pollute history (orchestrator wrote its own row).
      await prisma.opsReport
        .update({
          where: { id: sentinelId },
          data: { status: "done", error: `handed-off to ${raced.result.reportId}`, durationMs: raced.result.durationMs },
        })
        .catch((e: any) => console.error("[cron/ops] sentinel update (success) failed:", e?.message));

      return NextResponse.json({
        ok: true,
        message: `Daily ops report for ${today} done.`,
        result: raced.result,
      });
    }

    // Timeout branch — agent team did NOT resolve within AGENT_TIMEOUT_MS.
    await prisma.opsReport
      .update({
        where: { id: sentinelId },
        data: { status: "timeout", error: "5min HTTP cap reached" },
      })
      .catch((e: any) => console.error("[cron/ops] sentinel update (timeout) failed:", e?.message));

    console.warn(`[cron/ops] agent team timed out after ${AGENT_TIMEOUT_MS}ms (sentinel ${sentinelId})`);
    return NextResponse.json({
      ok: true,
      timeout: true,
      message: `Agent team exceeded ${AGENT_TIMEOUT_MS / 1000}s; sentinel marked timeout (id: ${sentinelId}).`,
    });
  } catch (err: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    console.error("[cron/ops] agent team failed:", err?.message);
    await prisma.opsReport
      .update({
        where: { id: sentinelId },
        data: { status: "error", error: (err?.message ?? "agent team failed").slice(0, 1000) },
      })
      .catch((e: any) => console.error("[cron/ops] sentinel update (error) failed:", e?.message));

    return NextResponse.json(
      { ok: false, error: err?.message ?? "agent team failed", sentinelId },
      { status: 500 }
    );
  }
}
