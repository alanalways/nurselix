import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const BETA_ENDS = new Date("2026-05-01T00:00:00Z");

/**
 * POST /api/admin/beta-grant
 * One-time endpoint to upgrade all existing non-ELITE, non-admin users to PRO
 * with trialEndsAt = 2026-05-01. The trial-expiry cron will auto-downgrade on May 1.
 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dry") === "1";

  const users = await prisma.user.findMany({
    where: {
      plan: { not: "ELITE" },
      role: { not: "ADMIN" },
    },
    select: { id: true, email: true, plan: true },
  });

  if (dryRun) {
    return NextResponse.json({ dryRun: true, would_upgrade: users.length, users });
  }

  const result = await prisma.user.updateMany({
    where: {
      plan: { not: "ELITE" },
      role: { not: "ADMIN" },
    },
    data: {
      plan: "PRO",
      trialEndsAt: BETA_ENDS,
      trialUsed: true,
    } as any,
  });

  return NextResponse.json({
    ok: true,
    upgraded: result.count,
    betaEnds: BETA_ENDS.toISOString(),
    message: `${result.count} users upgraded to PRO. trial-expiry cron will downgrade them to FREE on 2026-05-01.`,
  });
}
