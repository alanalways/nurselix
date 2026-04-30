/**
 * GET /api/cron/quality-scan
 *
 * Daily rule-based quality scan. Pure rules, no LLM API calls.
 * Writes findings to QuestionQualityIssue and a daily QualityHealthReport.
 *
 * Triggered by .github/workflows/cron-quality-scan.yml at 03:00 UTC.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scanQuestion, contentHash, type QuestionShape } from "@/lib/quality/rules";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const start = Date.now();
  const url = new URL(req.url);
  const autoArchive = url.searchParams.get("autoArchive") === "1";

  // Memory note: 14k+ rows × all big text fields (stem/explanation/rationales) was
  // OOMing on Zeabur. We now stream rows in id-cursor batches, run scanQuestion
  // incrementally and only retain ids + small accumulators between batches.
  const BATCH_SIZE = 500;

  // The scan engine (scanQuestion + contentHash) reads stem/options/explanation/
  // rationales/answer/stat fields, so these are still required — we just don't
  // load them all at once anymore.
  const QUESTION_SELECT = {
    id: true, module: true, questionType: true, difficulty: true, status: true,
    stem: true, stemZh: true, optionA: true, optionB: true, optionC: true, optionD: true,
    optionE: true, optionF: true, correctAnswer: true, correctAnswers: true,
    explanationZh: true, explanationEn: true, optionRationales: true,
    attemptCount: true, correctCount: true, errorRate: true,
  } as const;

  // Total + status counts via aggregate so we don't need every row in memory
  // for the health report at the bottom of this handler.
  const [totalQuestions, approvedCount, draftCount, archivedCount] = await Promise.all([
    prisma.question.count(),
    prisma.question.count({ where: { status: "APPROVED" } }),
    prisma.question.count({ where: { status: "DRAFT" } }),
    prisma.question.count({ where: { status: "ARCHIVED" } }),
  ]);

  const stats = {
    total: totalQuestions,
    issuesByRule: {} as Record<string, number>,
    issuesBySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>,
    questionsWithIssues: 0,
    criticalQuestionIds: [] as string[],
    insertedNew: 0,
  };

  // Track which CRITICAL ruleIds fired for each question so we can write a
  // QuestionVersion audit row when auto-archiving below.
  const criticalRulesByQuestion = new Map<string, string[]>();

  const existing = await prisma.questionQualityIssue.findMany({
    where: { status: "OPEN" },
    select: { questionId: true, ruleId: true, contentHash: true },
  });
  const existingKeys = new Set(existing.map((e: { questionId: string; ruleId: string; contentHash: string | null }) =>
    `${e.questionId}:${e.ruleId}:${e.contentHash || ""}`));

  // Stream Question rows in id-ordered batches and insert findings per-batch
  // so we never hold the full corpus in memory.
  let cursorId: string | undefined = undefined;
  while (true) {
    const batch: Array<Record<string, any>> = await prisma.question.findMany({
      select: QUESTION_SELECT,
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
    });
    if (batch.length === 0) break;

    const batchIssues: any[] = [];
    for (const q of batch) {
      const hash = contentHash(q as QuestionShape);
      let hasIssue = false;
      let hasCritical = false;
      const issues = scanQuestion(q as QuestionShape);
      for (const issue of issues) {
        hasIssue = true;
        if (issue.severity === "CRITICAL") {
          hasCritical = true;
          const list = criticalRulesByQuestion.get(q.id) ?? [];
          list.push(issue.ruleId);
          criticalRulesByQuestion.set(q.id, list);
        }
        stats.issuesByRule[issue.ruleId] = (stats.issuesByRule[issue.ruleId] || 0) + 1;
        stats.issuesBySeverity[issue.severity]++;
        const key = `${q.id}:${issue.ruleId}:${hash}`;
        if (existingKeys.has(key)) continue;
        batchIssues.push({
          questionId: q.id,
          ruleId: issue.ruleId,
          severity: issue.severity,
          detail: issue.detail,
          meta: issue.meta || null,
          contentHash: hash,
        });
      }
      if (hasIssue) stats.questionsWithIssues++;
      if (hasCritical) stats.criticalQuestionIds.push(q.id);
    }

    if (batchIssues.length > 0) {
      await prisma.questionQualityIssue.createMany({
        data: batchIssues as any,
        skipDuplicates: true,
      });
      stats.insertedNew += batchIssues.length;
    }

    if (batch.length < BATCH_SIZE) break;
    cursorId = batch[batch.length - 1].id as string;
  }

  // Auto-archive critical (APPROVED → DRAFT) and record a QuestionVersion
  // audit row per archived question so the change is traceable in the
  // dashboard and revertable.
  let autoArchived = 0;
  if (autoArchive && stats.criticalQuestionIds.length > 0) {
    // Identify which critical questions are actually still APPROVED — those
    // are the only ones updateMany will touch, so we only audit those.
    const archivable = await prisma.question.findMany({
      where: { id: { in: stats.criticalQuestionIds }, status: "APPROVED" },
      select: { id: true },
    });
    const archivableIds: string[] = archivable.map((q: { id: string }) => q.id);

    if (archivableIds.length > 0) {
      const r = await prisma.question.updateMany({
        where: { id: { in: archivableIds }, status: "APPROVED" },
        data: { status: "DRAFT" },
      });
      autoArchived = r.count;

      // One audit row per archived question; createMany for a single round-trip.
      const versionRows = archivableIds.map((qid: string) => {
        const ruleIds = criticalRulesByQuestion.get(qid) ?? [];
        return {
          questionId: qid,
          snapshot: {
            status: "APPROVED → DRAFT",
            reason: "auto-archived by quality-scan",
            criticalRuleIds: ruleIds,
          } as any,
          changedBy: "agent:quality-scan",
          reason: `Auto-archived: ${ruleIds.join(", ")}`,
          agentInitiated: true,
        };
      });
      if (versionRows.length > 0) {
        await prisma.questionVersion.createMany({ data: versionRows });
      }
    }
  }

  // Health report
  const today = new Date().toISOString().slice(0, 10);
  const weight = stats.issuesBySeverity.CRITICAL * 10 + stats.issuesBySeverity.HIGH * 5
               + stats.issuesBySeverity.MEDIUM * 2 + stats.issuesBySeverity.LOW * 1;
  const healthScore = totalQuestions === 0
    ? 100
    : Math.max(0, Math.min(100, Math.round(100 - (weight / totalQuestions) * 100)));

  await prisma.qualityHealthReport.upsert({
    where: { periodType_period: { periodType: "daily", period: today } },
    create: {
      periodType: "daily", period: today,
      totalQuestions,
      approvedCount, draftCount, archivedCount,
      openIssueCount: stats.questionsWithIssues, healthScore,
      summary: { byRule: stats.issuesByRule, bySeverity: stats.issuesBySeverity } as any,
    },
    update: {
      totalQuestions,
      approvedCount, draftCount, archivedCount,
      openIssueCount: stats.questionsWithIssues, healthScore,
      summary: { byRule: stats.issuesByRule, bySeverity: stats.issuesBySeverity } as any,
    },
  });

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - start,
    healthScore,
    stats,
    autoArchived,
  });
}
