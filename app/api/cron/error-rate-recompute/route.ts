/**
 * GET /api/cron/error-rate-recompute
 *
 * Daily: recomputes Question.errorRate from attemptCount/correctCount.
 * Pure SQL, no API calls.
 *
 * Triggered by .github/workflows/cron-error-rate-recompute.yml at 05:00 UTC.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const start = Date.now();
  // ROUND((1 - correctCount/attemptCount) * 100)
  const r = await prisma.$executeRaw`
    UPDATE "Question"
    SET "errorRate" = ROUND((1.0 - ("correctCount"::numeric / "attemptCount")) * 100)
    WHERE "attemptCount" > 0
  `;
  return NextResponse.json({ ok: true, durationMs: Date.now() - start, updated: r });
}
