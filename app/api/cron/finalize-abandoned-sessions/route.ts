import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { finishSession } from "@/lib/nclex/sessionEngine";

/**
 * Cron: finalize sessions where the user started an exam then left.
 *
 * Rule: if a session has endedAt = null and its most recent activity
 * (last answered question, or startedAt if none) is older than 1 hour,
 * we assume the user abandoned it and auto-finish with stopReason
 * "auto_abandoned". Same code path as a normal finish, so pass/fail,
 * score, achievements, etc. all get computed correctly.
 */

const IDLE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - IDLE_THRESHOLD_MS);

  const stale = await prisma.userSession.findMany({
    where: {
      endedAt: null,
      startedAt: { lt: cutoff },
    },
    select: {
      id: true,
      userId: true,
      startedAt: true,
      answers: {
        select: { answeredAt: true },
        orderBy: { answeredAt: "desc" },
        take: 1,
      },
    },
  });

  let finalized = 0;
  const errors: string[] = [];

  for (const s of stale) {
    const lastActivity = s.answers[0]?.answeredAt ?? s.startedAt;
    if (lastActivity.getTime() > cutoff.getTime()) continue;

    try {
      const result = await finishSession(s.id, s.userId, "auto_abandoned");
      if (result) finalized++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${s.id}: ${msg}`);
      console.warn("[cron/finalize-abandoned] failed:", s.id, msg);
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: stale.length,
    finalized,
    errors: errors.length,
    timestamp: new Date().toISOString(),
  });
}
