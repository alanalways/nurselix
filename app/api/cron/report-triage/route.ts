/**
 * GET /api/cron/report-triage
 *
 * Daily: process pending QuestionReports through Kimi-K2.5 triage agent.
 * Auto-archives questions when triage says shouldAutoArchive=true.
 *
 * Triggered by .github/workflows/cron-report-triage.yml at 04:00 UTC.
 */
import { NextRequest, NextResponse } from "next/server";
import { processReportTriageBatch } from "@/lib/agents/quality/orchestrator";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "30", 10);
  const autoArchive = url.searchParams.get("autoArchive") !== "0";

  const start = Date.now();
  try {
    const result = await processReportTriageBatch({ limit, autoArchive });
    return NextResponse.json({ ok: true, durationMs: Date.now() - start, ...result });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, durationMs: Date.now() - start }, { status: 500 });
  }
}
