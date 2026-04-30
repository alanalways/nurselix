/**
 * GET  /api/admin/audit-sessions/[id]   — session detail + decision list
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const { id } = await params;

  const session = await prisma.claudeAuditSession.findUnique({ where: { id } });
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  const recent = await prisma.claudeAuditDecision.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, questionId: true, decision: true, confidence: true,
      reasoning: true, changeSummary: true, rolledBack: true, createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, session, recentDecisions: recent });
}
