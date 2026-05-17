/**
 * GET /api/cron/close-stale-reports
 *
 * One-shot cleanup: bulk-marks pre-existing IN_REVIEW QuestionReports as
 * RESOLVED_INVALID where the AI triage already concluded LIKELY_INVALID
 * but admin never closed them out. Guarded by CRON_SECRET.
 *
 * Safe to re-run — idempotent on already-resolved rows.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.questionReport.updateMany({
    where: {
      status: "IN_REVIEW",
      triageVerdict: "LIKELY_INVALID",
    },
    data: {
      status: "RESOLVED_INVALID",
      resolvedAt: new Date(),
      resolvedBy: "cron:close-stale-reports",
      resolution: "Triaged as LIKELY_INVALID by AI; bulk-closed during M1 cleanup.",
    },
  });

  return NextResponse.json({ ok: true, closed: result.count });
}
