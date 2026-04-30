/**
 * POST /api/admin/repair-proposals/[id]/apply
 *
 * Apply a repair proposal: write the proposed fields onto the Question,
 * mark the proposal applied, mark the underlying QuestionQualityIssue resolved.
 *
 * Body (optional): { fields?: string[] } — only apply selected fields.
 *                  If absent, apply ALL fields in proposed.
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
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const session = guard as any;
  const { id } = await params;

  let body: any = {};
  try { body = await req.json(); } catch {}
  const fieldFilter: string[] | null = Array.isArray(body?.fields) ? body.fields : null;

  const version = await prisma.questionVersion.findUnique({ where: { id } });
  if (!version) return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
  if (version.changedBy !== "agent:repair") {
    return NextResponse.json({ ok: false, error: "Not a repair proposal" }, { status: 400 });
  }
  const snap = version.snapshot as any;
  if (snap?.applied === true) {
    return NextResponse.json({ ok: false, error: "Already applied" }, { status: 409 });
  }

  // Build the update payload from proposed, filtering by ALLOWED_FIELDS
  // (and the optional client-side fieldFilter).
  const proposed = snap?.proposed || {};
  const updateData: Record<string, any> = {};
  for (const [k, v] of Object.entries(proposed)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (fieldFilter && !fieldFilter.includes(k)) continue;
    updateData[k] = v;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ ok: false, error: "No applicable fields in proposal" }, { status: 400 });
  }

  // Atomic-ish: update Question + flip QuestionVersion.snapshot.applied=true
  // + resolve the underlying issue.
  const adminId = session?.user?.id || "admin";
  await prisma.$transaction(async (tx) => {
    await tx.question.update({
      where: { id: version.questionId },
      data: updateData,
    });

    // Re-write the snapshot with applied=true so it disappears from the queue
    const newSnapshot = { ...snap, applied: true, appliedAt: new Date().toISOString(), appliedBy: adminId, appliedFields: Object.keys(updateData) };
    await tx.questionVersion.update({
      where: { id: version.id },
      data: { snapshot: newSnapshot as any },
    });

    // Audit trail entry separate from the proposal record itself
    await tx.questionVersion.create({
      data: {
        questionId: version.questionId,
        snapshot: { applied: updateData, sourceProposalId: version.id } as any,
        changedBy: adminId,
        reason: `Apply repair proposal ${version.id} (fields: ${Object.keys(updateData).join(",")})`,
        agentInitiated: false,
      },
    });

    // Mark the related QuestionQualityIssue as resolved-fixed (if linked)
    if (snap?.issueId) {
      await tx.questionQualityIssue.update({
        where: { id: snap.issueId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedBy: adminId,
          resolution: `Applied agent repair proposal (confidence ${snap.confidence})`,
        },
      });
    }
  });

  return NextResponse.json({ ok: true, applied: Object.keys(updateData), questionId: version.questionId });
}
