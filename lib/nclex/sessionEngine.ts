/**
 * Session engine — coordinates Prisma with the IRT / CAT libraries.
 *
 * All stateful logic for NCLEX sessions lives here so API routes stay thin.
 */

import { prisma } from "@/lib/prisma";
import { estimateTheta, shouldStop } from "@/lib/irt/calculator";
import { updateSM2 } from "@/lib/irt/sm2";
import {
  selectNextQuestion,
  selectSeedQuestion,
  isAnswerCorrect,
  gradePartialCredit,
  CATEGORY_TO_DOMAIN,
  type CandidateQuestion,
} from "@/lib/irt/cat";
import { evaluateAfterAnswer, evaluateAfterSession } from "@/lib/nclex/achievements";
import type { QuestionPayload } from "@/types";

// ============================================================================
// Types
// ============================================================================

export type NclexMode =
  | "CAT"
  | "PRACTICE"
  | "TUTOR"
  | "MOCK"
  | "REVIEW"
  | "ASSESSMENT"
  | "MINI_CAT"
  | "ERROR_CHALLENGE";

export interface CreateSessionInput {
  userId: string;
  mode: NclexMode;
  targetCount?: number;
  timeLimitSec?: number;
  domainFilter?: string[];
  difficultyFilter?: ("EASY" | "MEDIUM" | "HARD")[];
  isAssessment?: boolean;
}

export interface NextQuestionResult {
  question: QuestionPayload | null;
  finished: boolean;
  stopReason?: string;
  progress: {
    answered: number;
    target?: number;
    theta: number;
    se: number;
    totalTimeSec: number;
  };
}

// ============================================================================
// Creation
// ============================================================================

