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

  const questions = await prisma.question.findMany({
    select: {
      id: true, module: true, questionType: true, difficulty: true, status: true,
      stem: true, stemZh: true, optionA: true, optionB: true, optionC: true, optionD: true,
      optionE: true, optionF: true, correctAnswer: true, correctAnswers: true,
      explanationZh: true, explanationEn: true, optionRationales: true,
      attemptCount: true, correctCount: true, errorRate: true,
    },
  });

  const stats = {
    total: questions.length,
    issuesByRule: {} as Record<string, number>,
    issuesBySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>,
    questionsWithIssues: 0,
    criticalQuestionIds: [] as string[],
    insertedNew: 0,
  };

  const existing = await prisma.questionQualityIssue.findMany({
    where: { status: "OPEN" },
    select: { questionId: true, ruleId: true, contentHash: true },
  });
  const existingKeys = new Set(existing.map(e => `${e.questionId}:${e.ruleId}:${e.contentHash || ""}`));

  const newIssues: any[] = [];
  for (const q of questions) {
    const hash = contentHash(q as QuestionShape);
    let hasIssue = false;
    let hasCritical = false;
    const issues = scanQuestion(q as QuestionShape);
    for (const issue of issues) {
      hasIssue = true;
      if (issue.severity === "CRITICAL") hasCritical = true;
      stats.issuesByRule[issue.ruleId] = (stats.issuesByRule[issue.ruleId] || 0) + 1;
      stats.issuesBySeverity[issue.severity]++;
      const key = `${q.id}:${issue.ruleId}:${hash}`;
      if (existingKeys.has(key)) continue;
      newIssues.push({
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

  // Insert new issues (use createMany; manual chunks for big inserts)
  for (let i = 0; i < newIssues.length; i += 500) {
    await prisma.questionQualityIssue.createMany({
      data: newIssues.slice(i, i + 500) as any,
      skipDuplicates: true,
    });
  }
  stats.insertedNew = newIssues.length;

  // Auto-archive critical
  let autoArchived = 0;
  if (autoArchive && stats.criticalQuestionIds.length > 0) {
    const r = await prisma.question.updateMany({
      where: { id: { in: stats.criticalQuestionIds }, status: "APPROVED" },
      data: { status: "DRAFT" },
    });
    autoArchived = r.count;
  }

  // Health report
  const today = new Date().toISOString().slice(0, 10);
  const approved = questions.filter(q => q.status === "APPROVED").length;
  const draft = questions.filter(q => q.status === "DRAFT").length;
  const archived = questions.filter(q => q.status === "ARCHIVED").length;
  const weight = stats.issuesBySeverity.CRITICAL * 10 + stats.issuesBySeverity.HIGH * 5
               + stats.issuesBySeverity.MEDIUM * 2 + stats.issuesBySeverity.LOW * 1;
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - (weight / questions.length) * 100)));

  await prisma.qualityHealthReport.upsert({
    where: { periodType_period: { periodType: "daily", period: today } },
    create: {
      periodType: "daily", period: today,
      totalQuestions: questions.length,
      approvedCount: approved, draftCount: draft, archivedCount: archived,
      openIssueCount: stats.questionsWithIssues, healthScore,
      summary: { byRule: stats.issuesByRule, bySeverity: stats.issuesBySeverity } as any,
    },
    update: {
      totalQuestions: questions.length,
      approvedCount: approved, draftCount: draft, archivedCount: archived,
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
