/**
 * Achievement auto-awarding logic.
 *
 * Called whenever a user submits an answer or finishes a session. Each rule
 * does its own DB query, so calls are kept cheap by short-circuiting on known
 * non-qualifying totals.
 */

import { prisma } from "@/lib/prisma";

const KEYS = {
  STREAK_3: "streak_3",
  STREAK_7: "streak_7",
  STREAK_30: "streak_30",
  STREAK_100: "streak_100",
  PHARMA_MASTER: "pharma_master",
  SPEED_STAR: "speed_star",
  PERFECTIONIST: "perfectionist",
  FIRST_HUNDRED: "first_hundred",
  FIRST_THOUSAND: "first_thousand",
  FIRST_ASSESSMENT: "first_assessment",
  FIRST_CAT_PASS: "first_cat_pass",
} as const;

async function awardByKey(userId: string, key: string) {
  try {
    const achievement = await prisma.achievement.findUnique({ where: { key } });
    if (!achievement) return false;
    const result = await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: achievement.id } },
      update: {},
      create: { userId, achievementId: achievement.id },
    });
    return !!result;
  } catch {
    return false;
  }
}

/**
 * Evaluate + award all known rules after a single answer has been submitted.
 * Non-fatal: errors are logged but never rethrown.
 */
export async function evaluateAfterAnswer(userId: string): Promise<string[]> {
  const awarded: string[] = [];

  try {
    const [totalAnswers, stats] = await Promise.all([
      prisma.userAnswer.count({ where: { userId } }),
      prisma.userDailyStats.aggregate({
        where: { userId },
        _sum: { questionsDone: true, correctCount: true, timeSpentMin: true },
      }),
    ]);

    // Lifetime counters
    if (totalAnswers >= 100 && await awardByKey(userId, KEYS.FIRST_HUNDRED)) awarded.push(KEYS.FIRST_HUNDRED);
    if (totalAnswers >= 1000 && await awardByKey(userId, KEYS.FIRST_THOUSAND)) awarded.push(KEYS.FIRST_THOUSAND);

    // Speed star — >= 30 questions and avg < 30 sec/question
    if (totalAnswers >= 30) {
      const totalMinutes = stats._sum.timeSpentMin ?? 0;
      const totalSec = totalMinutes * 60;
      if (totalSec > 0 && totalSec / totalAnswers < 30) {
        if (await awardByKey(userId, KEYS.SPEED_STAR)) awarded.push(KEYS.SPEED_STAR);
      }
    }

    // Pharma master — >= 30 pharma answers with accuracy > 80%
    const pharmaStats = await prisma.userAnswer.aggregate({
      where: { userId, question: { domain: "Pharmacological & Parenteral" } },
      _count: true,
    });
    if (pharmaStats._count >= 30) {
      const correctCount = await prisma.userAnswer.count({
        where: { userId, isCorrect: true, question: { domain: "Pharmacological & Parenteral" } },
      });
      if (correctCount / pharmaStats._count >= 0.8) {
        if (await awardByKey(userId, KEYS.PHARMA_MASTER)) awarded.push(KEYS.PHARMA_MASTER);
      }
    }

    // Streak awards
    const streak = await computeStreak(userId);
    if (streak >= 3 && await awardByKey(userId, KEYS.STREAK_3)) awarded.push(KEYS.STREAK_3);
    if (streak >= 7 && await awardByKey(userId, KEYS.STREAK_7)) awarded.push(KEYS.STREAK_7);
    if (streak >= 30 && await awardByKey(userId, KEYS.STREAK_30)) awarded.push(KEYS.STREAK_30);
    if (streak >= 100 && await awardByKey(userId, KEYS.STREAK_100)) awarded.push(KEYS.STREAK_100);
  } catch (err) {
    console.warn("[achievements] evaluateAfterAnswer failed:", err instanceof Error ? err.message : err);
  }

  return awarded;
}

/** Award session-finish based achievements (first assessment, first cat pass, perfectionist). */
export async function evaluateAfterSession(userId: string, sessionId: string): Promise<string[]> {
  const awarded: string[] = [];
  try {
    const session = await prisma.userSession.findUnique({
      where: { id: sessionId },
      select: { mode: true, passFail: true, totalQuestions: true, correctCount: true },
    });
    if (!session) return awarded;

    if (session.mode === "ASSESSMENT") {
      if (await awardByKey(userId, KEYS.FIRST_ASSESSMENT)) awarded.push(KEYS.FIRST_ASSESSMENT);
    }
    if ((session.mode === "CAT" || session.mode === "MOCK" || session.mode === "MINI_CAT") && session.passFail === "PASS") {
      if (await awardByKey(userId, KEYS.FIRST_CAT_PASS)) awarded.push(KEYS.FIRST_CAT_PASS);
    }
    // Perfectionist — >=10 answered and 100% correct
    if (session.totalQuestions >= 10 && session.correctCount === session.totalQuestions) {
      if (await awardByKey(userId, KEYS.PERFECTIONIST)) awarded.push(KEYS.PERFECTIONIST);
    }
  } catch (err) {
    console.warn("[achievements] evaluateAfterSession failed:", err instanceof Error ? err.message : err);
  }
  return awarded;
}

async function computeStreak(userId: string): Promise<number> {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const last100 = new Date(todayStart);
  last100.setUTCDate(last100.getUTCDate() - 99);

  const rows = await prisma.userDailyStats.findMany({
    where: { userId, statDate: { gte: last100 }, questionsDone: { gt: 0 } },
    select: { statDate: true },
    orderBy: { statDate: "desc" },
  });

  const set = new Set(rows.map((r) => r.statDate.toISOString().substring(0, 10)));
  let streak = 0;
  for (let i = 0; i < 100; i++) {
    const d = new Date(todayStart);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().substring(0, 10);
    if (set.has(key)) {
      streak++;
    } else if (i === 0) {
      // today not yet logged — skip, check yesterday onwards
      continue;
    } else {
      break;
    }
  }
  return streak;
}