export async function createSession(input: CreateSessionInput) {
  const {
    userId, mode, targetCount, timeLimitSec,
    domainFilter = [], difficultyFilter = [], isAssessment = false,
  } = input;

  // Reject if the user has an *active* (endedAt null) session of the same mode —
  // resuming is the right action.
  const existing = await prisma.userSession.findFirst({
    where: { userId, mode, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  if (existing) return existing;

  const session = await prisma.userSession.create({
    data: {
      userId,
      mode,
      isAssessment: isAssessment || mode === "ASSESSMENT",
      targetCount: targetCount ?? null,
      timeLimitSec: timeLimitSec ?? null,
      domainFilter,
      difficultyFilter,
    },
  });
  return session;
}

// ============================================================================
// Serialise Question to safe client payload (no answer / rationales leaked!)
// ============================================================================

export function toClientPayload(q: {
  id: string;
  questionType: string;
  stem: string;
  stemZh: string | null;
  scenarioEn: string | null;
  scenarioZh: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string | null;
  optionF: string | null;
  domain: string | null;
  difficulty: string;
  tags: string[];
}): QuestionPayload {
  return {
    id: q.id,
    questionType: q.questionType as QuestionPayload["questionType"],
    stem: q.stem,
    stemZh: q.stemZh,
    scenarioEn: q.scenarioEn,
    scenarioZh: q.scenarioZh,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    optionE: q.optionE,
    optionF: q.optionF,
    domain: q.domain,
    difficulty: q.difficulty as QuestionPayload["difficulty"],
    tags: q.tags,
  };
}

// ============================================================================
// Stop condition
// ============================================================================

export function computeStop(session: {
  mode: string;
  theta: number;
  se: number;
  totalQuestions: number;
  totalTimeSec: number;
  targetCount: number | null;
  timeLimitSec: number | null;
}): { stop: boolean; reason: string } {
  const { mode, theta, se, totalQuestions, totalTimeSec, targetCount, timeLimitSec } = session;

  if (mode === "CAT") {
    return shouldStop({ theta, se, answeredCount: totalQuestions, timeElapsedSec: totalTimeSec, mode: "cat" });
  }
  if (mode === "ASSESSMENT") {
    return shouldStop({ theta, se, answeredCount: totalQuestions, timeElapsedSec: totalTimeSec, mode: "assessment" });
  }
  if (mode === "MINI_CAT") {
    return shouldStop({ theta, se, answeredCount: totalQuestions, timeElapsedSec: totalTimeSec, mode: "mini_cat" });
  }

  // Non-adaptive modes: simple counters
  if (targetCount && totalQuestions >= targetCount) return { stop: true, reason: "target_reached" };
  if (timeLimitSec && totalTimeSec >= timeLimitSec) return { stop: true, reason: "time_limit" };
  return { stop: false, reason: "" };
}

// ============================================================================
// Fetch candidate pool
// ============================================================================

interface CandidateQuery {
  mode: NclexMode;
  userId: string;
  domainFilter: string[];
  difficultyFilter: ("EASY" | "MEDIUM" | "HARD")[];
  excludeIds: string[];
}

async function fetchCandidates(q: CandidateQuery, limit = 400): Promise<CandidateQuestion[]> {
  const where: Record<string, unknown> = {
    module: "NCLEX",
    status: "APPROVED",
  };
  if (q.domainFilter.length > 0) where.domain = { in: q.domainFilter };
  if (q.difficultyFilter.length > 0) where.difficulty = { in: q.difficultyFilter };
  if (q.excludeIds.length > 0) where.id = { notIn: q.excludeIds };

  const rows = await prisma.question.findMany({
    where,
    select: {
      id: true,
      domain: true,
      difficulty: true,
      irtA: true,
      irtB: true,
      irtC: true,
      caseStudySetId: true,
      caseStudyPosition: true,
    },
    take: limit,
    orderBy: { id: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    domain: r.domain,
    difficulty: r.difficulty as "EASY" | "MEDIUM" | "HARD",
    irtA: r.irtA,
    irtB: r.irtB,
    irtC: r.irtC,
    caseStudySetId: r.caseStudySetId,
    caseStudyPosition: r.caseStudyPosition,
  }));
}

// ============================================================================
// Pick next question
// ============================================================================

export async function getNextQuestionForSession(sessionId: string, userId: string): Promise<NextQuestionResult> {
  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) {
    return {
      question: null,
      finished: true,
      stopReason: "not_found",
      progress: { answered: 0, theta: 0, se: 1, totalTimeSec: 0 },
    };
  }

  // Already finished?
  if (session.endedAt) {
    return {
      question: null,
      finished: true,
      stopReason: session.stopReason ?? "already_ended",
      progress: {
        answered: session.totalQuestions,
        target: session.targetCount ?? undefined,
        theta: session.theta,
        se: session.se,
        totalTimeSec: session.totalTimeSec,
      },
    };
  }

  // Check stop criteria first
  const stop = computeStop({
    mode: session.mode,
    theta: session.theta,
    se: session.se,
    totalQuestions: session.totalQuestions,
    totalTimeSec: session.totalTimeSec,
    targetCount: session.targetCount,
    timeLimitSec: session.timeLimitSec,
  });
  if (stop.stop) {
    return {
      question: null,
      finished: true,
      stopReason: stop.reason,
      progress: {
        answered: session.totalQuestions,
        target: session.targetCount ?? undefined,
        theta: session.theta,
        se: session.se,
        totalTimeSec: session.totalTimeSec,
      },
    };
  }

  // Build candidate pool (larger pool for adaptive modes)
  const poolSize = session.mode === "PRACTICE" || session.mode === "TUTOR" ? 300 : 500;
  const candidates = await fetchCandidates({
    mode: session.mode as NclexMode,
    userId,
    domainFilter: session.domainFilter,
    difficultyFilter: session.difficultyFilter as ("EASY" | "MEDIUM" | "HARD")[],
    excludeIds: session.questionIds,
  }, poolSize);

  if (candidates.length === 0) {
    return {
      question: null,
      finished: true,
      stopReason: "out_of_questions",
      progress: {
        answered: session.totalQuestions,
        target: session.targetCount ?? undefined,
        theta: session.theta,
        se: session.se,
        totalTimeSec: session.totalTimeSec,
      },
    };
  }

  // Build domain counts from served questions (for balancing)
  const domainCounts: Record<string, number> = {};
  if (session.questionIds.length > 0) {
    const served = await prisma.question.findMany({
      where: { id: { in: session.questionIds } },
      select: { domain: true },
    });
    for (const s of served) {
      if (s.domain) domainCounts[s.domain] = (domainCounts[s.domain] ?? 0) + 1;
    }
  }

  const state = {
    theta: session.theta,
    answeredIds: session.questionIds,
    domainCounts,
  };

  // Adaptive modes: seed coverage of 8 domains first, then info-max
  const isAdaptive = ["CAT", "ASSESSMENT", "MINI_CAT"].includes(session.mode);
  let picked: CandidateQuestion | null = null;

  if (isAdaptive && session.totalQuestions < 8) {
    picked = selectSeedQuestion(candidates, state);
  }
  if (!picked) {
    picked = selectNextQuestion(candidates, state, {
      topK: isAdaptive ? 3 : 8,
      jitter: isAdaptive ? 0.05 : 0.15,
    });
  }

  if (!picked) {
    return {
      question: null,
      finished: true,
      stopReason: "no_match",
      progress: {
        answered: session.totalQuestions,
        target: session.targetCount ?? undefined,
        theta: session.theta,
        se: session.se,
        totalTimeSec: session.totalTimeSec,
      },
    };
  }

  // Load full question for payload
  const full = await prisma.question.findUnique({ where: { id: picked.id } });
  if (!full) {
    return {
      question: null,
      finished: true,
      stopReason: "data_error",
      progress: {
        answered: session.totalQuestions,
        target: session.targetCount ?? undefined,
        theta: session.theta,
        se: session.se,
        totalTimeSec: session.totalTimeSec,
      },
    };
  }

  // Append to served list (atomic)
  await prisma.userSession.update({
    where: { id: session.id },
    data: { questionIds: { push: picked.id } },
  });

  return {
    question: toClientPayload(full),
    finished: false,
    progress: {
      answered: session.totalQuestions,
      target: session.targetCount ?? undefined,
      theta: session.theta,
      se: session.se,
      totalTimeSec: session.totalTimeSec,
    },
  };
}

// ============================================================================
// Submit answer
// ============================================================================

export interface SubmitAnswerInput {
  sessionId: string;
  userId: string;
  questionId: string;
  selectedAnswer: string;      // "A" or "B,C,E"
  timeSpentSec: number;
}

export interface SubmitAnswerResult {
  accepted: boolean;
  isCorrect: boolean;
  score: number;          // 0..1
  correctAnswer: string;
  correctAnswers: string[];
  explanationZh: string;
  explanationEn: string | null;
  usTwDifference: string | null;
  optionRationales: Record<string, { en?: string; zh?: string }> | null;
  progress: {
    answered: number;
    correct: number;
    theta: number;
    se: number;
  };
}

export async function submitAnswer(input: SubmitAnswerInput): Promise<SubmitAnswerResult | null> {
  const session = await prisma.userSession.findUnique({ where: { id: input.sessionId } });
  if (!session || session.userId !== input.userId || session.endedAt) return null;

  const q = await prisma.question.findUnique({ where: { id: input.questionId } });
  if (!q) return null;

  const correct = isAnswerCorrect(
    q.questionType,
    q.correctAnswer,
    q.correctAnswers,
    input.selectedAnswer,
  );
  const score = gradePartialCredit(q.questionType, q.correctAnswer, q.correctAnswers, input.selectedAnswer);

  // Re-estimate theta from history (only for adaptive modes, but always safe to run)
  // Fetch existing answers with IRT params
  const history = await prisma.userAnswer.findMany({
    where: { sessionId: session.id },
    include: { question: { select: { irtA: true, irtB: true, irtC: true, questionType: true, correctAnswer: true, correctAnswers: true } } },
    orderBy: { answeredAt: "asc" },
  });

  const all = [
    ...history.map((h) => ({
      a: h.question.irtA ?? 1.0,
      b: h.question.irtB ?? 0.0,
      c: h.question.irtC ?? 0.2,
      isCorrect: !!h.isCorrect,
    })),
    {
      a: q.irtA ?? 1.0,
      b: q.irtB ?? 0.0,
      c: q.irtC ?? 0.2,
      isCorrect: correct,
    },
  ];

  const { theta: newTheta, se: newSe } = estimateTheta(all);

  // Write UserAnswer and update session counters in one transaction
  await prisma.$transaction(async (tx) => {
    await tx.userAnswer.create({
      data: {
        sessionId: session.id,
        userId: session.userId,
        questionId: q.id,
        selectedAnswer: input.selectedAnswer,
        isCorrect: correct,
        timeSpentSec: Math.max(0, input.timeSpentSec),
        thetaBefore: session.theta,
        thetaAfter: newTheta,
        seAfter: newSe,
      },
    });

    await tx.userSession.update({
      where: { id: session.id },
      data: {
        theta: newTheta,
        se: newSe,
        totalQuestions: { increment: 1 },
        correctCount: { increment: correct ? 1 : 0 },
        totalTimeSec: { increment: Math.max(0, input.timeSpentSec) },
      },
    });

    await tx.question.update({
      where: { id: q.id },
      data: {
        attemptCount: { increment: 1 },
        correctCount: { increment: correct ? 1 : 0 },
      },
    });
  });

  // Update error queue (outside transaction; not critical)
  await upsertErrorQueue(session.userId, q.id, correct).catch((err) => {
    console.warn("[sessionEngine] upsertErrorQueue failed:", err?.message);
  });

  // Update daily stats
  await upsertDailyStats(session.userId, correct, q.domain, input.timeSpentSec).catch((err) => {
    console.warn("[sessionEngine] upsertDailyStats failed:", err?.message);
  });

  // Evaluate achievements (non-critical)
  evaluateAfterAnswer(session.userId).catch((err) => {
    console.warn("[sessionEngine] evaluateAfterAnswer failed:", err?.message);
  });

  return {
    accepted: true,
    isCorrect: correct,
    score,
    correctAnswer: q.correctAnswer,
    correctAnswers: q.correctAnswers,
    explanationZh: q.explanationZh,
    explanationEn: q.explanationEn,
    usTwDifference: q.usTwDifference,
    optionRationales: q.optionRationales as SubmitAnswerResult["optionRationales"],
    progress: {
      answered: session.totalQuestions + 1,
      correct: session.correctCount + (correct ? 1 : 0),
      theta: newTheta,
      se: newSe,
    },
  };
}

// ============================================================================
// Error queue (SM-2)
// ============================================================================

async function upsertErrorQueue(userId: string, questionId: string, isCorrect: boolean) {
  const existing = await prisma.errorQuestion.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });

  if (isCorrect && !existing) return; // nothing to do

  if (!existing && !isCorrect) {
    // New wrong answer — start SM-2 at quality 2 (incorrect, easy memory)
    await prisma.errorQuestion.create({
      data: {
        userId,
        questionId,
        repetition: 0,
        easiness: 2.5,
        interval: 1,
        nextReview: new Date(),
        lastWrongAt: new Date(),
      },
    });
    return;
  }

  if (!existing) return;

  // Apply SM-2 update. Quality 4 for correct re-attempt, 2 for wrong.
  const quality = isCorrect ? 4 : 2;
  const updated = updateSM2(
    {
      repetition: existing.repetition,
      easiness: existing.easiness,
      interval: existing.interval,
    },
    quality,
  );
  await prisma.errorQuestion.update({
    where: { userId_questionId: { userId, questionId } },
    data: {
      repetition: updated.repetition,
      easiness: updated.easiness,
      interval: updated.interval,
      nextReview: updated.nextReview,
      lastWrongAt: isCorrect ? existing.lastWrongAt : new Date(),
    },
  });
}

