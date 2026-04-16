import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { thetaToLabel } from "@/lib/irt/calculator";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.userSession.findUnique({
    where: { id: params.id },
    include: {
      answers: {
        include: {
          question: {
            select: {
              id: true, domain: true, difficulty: true, questionType: true,
              stem: true, stemZh: true, correctAnswer: true, correctAnswers: true,
              explanationZh: true, usTwDifference: true,
              optionA: true, optionB: true, optionC: true, optionD: true,
              optionE: true, optionF: true,
            },
          },
        },
        orderBy: { answeredAt: "asc" },
      },
    },
  });

  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Aggregate by domain
  const domainStats: Record<string, { correct: number; total: number }> = {};
  for (const a of row.answers) {
    const d = a.question.domain ?? "未分類";
    if (!domainStats[d]) domainStats[d] = { correct: 0, total: 0 };
    domainStats[d].total += 1;
    if (a.isCorrect) domainStats[d].correct += 1;
  }

  const label = thetaToLabel(row.theta);

  return NextResponse.json({
    session: {
      id: row.id,
      mode: row.mode,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      theta: row.theta,
      se: row.se,
      thetaLabel: label,
      totalQuestions: row.totalQuestions,
      correctCount: row.correctCount,
      totalTimeSec: row.totalTimeSec,
      passFail: row.passFail,
      score: row.score,
      stopReason: row.stopReason,
      targetCount: row.targetCount,
    },
    domainStats: Object.entries(domainStats).map(([domain, v]) => ({
      domain,
      correct: v.correct,
      total: v.total,
    })),
    answers: row.answers.map((a) => ({
      questionId: a.questionId,
      domain: a.question.domain,
      difficulty: a.question.difficulty,
      questionType: a.question.questionType,
      selectedAnswer: a.selectedAnswer,
      correctAnswer: a.question.correctAnswer,
      isCorrect: a.isCorrect,
      timeSpentSec: a.timeSpentSec,
    })),
  });
}
