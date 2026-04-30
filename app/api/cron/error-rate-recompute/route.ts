/**
 * GET /api/cron/error-rate-recompute
 *
 * Daily: recomputes Question.errorRate from attemptCount/correctCount,
 * then auto-flags suspicious questions (high error rate + enough attempts)
 * with a `stat.high_error_rate` QuestionQualityIssue.
 *
 * Triggered by .github/workflows/cron-error-rate-recompute.yml at 05:00 UTC.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { contentHash, type QuestionShape } from "@/lib/quality/rules";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const start = Date.now();

  // 1) Recompute errorRate. ROUND((1 - correctCount/attemptCount) * 100)
  const recomputed = await prisma.$executeRaw`
    UPDATE "Question"
    SET "errorRate" = ROUND((1.0 - ("correctCount"::numeric / "attemptCount")) * 100)
    WHERE "attemptCount" > 0
  `;

  // 2) Find suspicious questions to auto-flag.
  //    errorRate >= 80 AND attemptCount >= 30 AND status = 'APPROVED' AND difficulty != 'HARD'
  //
  // Memory note: this route only needs the contentHash inputs (stem, options A-F,
  // correctAnswer, explanationZh) plus the stat fields used to build issue.detail.
  // The previous select also pulled stemZh / explanationEn / optionRationales /
  // correctAnswers / module / questionType / difficulty / status — none of which
  // are read below, but they include large text columns that bloat memory on
  // Zeabur. Trimmed to the minimum that contentHash() and the issue payload need.
  const suspicious = await prisma.question.findMany({
    where: {
      errorRate: { gte: 80 },
      attemptCount: { gte: 30 },
      status: "APPROVED",
      difficulty: { not: "HARD" },
    },
    select: {
      id: true,
      stem: true,
      optionA: true, optionB: true, optionC: true, optionD: true,
      optionE: true, optionF: true,
      correctAnswer: true,
      explanationZh: true,
      attemptCount: true, correctCount: true, errorRate: true,
    },
  });

  const RULE_ID = "stat.high_error_rate";

  // Skip rows that already have an open issue with the same content hash
  // (createMany skipDuplicates would also catch DB-level unique conflicts,
  // but pre-filtering keeps the payload small and lets us count correctly).
  const existing = await prisma.questionQualityIssue.findMany({
    where: {
      ruleId: RULE_ID,
      status: "OPEN",
      questionId: { in: suspicious.map((q: { id: string }) => q.id) },
    },
    select: { questionId: true, contentHash: true },
  });
  const existingKeys = new Set(
    existing.map((e: { questionId: string; contentHash: string | null }) =>
      `${e.questionId}:${e.contentHash || ""}`),
  );

  const newIssues: any[] = [];
  for (const q of suspicious) {
    const hash = contentHash(q as QuestionShape);
    const key = `${q.id}:${hash}`;
    if (existingKeys.has(key)) continue;
    const errorRate = q.errorRate ?? 0;
    const attemptCount = q.attemptCount ?? 0;
    const correctCount = q.correctCount ?? 0;
    newIssues.push({
      questionId: q.id,
      ruleId: RULE_ID,
      severity: "HIGH",
      detail: `錯誤率 ${errorRate}% （n=${attemptCount}），可能題目本身有問題`,
      meta: { errorRate, attemptCount, correctCount, autoFlagged: true } as any,
      contentHash: hash,
    });
  }

  // 3) Insert new issues in chunks; skipDuplicates guards against unique conflicts.
  for (let i = 0; i < newIssues.length; i += 500) {
    await prisma.questionQualityIssue.createMany({
      data: newIssues.slice(i, i + 500) as any,
      skipDuplicates: true,
    });
  }

  // 4) Total open `stat.high_error_rate` issues currently in DB.
  const flaggedTotal = await prisma.questionQualityIssue.count({
    where: { ruleId: RULE_ID, status: "OPEN" },
  });

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - start,
    stats: {
      recomputed,
      flaggedNew: newIssues.length,
      flaggedTotal,
    },
  });
}
