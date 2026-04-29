/**
 * GET /api/cron/propose-repairs
 *
 * Run verifier+repair on open CRITICAL QuestionQualityIssues, store
 * un-applied repair proposals in QuestionVersion (snapshot.applied=false).
 *
 * Triggered daily by .github/workflows/cron-propose-repairs.yml at 05:00 UTC.
 * Admin can review proposals in command-center and click "apply" to commit.
 */
import { NextRequest, NextResponse } from "next/server";
import { proposeRepairsForCritical } from "@/lib/agents/quality/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "10", 10);

  const start = Date.now();
  try {
    const result = await proposeRepairsForCritical({ limit });
    return NextResponse.json({ ok: true, durationMs: Date.now() - start, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, durationMs: Date.now() - start }, { status: 500 });
  }
}
