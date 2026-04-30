/**
 * GET /api/admin/repair-proposals
 *
 * Lists all un-applied repair proposals from QuestionVersion (where
 * snapshot.applied=false and changedBy='agent:repair').
 *
 * Query params:
 *   minConfidence: only return proposals with confidence >= N (default 0)
 *   limit:         max rows (default 50)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const minConfidence = parseInt(url.searchParams.get("minConfidence") || "0", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);

  const rows = await prisma.questionVersion.findMany({
    where: { changedBy: "agent:repair" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      question: {
        select: {
          id: true, stem: true, stemZh: true,
          optionA: true, optionB: true, optionC: true, optionD: true, optionE: true, optionF: true,
          correctAnswer: true, correctAnswers: true, explanationZh: true, optionRationales: true,
          status: true, module: true, difficulty: true,
        },
      },
    },
  });

  // Filter to un-applied + meeting confidence threshold
  const proposals = rows
    .filter(r => {
      const snap = r.snapshot as any;
      return snap && snap.applied === false && (snap.confidence ?? 0) >= minConfidence;
    })
    .map(r => {
      const snap = r.snapshot as any;
      return {
        proposalId: r.id,
        questionId: r.questionId,
        createdAt: r.createdAt,
        confidence: snap.confidence,
        changeSummary: snap.changeSummary,
        proposed: snap.proposed,
        verdict: snap.verdict,
        issueId: snap.issueId,
        question: r.question,
      };
    });

  // Stats by confidence band
  const stats = {
    total: proposals.length,
    highConfidence: proposals.filter(p => (p.confidence ?? 0) >= 90).length,
    mediumConfidence: proposals.filter(p => (p.confidence ?? 0) >= 70 && (p.confidence ?? 0) < 90).length,
    lowConfidence: proposals.filter(p => (p.confidence ?? 0) < 70).length,
  };

  return NextResponse.json({ ok: true, stats, proposals });
}
