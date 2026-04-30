/**
 * POST /api/admin/audit-sessions/[id]/rollback
 *
 * Reverts every EDITED decision in a Claude audit session by writing the
 * before-snapshot back onto the Question row. FLAGGED rows (DRAFT) and
 * UNCHANGED rows are not touched.
 *
 * Body (optional): { onlyDecisionIds?: string[] }
 *   If supplied, only those decisions are rolled back; otherwise everything.
 *
 * Side effects:
 *   - Question rows updated (only fields in beforeSnapshot)
 *   - QuestionVersion row written documenting the rollback
 *   - ClaudeAuditDecision.rolledBack = true
 *   - ClaudeAuditSession.status = 'ROLLED_BACK' (if all decisions rolled back)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const ALLOWED_FIELDS = new Set([
  "stem", "stemZh",
  "optionA", "optionB", "optionC", "optionD", "optionE", "optionF",
  "correctAnswer", "correctAnswers",
  "explanationZh", "explanationEn",
  "optionRationales",
  "status",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const session = guard as any;
  const adminId = session?.user?.id || "admin";
  const { id } = await params;

  let body: any = {};
  try { body = await req.json(); } catch {}
  const onlyIds: string[] | null = Array.isArray(body?.onlyDecisionIds) ? body.onlyDecisionIds : null;

  const auditSession = await prisma.claudeAuditSession.findUnique({ where: { id } });
  if (!auditSession) return NextResponse.json({ error: "session not found" }, { status: 404 });

  const where: any = { sessionId: id, decision: { in: ["EDITED", "FLAGGED_FOR_REVIEW"] }, rolledBack: false };
  if (onlyIds) where.id = { in: onlyIds };

  const decisions = await prisma.claudeAuditDecision.findMany({ where });
  if (decisions.length === 0) {
    return NextResponse.json({ ok: true, rolledBack: 0, message: "nothing to roll back" });
  }

  let succeeded = 0;
  const failed: { decisionId: string; reason: string }[] = [];

  for (const d of decisions) {
    if (!d.beforeSnapshot) {
      failed.push({ decisionId: d.id, reason: "no beforeSnapshot" });
      continue;
    }
    const before = d.beforeSnapshot as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(before)) {
      if (ALLOWED_FIELDS.has(k)) updateData[k] = v;
    }
    if (Object.keys(updateData).length === 0) {
      failed.push({ decisionId: d.id, reason: "no allowed fields" });
      continue;
    }
    try {
      await prisma.$transaction([
        prisma.question.update({ where: { id: d.questionId }, data: updateData }),
        prisma.questionVersion.create({
          data: {
            questionId: d.questionId,
            snapshot: { rolledBackFrom: d.afterSnapshot, restoredTo: before, sourceDecisionId: d.id } as any,
            changedBy: adminId,
            reason: `Rollback of Claude audit session ${auditSession.label} (decision ${d.id.slice(0, 8)})`,
            agentInitiated: false,
          },
        }),
        prisma.claudeAuditDecision.update({
          where: { id: d.id },
          data: { rolledBack: true, rolledBackAt: new Date(), decision: "ROLLED_BACK" },
        }),
      ]);
      succeeded++;
    } catch (e: any) {
      failed.push({ decisionId: d.id, reason: e?.message?.slice(0, 100) ?? "unknown" });
    }
  }

  // If every decision (across the entire session) is now rolled back, mark session.
  const remaining = await prisma.claudeAuditDecision.count({
    where: { sessionId: id, rolledBack: false, decision: { in: ["EDITED", "FLAGGED_FOR_REVIEW"] } },
  });
  if (remaining === 0) {
    await prisma.claudeAuditSession.update({
      where: { id },
      data: { status: "ROLLED_BACK", notes: `Rolled back by ${adminId} at ${new Date().toISOString()}` },
    });
  }

  return NextResponse.json({
    ok: true,
    requested: decisions.length,
    rolledBack: succeeded,
    failed,
    sessionFullyRolledBack: remaining === 0,
  });
}
