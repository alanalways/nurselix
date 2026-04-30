/**
 * POST /api/admin/repair-proposals/bulk-apply
 *
 * Apply all un-applied proposals with confidence >= minConfidence.
 * Stops on first failure. Returns per-proposal results.
 *
 * Body: { minConfidence: number, dryRun?: boolean, limit?: number }
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

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const session = guard as any;

  let body: any = {};
  try { body = await req.json(); } catch {}
  const minConfidence: number = Math.max(0, Math.min(100, Number(body?.minConfidence ?? 90)));
  const dryRun: boolean = !!body?.dryRun;
  const limit: number = Math.min(Number(body?.limit ?? 50), 200);

  // Pull recent un-applied agent:repair proposals
  const versions = await prisma.questionVersion.findMany({
    where: { changedBy: "agent:repair" },
    orderBy: { createdAt: "desc" },
    take: 500, // scan window
  });

  const candidates = versions
    .filter(v => {
      const s = v.snapshot as any;
      return s?.applied === false && (s?.confidence ?? 0) >= minConfidence;
    })
    .slice(0, limit);

  const results: any[] = [];
  const adminId = session?.user?.id || "admin";

  for (const v of candidates) {
    const snap = v.snapshot as any;
    const proposed = snap?.proposed || {};
    const updateData: Record<string, any> = {};
    for (const [k, val] of Object.entries(proposed)) {
      if (ALLOWED_FIELDS.has(k)) updateData[k] = val;
    }
    if (Object.keys(updateData).length === 0) {
      results.push({ proposalId: v.id, ok: false, error: "no_applicable_fields" });
      continue;
    }
    if (dryRun) {
      results.push({ proposalId: v.id, ok: true, dryRun: true, fields: Object.keys(updateData), confidence: snap.confidence });
      continue;
    }
    try {
      await prisma.$transaction(async (tx) => {
        await tx.question.update({ where: { id: v.questionId }, data: updateData });
        await tx.questionVersion.update({
          where: { id: v.id },
          data: {
            snapshot: { ...snap, applied: true, appliedAt: new Date().toISOString(), appliedBy: adminId, appliedFields: Object.keys(updateData), bulk: true } as any,
          },
        });
        await tx.questionVersion.create({
          data: {
            questionId: v.questionId,
            snapshot: { applied: updateData, sourceProposalId: v.id, bulk: true } as any,
            changedBy: adminId,
            reason: `Bulk-apply repair (conf=${snap.confidence}, fields=${Object.keys(updateData).join(",")})`,
            agentInitiated: false,
          },
        });
        if (snap?.issueId) {
          await tx.questionQualityIssue.update({
            where: { id: snap.issueId },
            data: { status: "RESOLVED", resolvedAt: new Date(), resolvedBy: adminId, resolution: `Bulk-applied (conf ${snap.confidence})` },
          });
        }
      });
      results.push({ proposalId: v.id, ok: true, fields: Object.keys(updateData), confidence: snap.confidence });
    } catch (e: any) {
      results.push({ proposalId: v.id, ok: false, error: e?.message?.slice(0, 200) });
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    minConfidence,
    candidates: candidates.length,
    applied: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    results,
  });
}
