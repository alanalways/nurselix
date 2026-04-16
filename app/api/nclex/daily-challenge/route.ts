import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toClientPayload } from "@/lib/nclex/sessionEngine";
import { isAnswerCorrect } from "@/lib/irt/cat";

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** GET — today's challenge question */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = todayUtc();
  let challenge = await prisma.dailyChallenge.findUnique({ where: { date } });

  if (!challenge) {
    // Pick a deterministic-ish medium difficulty question for today
    const count = await prisma.question.count({
      where: { module: "NCLEX", status: "APPROVED", difficulty: "MEDIUM" },
    });
    if (count === 0) {
      return NextResponse.json({ error: "No questions available" }, { status: 503 });
    }
    const offset = Math.floor(Math.random() * count);
    const picked = await prisma.question.findMany({
      where: { module: "NCLEX", status: "APPROVED", difficulty: "MEDIUM" },
      skip: offset,
      take: 1,
      select: { id: true },
    });
    if (picked.length === 0) {
      return NextResponse.json({ error: "No questions available" }, { status: 503 });
    }
    challenge = await prisma.dailyChallenge.upsert({
      where: { date },
      create: { questionId: picked[0].id, date },
      update: {},
    });
  }

  const [question, myAttempt] = await Promise.all([
    prisma.question.findUnique({ where: { id: challenge.questionId } }),
    prisma.dailyChallengeAttempt.findUnique({
      where: { challengeId_userId: { challengeId: challenge.id, userId: session.user.id } },
    }),
  ]);

  if (!question) {
    return NextResponse.json({ error: "Question missing" }, { status: 503 });
  }

  return NextResponse.json({
    date: challenge.date,
    challengeId: challenge.id,
    question: toClientPayload(question),
    totalAttempts: challenge.totalAttempts,
    correctCount: challenge.correctCount,
    alreadyAttempted: !!myAttempt,
    myAttempt: myAttempt ? {
      selectedAnswer: myAttempt.selectedAnswer,
      isCorrect: myAttempt.isCorrect,
    } : null,
    // Only leak correctAnswer / explanation if already attempted
    ...(myAttempt && {
      correctAnswer: question.correctAnswer,
      correctAnswers: question.correctAnswers,
      explanationZh: question.explanationZh,
    }),
  });
}

const answerSchema = z.object({
  challengeId: z.string().min(1),
  selectedAnswer: z.string().min(1).max(20),
});

/** POST — submit today's answer */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { challengeId, selectedAnswer } = answerSchema.parse(body);

    const challenge = await prisma.dailyChallenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });

    const question = await prisma.question.findUnique({ where: { id: challenge.questionId } });
    if (!question) return NextResponse.json({ error: "Question missing" }, { status: 503 });

    const existing = await prisma.dailyChallengeAttempt.findUnique({
      where: { challengeId_userId: { challengeId: challenge.id, userId: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({
        error: "今日已答過",
        isCorrect: existing.isCorrect,
        selectedAnswer: existing.selectedAnswer,
      }, { status: 409 });
    }

    const correct = isAnswerCorrect(
      question.questionType,
      question.correctAnswer,
      question.correctAnswers,
      selectedAnswer.toUpperCase(),
    );

    await prisma.$transaction([
      prisma.dailyChallengeAttempt.create({
        data: {
          challengeId: challenge.id,
          userId: session.user.id,
          selectedAnswer: selectedAnswer.toUpperCase(),
          isCorrect: correct,
        },
      }),
      prisma.dailyChallenge.update({
        where: { id: challenge.id },
        data: {
          totalAttempts: { increment: 1 },
          correctCount: { increment: correct ? 1 : 0 },
        },
      }),
    ]);

    return NextResponse.json({
      isCorrect: correct,
      correctAnswer: question.correctAnswer,
      correctAnswers: question.correctAnswers,
      explanationZh: question.explanationZh,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("[daily-challenge POST]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
