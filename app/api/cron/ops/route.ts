import { NextRequest, NextResponse } from "next/server";
import { runOpsAgentTeam } from "@/lib/ops/orchestrator";

/**
 * GET /api/cron/ops
 *
 * Called by Vercel Cron every hour (configured in vercel.json).
 * Vercel automatically sets the `Authorization: Bearer <CRON_SECRET>` header.
 * We also accept the header manually for local testing:
 *   curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ops
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fire-and-forget — Vercel cron has a 60 s response timeout but the agent
  // team takes 1–3 min, so we respond immediately and let it run in the bg.
  runOpsAgentTeam({ periodType: "daily", triggeredBy: "cron" }).catch((err) => {
    console.error("[cron/ops] agent team failed:", err?.message);
  });

  return NextResponse.json({ ok: true, message: "Ops agent team started." });
}
