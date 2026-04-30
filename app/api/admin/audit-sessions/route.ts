/**
 * GET /api/admin/audit-sessions
 *
 * Lists every Claude audit session with progress + change counts so the
 * admin Audit tab can render a leaderboard / one-click rollback list.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const sessions = await prisma.claudeAuditSession.findMany({
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    ok: true,
    sessions,
  });
}
