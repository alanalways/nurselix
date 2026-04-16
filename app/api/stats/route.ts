import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DomainStats = Record<string, { done: number; correct: number }>;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const last30 = new Date(todayStart);
  last30.setUTCDate(last30.getUTCDate() - 29);

  const [daily30, allTime, examDateRow, latestAssessment] = await Promise.all([
    prisma.userDailyStats.findMany({
      where: { userId, statDate: { gte: last30 } },
      orderBy: { statDate: "asc" },
    }),
    prisma.userDailyStats.aggregate({
      where: { userId },
      _sum: { questionsDone: true, correctCount: true, timeSpentMin: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { examDate: true, createdAt: true },
    }),
    prisma.userSession.findFirst({
      where: { userId, mode: "ASSESSMENT", endedAt: { not: null } },
      orderBy: { endedAt: "desc" },
      select: { theta: true, endedAt: true, score: true },
    }),
  ]);

  // Streak calculation: count back days that have questionsDone > 0
  let streak = 0;
  const dailyMap = new Map(daily30.map((d) => [d.statDate.toISOString().substring(0, 10), d]));
  for (let i = 0; i < 30; i++) {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().substring(0, 10);
    const stat = dailyMap.get(key);
    if (stat && stat.questionsDone > 0) streak++;
    else if (i === 0) continue; // today might be empty; don't break yet
    else break;
  }

  // Domain aggregate (across all time, last 60 days buffer)
  const aggregated: DomainStats = {};
  for (const d of daily30) {
    const domainData = d.domainStats as DomainStats;
    for (const key in domainData) {
      if (!aggregated[key]) aggregated[key] = { done: 0, correct: 0 };
      aggregated[key].done += domainData[key].done;
      aggregated[key].correct += domainData[key].correct;
    }
  }

  const domainArray = Object.entries(aggregated).map(([domain, v]) => ({
    domain,
    done: v.done,
    correct: v.correct,
    accuracy: v.done > 0 ? Math.round((v.correct / v.done) * 100) : 0,
  }));

  // Heatmap: last 30 days, per-day count
  const heatmap: { date: string; count: number; accuracy: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().substring(0, 10);
    const stat = dailyMap.get(key);
    heatmap.push({
      date: key,
      count: stat?.questionsDone ?? 0,
      accuracy: stat && stat.questionsDone > 0 ? Math.round((stat.correctCount / stat.questionsDone) * 100) : 0,
    });
  }

  // Exam countdown
  let daysToExam: number | null = null;
  if (examDateRow?.examDate) {
    const diff = examDateRow.examDate.getTime() - now.getTime();
    daysToExam = Math.max(0, Math.ceil(diff / (24 * 3600 * 1000)));
  }

  const totalQuestions = allTime._sum.questionsDone ?? 0;
  const totalCorrect = allTime._sum.correctCount ?? 0;
  const totalMinutes = allTime._sum.timeSpentMin ?? 0;

  return NextResponse.json({
    streak,
    totalQuestions,
    totalCorrect,
    totalMinutes,
    accuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    examDate: examDateRow?.examDate ?? null,
    daysToExam,
    assessmentTheta: latestAssessment?.theta ?? null,
    assessmentAt: latestAssessment?.endedAt ?? null,
    heatmap,
    domainBreakdown: domainArray,
  });
}
