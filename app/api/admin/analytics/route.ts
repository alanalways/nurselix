import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  // Domain error rates (only APPROVED questions with >0 attempts)
  //
  // Memory note: the previous version pulled every APPROVED question with
  // attempts > 0 into memory just to sum/group by domain and slice top-10
  // hardest. With 14k+ rows that OOM'd on Zeabur. We now use SQL groupBy for
  // the domain aggregates and a narrow findMany (orderBy errorRate desc, take 10)
  // for the weakest list, so the heavy work stays in Postgres.
  const grouped = await prisma.question.groupBy({
    by: ["domain"],
    where: { status: "APPROVED", attemptCount: { gt: 0 } },
    _sum: { attemptCount: true, correctCount: true },
    _count: { _all: true },
  });

  type GroupRow = {
    domain: string | null;
    _sum: { attemptCount: number | null; correctCount: number | null };
    _count: { _all: number };
  };

  const domainBreakdown = (grouped as unknown as GroupRow[])
    .map((g) => {
      const attempts = g._sum.attemptCount ?? 0;
      const correct = g._sum.correctCount ?? 0;
      const items = g._count._all ?? 0;
      return {
        domain: g.domain ?? "未分類",
        attempts,
        correct,
        items,
        errorRate: attempts > 0 ? Math.round(((attempts - correct) / attempts) * 100) : 0,
      };
    })
    .sort((a: { errorRate: number }, b: { errorRate: number }) => b.errorRate - a.errorRate);

  // Top 10 hardest questions (highest error rate, minimum 5 attempts).
  // Question.errorRate is maintained by the error-rate-recompute cron job, so
  // we can sort on it directly in SQL and only ship 10 rows back.
  const weakestRaw = await prisma.question.findMany({
    where: { status: "APPROVED", attemptCount: { gte: 5 } },
    orderBy: [{ errorRate: "desc" }, { attemptCount: "desc" }],
    take: 10,
    select: { id: true, stem: true, domain: true, difficulty: true, attemptCount: true, correctCount: true },
  });
  const weakestQuestions = weakestRaw.map((q: {
    id: string; stem: string; domain: string | null; difficulty: string;
    attemptCount: number; correctCount: number;
  }) => ({
    id: q.id,
    stem: q.stem.substring(0, 120),
    domain: q.domain,
    difficulty: q.difficulty,
    attempts: q.attemptCount,
    correct: q.correctCount,
    errorRate: q.attemptCount > 0
      ? Math.round(((q.attemptCount - q.correctCount) / q.attemptCount) * 100)
      : 0,
  }));

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

  // API Cost: last 30 days aggregated by day
  const apiLogs = await prisma.apiUsageLog.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true, model: true, costUsd: true, inputTokens: true, outputTokens: true, purpose: true },
  });

  const apiByDate: Record<string, { costUsd: number; calls: number }> = {};
  let totalCostUsd = 0;
  let totalCalls = 0;
  const costByModel: Record<string, number> = {};
  for (const log of apiLogs) {
    const key = log.createdAt.toISOString().substring(0, 10);
    if (!apiByDate[key]) apiByDate[key] = { costUsd: 0, calls: 0 };
    apiByDate[key].costUsd += log.costUsd;
    apiByDate[key].calls += 1;
    totalCostUsd += log.costUsd;
    totalCalls += 1;
    costByModel[log.model] = (costByModel[log.model] ?? 0) + log.costUsd;
  }

  const apiDaily: { date: string; costUsd: number; calls: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    d.setUTCHours(0, 0, 0, 0);
    const key = d.toISOString().substring(0, 10);
    apiDaily.push({ date: key, costUsd: apiByDate[key]?.costUsd ?? 0, calls: apiByDate[key]?.calls ?? 0 });
  }

  return NextResponse.json({
    domainBreakdown,
    weakestQuestions,
    mauDaily,
    apiCost: {
      daily: apiDaily,
      totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
      totalCostTwd: Math.round(totalCostUsd * 32 * 10) / 10,
      totalCalls,
      byModel: Object.entries(costByModel).map(([model, cost]) => ({ model, costUsd: Math.round(cost * 10000) / 10000 })),
    },
  });
}
