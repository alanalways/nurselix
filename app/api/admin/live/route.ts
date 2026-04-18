import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Live admin monitoring snapshot — refreshed by the dashboard every ~15s.
 *
 * "Online" = at least one answer in the last 5 minutes.
 * "Active session" = UserSession with endedAt IS NULL and a recent answer.
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [
    online5m,
    online15m,
    online1h,
    activeSessions,
    answersLastHour,
    answersToday,
    correctToday,
    newUsersToday,
    planMix,
    pendingReports,
    pendingFeedback,
    topUsersTodayRaw,
    domainTodayRaw,
  ] = await Promise.all([
    prisma.userAnswer.findMany({
      where: { answeredAt: { gte: fiveMinAgo } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userAnswer.findMany({
      where: { answeredAt: { gte: fifteenMinAgo } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userAnswer.findMany({
      where: { answeredAt: { gte: oneHourAgo } },
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.userSession.findMany({
      where: {
        endedAt: null,
        startedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        userId: true,
        mode: true,
        theta: true,
        totalQuestions: true,
        correctCount: true,
        startedAt: true,
        isPaused: true,
        user: { select: { name: true, email: true, plan: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
    prisma.userAnswer.count({ where: { answeredAt: { gte: oneHourAgo } } }),
    prisma.userAnswer.count({ where: { answeredAt: { gte: todayStart } } }),
    prisma.userAnswer.count({ where: { answeredAt: { gte: todayStart }, isCorrect: true } }),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.groupBy({ by: ["plan"], _count: true }),
    prisma.questionReport.count({ where: { status: "pending" } }).catch(() => 0),
    prisma.feedback.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } }).catch(() => 0),
    // Top 8 users today by answers count
    prisma.userAnswer.groupBy({
      by: ["userId"],
      where: { answeredAt: { gte: todayStart } },
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 8,
    }),
    // Domain mix today (raw question -> userAnswer requires join, do via raw)
    prisma.$queryRaw<{ domain: string | null; n: bigint; correct: bigint }[]>`
      SELECT q.domain AS domain,
             COUNT(*)::bigint AS n,
             SUM(CASE WHEN ua."isCorrect" THEN 1 ELSE 0 END)::bigint AS correct
      FROM "UserAnswer" ua
      JOIN "Question" q ON q.id = ua."questionId"
      WHERE ua."answeredAt" >= ${todayStart}
      GROUP BY q.domain
      ORDER BY n DESC
      LIMIT 12
    `.catch(() => []),
  ]);

  // Hydrate top users
  const topUserIds = topUsersTodayRaw.map((r) => r.userId);
  const topUsers = topUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: { id: true, name: true, email: true, plan: true },
      })
    : [];
  const topUserMap = new Map(topUsers.map((u) => [u.id, u]));

  // For each top user, get correct count today
  const correctByUser = topUserIds.length
    ? await prisma.userAnswer.groupBy({
        by: ["userId"],
        where: { answeredAt: { gte: todayStart }, userId: { in: topUserIds }, isCorrect: true },
        _count: true,
      })
    : [];
  const correctMap = new Map(correctByUser.map((r) => [r.userId, r._count]));

  const topUsersToday = topUsersTodayRaw.map((r) => ({
    userId: r.userId,
    name: topUserMap.get(r.userId)?.name ?? null,
    email: topUserMap.get(r.userId)?.email ?? null,
    plan: topUserMap.get(r.userId)?.plan ?? null,
    answers: r._count._all,
    correct: correctMap.get(r.userId) ?? 0,
  }));

  // Build session-mode breakdown
  const modeCounts: Record<string, number> = {};
  for (const s of activeSessions) {
    modeCounts[s.mode] = (modeCounts[s.mode] ?? 0) + 1;
  }

  // Plan mix
  const plans: Record<string, number> = { FREE: 0, BASIC: 0, PRO: 0, ELITE: 0 };
  for (const p of planMix) plans[p.plan] = p._count;

  return NextResponse.json({
    serverTime: now.toISOString(),
    online: {
      now: online5m.length,        // last 5 min
      last15m: online15m.length,
      last1h: online1h.length,
    },
    activity: {
      answersLastHour,
      answersToday,
      correctToday,
      accuracyToday: answersToday > 0 ? Math.round((correctToday / answersToday) * 1000) / 10 : null,
      newUsersToday,
    },
    activeSessions: activeSessions.map((s) => ({
      id: s.id,
      mode: s.mode,
      theta: s.theta,
      totalQuestions: s.totalQuestions,
      correctCount: s.correctCount,
      startedAt: s.startedAt.toISOString(),
      isPaused: s.isPaused,
      ageSec: Math.floor((now.getTime() - s.startedAt.getTime()) / 1000),
      user: {
        name: s.user.name,
        email: s.user.email,
        plan: s.user.plan,
      },
    })),
    sessionModeCounts: modeCounts,
    planMix: plans,
    topUsersToday,
    domainToday: domainTodayRaw.map((r) => ({
      domain: r.domain ?? "未分類",
      n: Number(r.n),
      correct: Number(r.correct),
      accuracy: Number(r.n) > 0 ? Math.round((Number(r.correct) / Number(r.n)) * 1000) / 10 : null,
    })),
    queues: {
      pendingReports,
      pendingFeedback,
    },
  });
}
