/**
 * Hermes Orchestrator — runs the full analysis pipeline for one session.
 * Flow: fetch data → Analytics Agent (Haiku) → Teaching Agent (Sonnet) → persist
 */

import { prisma } from "@/lib/prisma";
import { runAnalyticsAgent, type SessionSnapshot } from "./analyticsAgent";
import { runTeachingAgent, type ProfileSnapshot } from "./teachingAgent";
import { calcCostUsd } from "@/lib/ai/costCalc";

export async function runHermesForSession(sessionId: string, userId: string): Promise<void> {
  // Mark job as running
  await prisma.hermesJob.updateMany({
    where: { sessionId, userId, status: "pending" },
    data: { status: "running", attempts: { increment: 1 } },
  });

  try {
    // 1. Fetch session + answers + question metadata
    const session = await prisma.userSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: {
          include: { question: { select: { domain: true, difficulty: true, questionType: true } } },
          orderBy: { answeredAt: "asc" },
        },
      },
    });

    if (!session || session.userId !== userId) throw new Error("session_not_found");

    // 2. Build SessionSnapshot for Analytics Agent
    const snapshot: SessionSnapshot = {
      mode: session.mode,
      totalQuestions: session.totalQuestions,
      correctCount: session.correctCount,
      answers: session.answers.map((a) => ({
        questionId: a.questionId,
        domain: a.question.domain,
        difficulty: a.question.difficulty,
        questionType: a.question.questionType,
        selectedAnswer: a.selectedAnswer,
        correctAnswer: "",   // not needed for pattern analysis
        isCorrect: a.isCorrect ?? false,
        timeSpentSec: a.timeSpentSec,
      })),
    };

    // 3. Fetch or create LearnerProfile
    const existing = await prisma.learnerProfile.findUnique({ where: { userId } });
    const profile: ProfileSnapshot = existing
      ? {
          domainMastery: (existing.domainMastery ?? {}) as Record<string, number>,
          topWeaknesses: existing.topWeaknesses,
          behaviorPatterns: (existing.behaviorPatterns ?? []) as string[],
          mistakeCounts: (existing.mistakeCounts ?? {}) as Record<string, number>,
          confidenceBand: existing.confidenceBand,
          recentTrend: existing.recentTrend,
          sessionsAnalysed: existing.sessionsAnalysed,
          thetaHistory: existing.thetaHistory,
        }
      : {
          domainMastery: {},
          topWeaknesses: [],
          behaviorPatterns: [],
          mistakeCounts: {},
          confidenceBand: "developing",
          recentTrend: "stable",
          sessionsAnalysed: 0,
          thetaHistory: [],
        };

    // 4. Run Analytics Agent (Haiku)
    const analytics = await runAnalyticsAgent(snapshot);

    // 5. Run Teaching Agent (Sonnet)
    const teaching = await runTeachingAgent(analytics, profile, session.theta);

    // 6. Compute updated domainMastery from this session's answers
    const domainMastery = { ...(profile.domainMastery as Record<string, number>) };
    const domainAccum: Record<string, { correct: number; total: number }> = {};
    for (const a of snapshot.answers) {
      const d = a.domain ?? "Unknown";
      if (!domainAccum[d]) domainAccum[d] = { correct: 0, total: 0 };
      domainAccum[d].total++;
      if (a.isCorrect) domainAccum[d].correct++;
    }
    for (const [d, { correct, total }] of Object.entries(domainAccum)) {
      // Exponential moving average (weight 0.3 on new session)
      const newRate = correct / total;
      domainMastery[d] = existing
        ? 0.7 * (domainMastery[d] ?? newRate) + 0.3 * newRate
        : newRate;
    }

    // Top weaknesses = top 3 mistake types by count
    const topWeaknesses = Object.entries(teaching.updatedMistakeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);

    const newThetaHistory = [...profile.thetaHistory.slice(-9), session.theta];

    // 7. Persist SessionDiagnosis
    await prisma.sessionDiagnosis.upsert({
      where: { sessionId },
      create: {
        sessionId,
        userId,
        mistakeTypes: analytics.mistakeTypes,
        weakDomains: analytics.weakDomains,
        rootCauses: analytics.rootCauses,
        keyInsight: analytics.keyInsight,
        severity: analytics.severity,
        analysed: true,
      },
      update: {
        mistakeTypes: analytics.mistakeTypes,
        weakDomains: analytics.weakDomains,
        rootCauses: analytics.rootCauses,
        keyInsight: analytics.keyInsight,
        severity: analytics.severity,
        analysed: true,
      },
    });

    // 8. Upsert LearnerProfile
    await prisma.learnerProfile.upsert({
      where: { userId },
      create: {
        userId,
        domainMastery,
        topWeaknesses,
        behaviorPatterns: teaching.updatedBehaviorPatterns,
        mistakeCounts: teaching.updatedMistakeCounts,
        confidenceBand: teaching.confidenceBand,
        recentTrend: teaching.recentTrend,
        insightSummary: teaching.insightSummary,
        nextActions: teaching.nextActions as unknown as object[],
        studyPlan: teaching.studyPlan as unknown as object[],
        thetaHistory: newThetaHistory,
        sessionsAnalysed: 1,
      },
      update: {
        domainMastery,
        topWeaknesses,
        behaviorPatterns: teaching.updatedBehaviorPatterns,
        mistakeCounts: teaching.updatedMistakeCounts,
        confidenceBand: teaching.confidenceBand,
        recentTrend: teaching.recentTrend,
        insightSummary: teaching.insightSummary,
        nextActions: teaching.nextActions as unknown as object[],
        studyPlan: teaching.studyPlan as unknown as object[],
        thetaHistory: newThetaHistory,
        sessionsAnalysed: { increment: 1 },
      },
    });

    // 9. Save HermesReport snapshot for history
    await prisma.hermesReport.create({
      data: {
        userId,
        sessionId,
        type: "session",
        insightSummary: teaching.insightSummary,
        nextActions: teaching.nextActions as unknown as object[],
        studyPlan: teaching.studyPlan as unknown as object[],
        keyInsight: analytics.keyInsight,
        rootCauses: analytics.rootCauses,
        mistakeTypes: analytics.mistakeTypes,
        weakDomains: analytics.weakDomains,
        confidenceBand: teaching.confidenceBand,
        recentTrend: teaching.recentTrend,
      },
    });

    // 10. Log API usage costs
    const analyticsModel = "claude-haiku-4-5-20251001";
    const teachingModel  = "claude-sonnet-4-6";
    if (analytics._usage) {
      await prisma.apiUsageLog.create({
        data: {
          userId,
          model: analyticsModel,
          inputTokens: analytics._usage.inputTokens,
          outputTokens: analytics._usage.outputTokens,
          cacheReadTokens: analytics._usage.cacheReadTokens,
          cacheWriteTokens: analytics._usage.cacheWriteTokens,
          purpose: "hermes_analytics",
          costUsd: calcCostUsd(analyticsModel, analytics._usage),
        },
      });
    }
    if (teaching._usage) {
      await prisma.apiUsageLog.create({
        data: {
          userId,
          model: teachingModel,
          inputTokens: teaching._usage.inputTokens,
          outputTokens: teaching._usage.outputTokens,
          cacheReadTokens: teaching._usage.cacheReadTokens,
          cacheWriteTokens: teaching._usage.cacheWriteTokens,
          purpose: "hermes_teaching",
          costUsd: calcCostUsd(teachingModel, teaching._usage),
        },
      });
    }

    // 11. Mark job done
    await prisma.hermesJob.updateMany({
      where: { sessionId, userId, status: "running" },
      data: { status: "done" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.hermesJob.updateMany({
      where: { sessionId, userId, status: "running" },
      data: { status: "failed", error: msg.slice(0, 500) },
    });
    throw err;
  }
}

/** Enqueue a Hermes job for a finished session (fire-and-forget). */
export async function enqueueHermesJob(sessionId: string, userId: string): Promise<void> {
  // Idempotent — skip if already queued/done
  const existing = await prisma.hermesJob.findFirst({
    where: { sessionId, userId, status: { in: ["pending", "running", "done"] } },
  });
  if (existing) return;

  await prisma.hermesJob.create({ data: { sessionId, userId } });

  // Fire-and-forget in process (Zeabur is serverless-like so this is best-effort)
  runHermesForSession(sessionId, userId).catch((err) => {
    console.warn("[Hermes] background job failed:", err?.message);
  });
}
