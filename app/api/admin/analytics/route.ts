import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  // Domain error rates (only APPROVED questions with >0 attempts)
  const questions = await prisma.question.findMany({
    where: { status: "APPROVED", attemptCount: { gt: 0 } },
    select: { id: true, domain: true, stem: true, attemptCount: true, correctCount: true, difficulty: true },
  });

  const domainStats: Record<string, { attempts: number; correct: number; items: number }> = {};
  for (const q of questions) {
    const key = q.domain ?? "未分類";
    if (!domainStats[key]) domainStats[key] = { attempts: 0, correct: 0, items: 0 };
    domainStats[key].attempts += q.attemptCount;
    domainStats[key].correct += q.correctCount;
    domainStats[key].items += 1;
  }

  const domainBreakdown = Object.entries(domainStats)
    .map(([domain, v]) => ({
      domain,
      attempts: v.attempts,
      correct: v.correct,
      items: v.items,
      errorRate: v.attempts > 0 ? Math.round(((v.attempts - v.correct) / v.attempts) * 100) : 0,
    }))
    .sort((a, b) => b.errorRate - a.errorRate);

  // Top 10 hardest questions (highest error rate, minimum 5 attempts)
  const weakestQuestions = questions
    .filter((q) => q.attemptCount >= 5)
    .map((q) => ({
      id: q.id,
      stem: q.stem.substring(0, 120),
      domain: q.domain,
      difficulty: q.difficulty,
      attempts: q.attemptCount,
      correct: q.correctCount,
      errorRate: Math.round(((q.attemptCount - q.correctCount) / q.attemptCount) * 100),
    }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 10);

  // MAU: last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  const mauRows = await prisma.userDailyStats.findMany({
    where: { statDate: { gte: thirtyDaysAgo } },
    select: { statDate: true, userId: true, questionsDone: true },
  });

  const byDate: Record<string, { users: Set<string>; questions: number }> = {};
  for (const r of mauRows) {
    const key = r.statDate.toISOString().substring(0, 10);
    if (!byDate[key]) byDate[key] = { users: new Set(), questions: 0 };
    byDate[key].users.add(r.userId);
    byDate[key].questions += r.questionsDone;
  }

  const mauDaily: { date: string; dau: number; questions: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    d.setUTCHours(0, 0, 0, 0);
    const key = d.toISOString().substring(0, 10);
    mauDaily.push({
      date: key,
      dau: byDate[key]?.users.size ?? 0,
      questions: byDate[key]?.questions ?? 0,
    });
  }

  return NextResponse.json({
    domainBreakdown,
    weakestQuestions,
    mauDaily,
  });
}