// ============================================================================
// Daily stats
// ============================================================================

async function upsertDailyStats(
  userId: string,
  isCorrect: boolean,
  domain: string | null,
  timeSpentSec: number,
) {
  const today = new Date();
  const statDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  const existing = await prisma.userDailyStats.findUnique({
    where: { userId_statDate: { userId, statDate } },
  });

  const minutes = Math.max(0, Math.ceil(timeSpentSec / 60));

  if (!existing) {
    const domainStats: Record<string, { done: number; correct: number }> = {};
    if (domain) {
      domainStats[domain] = { done: 1, correct: isCorrect ? 1 : 0 };
    }
    await prisma.userDailyStats.create({
      data: {
        userId,
        statDate,
        questionsDone: 1,
        correctCount: isCorrect ? 1 : 0,
        timeSpentMin: minutes,
        domainStats,
      },
    });
    return;
  }

  // Merge domain stats
  const merged: Record<string, { done: number; correct: number }> = {
    ...((existing.domainStats as Record<string, { done: number; correct: number }>) ?? {}),
  };
  if (domain) {
    const prev = merged[domain] ?? { done: 0, correct: 0 };
    merged[domain] = {
      done: prev.done + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
    };
  }

  await prisma.userDailyStats.update({
    where: { userId_statDate: { userId, statDate } },
    data: {
      questionsDone: { increment: 1 },
      correctCount: { increment: isCorrect ? 1 : 0 },
      timeSpentMin: { increment: minutes },
      domainStats: merged,
    },
  });
}

