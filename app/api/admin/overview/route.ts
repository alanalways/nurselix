import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  // Time anchors
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  const thirtyDaysAgo = new Date(todayStart);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
  const sevenDaysAgoTs = new Date(now);
  sevenDaysAgoTs.setUTCDate(sevenDaysAgoTs.getUTCDate() - 7);

  const [
    totalUsers,
    newUsersThisWeek,
    totalQuestions,
    questionsByStatus,
    todayAnswers,
    yesterdayAnswers,
    dauTodayRow,
    last7Stats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgoTs } } }),
    prisma.question.count(),
    prisma.question.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.userAnswer.count({ where: { answeredAt: { gte: todayStart } } }),
    prisma.userAnswer.count({
      where: {
        answeredAt: {
          gte: new Date(todayStart.getTime() - 86400_000),
          lt: todayStart,
        },
      },
    }),
    prisma.userDailyStats.findMany({
      where: { statDate: todayStart },
      select: { userId: true },
    }),
    prisma.userDailyStats.findMany({
      where: { statDate: { gte: sevenDaysAgo } },
      orderBy: { statDate: "asc" },
    }),
  ]);

  // Aggregate last7 stats per day
  const byDate: Record<string, { dau: number; questions: number }> = {};
  for (const row of last7Stats) {
    const key = row.statDate.toISOString().substring(0, 10);
    if (!byDate[key]) byDate[key] = { dau: 0, questions: 0 };
    byDate[key].dau += 1;
    byDate[key].questions += row.questionsDone;
  }

  const days: { date: string; dau: number; questions: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().substring(0, 10);
    days.push({
      date: key,
      dau: byDate[key]?.dau ?? 0,
      questions: byDate[key]?.questions ?? 0,
    });
  }

  const statusCounts: Record<string, number> = { APPROVED: 0, DRAFT: 0, ARCHIVED: 0 };
  for (const row of questionsByStatus) {
    statusCounts[row.status] = row._count;
  }

  return NextResponse.json({
    users: {
      total: totalUsers,
      newThisWeek: newUsersThisWeek,
    },
    questions: {
      total: totalQuestions,
      approved: statusCounts.APPROVED,
      draft: statusCounts.DRAFT,
      archived: statusCounts.ARCHIVED,
    },
    today: {
      dau: dauTodayRow.length,
      answers: todayAnswers,
      answersYesterday: yesterdayAnswers,
    },
    last7Days: days,
    _guardUser: guard.user?.email,
  });
}
