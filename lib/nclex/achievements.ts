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
  SAFETY_MASTER: "safety_master",
  MANAGEMENT_MASTER: "management_master",
  PSYCHOSOCIAL_MASTER: "psychosocial_master",
  PHYSIOLOGICAL_MASTER: "physiological_master",
  SPEED_STAR: "speed_star",
  PERFECTIONIST: "perfectionist",
  FIRST_HUNDRED: "first_hundred",
  FIRST_THOUSAND: "first_thousand",
  TEN_THOUSAND: "ten_thousand",
  FIRST_SESSION: "first_session",
  FIRST_ASSESSMENT: "first_assessment",
  FIRST_CAT_PASS: "first_cat_pass",
  MOCK_PERFECT: "mock_perfect",
  CAT_MASTER: "cat_master",
  HERMES_FIRST: "hermes_first",
  HERMES_TEN: "hermes_ten",
  CONFIDENCE_STABLE: "confidence_stable",
  CONFIDENCE_HIGH: "confidence_high",
  THETA_1: "theta_1",
  THETA_2: "theta_2",
  ERROR_BUSTER_50: "error_buster_50",
} as const;

const DOMAIN_MASTER_MAP: Array<{ key: string; domain: string }> = [
  { key: KEYS.PHARMA_MASTER,        domain: "Pharmacological & Parenteral" },
  { key: KEYS.SAFETY_MASTER,        domain: "Safety & Infection Control" },
  { key: KEYS.MANAGEMENT_MASTER,    domain: "Management of Care" },
  { key: KEYS.PSYCHOSOCIAL_MASTER,  domain: "Psychosocial Integrity" },
  { key: KEYS.PHYSIOLOGICAL_MASTER, domain: "Physiological Adaptation" },
];

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
    if (totalAnswers >= 10000 && await awardByKey(userId, KEYS.TEN_THOUSAND)) awarded.push(KEYS.TEN_THOUSAND);

    // Speed star — >= 30 questions and avg < 30 sec/question
    if (totalAnswers >= 30) {
      const totalMinutes = stats._sum.timeSpentMin ?? 0;
      const totalSec = totalMinutes * 60;
      if (totalSec > 0 && totalSec / totalAnswers < 30) {
        if (await awardByKey(userId, KEYS.SPEED_STAR)) awarded.push(KEYS.SPEED_STAR);
      }
    }

    // Domain masters — >= 30 domain answers with accuracy >= 80%
    for (const { key, domain } of DOMAIN_MASTER_MAP) {
      const domainTotal = await prisma.userAnswer.count({
        where: { userId, question: { domain } },
      });
      if (domainTotal < 30) continue;
      const domainCorrect = await prisma.userAnswer.count({
        where: { userId, isCorrect: true, question: { domain } },
      });
      if (domainCorrect / domainTotal >= 0.8) {
        if (await awardByKey(userId, key)) awarded.push(key);
      }
    }

    // Error buster — answered ≥ 50 previously-wrong questions correctly after review
    const errorBusterCount = await prisma.userAnswer.count({
      where: {
        userId,
        isCorrect: true,
        question: { errorQuestions: { some: { userId } } },
      },
    });
    if (errorBusterCount >= 50 && await awardByKey(userId, KEYS.ERROR_BUSTER_50)) awarded.push(KEYS.ERROR_BUSTER_50);

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

    // First session
    const totalSessions = await prisma.userSession.count({ where: { userId, endedAt: { not: null } } });
    if (totalSessions >= 1 && await awardByKey(userId, KEYS.FIRST_SESSION)) awarded.push(KEYS.FIRST_SESSION);

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
    // Mock perfect — mock ≥ 90% accuracy
    if (session.mode === "MOCK" && session.totalQuestions >= 20) {
      if (session.correctCount / session.totalQuestions >= 0.9) {
        if (await awardByKey(userId, KEYS.MOCK_PERFECT)) awarded.push(KEYS.MOCK_PERFECT);
      }
    }
    // CAT master — completed ≥ 10 CAT sessions
    if (session.mode === "CAT" || session.mode === "MINI_CAT") {
      const catCount = await prisma.userSession.count({
        where: { userId, mode: { in: ["CAT", "MINI_CAT"] }, endedAt: { not: null } },
      });
      if (catCount >= 10 && await awardByKey(userId, KEYS.CAT_MASTER)) awarded.push(KEYS.CAT_MASTER);
    }
  } catch (err) {
    console.warn("[achievements] evaluateAfterSession failed:", err instanceof Error ? err.message : err);
  }
  return awarded;
}

/** Award Hermes + theta based achievements (called from orchestrator after each analysis). */
export async function evaluateAfterHermes(userId: string): Promise<string[]> {
  const awarded: string[] = [];
  try {
    const [profile, reportCount] = await Promise.all([
      prisma.learnerProfile.findUnique({
        where: { userId },
        select: { confidenceBand: true, thetaHistory: true, sessionsAnalysed: true },
      }),
      prisma.hermesReport.count({ where: { userId } }),
    ]);

    if (reportCount >= 1 && await awardByKey(userId, KEYS.HERMES_FIRST)) awarded.push(KEYS.HERMES_FIRST);
    if (reportCount >= 10 && await awardByKey(userId, KEYS.HERMES_TEN)) awarded.push(KEYS.HERMES_TEN);

    if (!profile) return awarded;

    // Confidence band achievements
    if (profile.confidenceBand === "stable" || profile.confidenceBand === "high") {
      if (await awardByKey(userId, KEYS.CONFIDENCE_STABLE)) awarded.push(KEYS.CONFIDENCE_STABLE);
    }
    if (profile.confidenceBand === "high") {
      if (await awardByKey(userId, KEYS.CONFIDENCE_HIGH)) awarded.push(KEYS.CONFIDENCE_HIGH);
    }

    // Theta milestones
    const latestTheta = profile.thetaHistory[profile.thetaHistory.length - 1];
    if (latestTheta !== undefined) {
      if (latestTheta >= 1 && await awardByKey(userId, KEYS.THETA_1)) awarded.push(KEYS.THETA_1);
      if (latestTheta >= 2 && await awardByKey(userId, KEYS.THETA_2)) awarded.push(KEYS.THETA_2);
    }
  } catch (err) {
    console.warn("[achievements] evaluateAfterHermes failed:", err instanceof Error ? err.message : err);
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
