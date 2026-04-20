/**
 * Submit a single-word review result.
 *
 * POST { sessionId?, wordId, result: again|hard|good|easy, correct?: boolean, timeSpentSec?: number }
 *
 * Updates SM-2 progress and appends to session stats if sessionId provided.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextSm2, isMastered } from "@/lib/vocab/sm2";

const schema = z.object({
  sessionId: z.string().optional(),
  wordId: z.string().min(1),
  result: z.enum(["again", "hard", "good", "easy"]),
  correct: z.boolean().optional(),
  timeSpentSec: z.number().int().min(0).max(600).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const { sessionId, wordId, result, correct, timeSpentSec } = parsed.data;
  const userId = session.user.id;

  const word = await prisma.vocabularyWord.findUnique({ where: { id: wordId }, select: { id: true } });
  if (!word) return NextResponse.json({ error: "word not found" }, { status: 404 });

  const existing = await prisma.userVocabProgress.findUnique({
    where: { userId_wordId: { userId, wordId } },
  });

  const base = existing ?? { repetition: 0, easiness: 2.5, interval: 1 };
  const sm2 = nextSm2(base, result);
  const mastered = isMastered(sm2);
  const wasCorrect = correct ?? (result === "good" || result === "easy");

  const progress = await prisma.userVocabProgress.upsert({
    where: { userId_wordId: { userId, wordId } },
    update: {
      repetition: sm2.repetition,
      easiness: sm2.easiness,
      interval: sm2.interval,
      nextReview: sm2.nextReview,
      lastResult: sm2.lastResult,
      seenCount: { increment: 1 },
      correctCount: wasCorrect ? { increment: 1 } : undefined,
      mastered,
    },
    create: {
      userId,
      wordId,
      repetition: sm2.repetition,
      easiness: sm2.easiness,
      interval: sm2.interval,
      nextReview: sm2.nextReview,
      lastResult: sm2.lastResult,
      seenCount: 1,
      correctCount: wasCorrect ? 1 : 0,
      mastered,
    },
  });

  if (sessionId) {
    await prisma.vocabSession.update({
      where: { id: sessionId },
      data: {
        correctCount: wasCorrect ? { increment: 1 } : undefined,
        timeSpentSec: timeSpentSec ? { increment: timeSpentSec } : undefined,
      },
    }).catch(() => null); // session ownership is implicit via cards already served
  }

  return NextResponse.json({
    ok: true,
    nextReview: progress.nextReview.toISOString(),
    interval: progress.interval,
    repetition: progress.repetition,
    mastered: progress.mastered,
  });
}