// ============================================================================
// Finish / pause / resume
// ============================================================================

export async function finishSession(sessionId: string, userId: string, reason = "user_end") {
  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId) return null;
  if (session.endedAt) return session;

  // For CAT/MOCK/MINI_CAT/ASSESSMENT compute pass/fail (theta > 0 ≈ passing)
  let passFail: string | null = session.passFail;
  if (!passFail && ["CAT", "MOCK", "MINI_CAT", "ASSESSMENT"].includes(session.mode)) {
    passFail = session.theta >= 0 ? "PASS" : "FAIL";
  }

  const result = await prisma.userSession.update({
    where: { id: sessionId },
    data: {
      endedAt: new Date(),
      passFail,
      stopReason: reason,
      score: session.totalQuestions > 0 ? (session.correctCount / session.totalQuestions) * 100 : 0,
    },
  });

  // Evaluate session-finish achievements
  evaluateAfterSession(userId, sessionId).catch((err) => {
    console.warn("[sessionEngine] evaluateAfterSession failed:", err?.message);
  });

  return result;
}

export async function pauseSession(sessionId: string, userId: string) {
  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId || session.endedAt) return null;
  return prisma.userSession.update({
    where: { id: sessionId },
    data: { isPaused: true, pausedAt: new Date() },
  });
}

export async function resumeSession(sessionId: string, userId: string) {
  const session = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== userId || session.endedAt) return null;
  return prisma.userSession.update({
    where: { id: sessionId },
    data: { isPaused: false, pausedAt: null },
  });
}

// Re-export for convenience
export { CATEGORY_TO_DOMAIN };
