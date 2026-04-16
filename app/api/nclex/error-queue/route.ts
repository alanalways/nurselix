import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Returns the current user's error-review queue:
 *   - dueNow: items whose nextReview <= now
 *   - upcoming: next 50 items ordered by nextReview
 *   - totalErrors: lifetime count
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  const [dueNow, upcoming, totalErrors] = await Promise.all([
    prisma.errorQuestion.findMany({
      where: { userId: session.user.id, nextReview: { lte: now } },
      orderBy: { nextReview: "asc" },
      take: 100,
      include: {
        question: {
          select: {
            id: true, domain: true, difficulty: true, stem: true, stemZh: true, questionType: true,
          },
        },
      },
    }),
    prisma.errorQuestion.findMany({
      where: { userId: session.user.id, nextReview: { gt: now } },
      orderBy: { nextReview: "asc" },
      take: 50,
      include: {
        question: {
          select: {
            id: true, domain: true, difficulty: true, stem: true, stemZh: true, questionType: true,
          },
        },
      },
    }),
    prisma.errorQuestion.count({ where: { userId: session.user.id } }),
  ]);

  return NextResponse.json({
    totalErrors,
    dueNowCount: dueNow.length,
    dueNow: dueNow.map((e) => ({
      questionId: e.questionId,
      interval: e.interval,
      easiness: e.easiness,
      repetition: e.repetition,
      nextReview: e.nextReview,
      lastWrongAt: e.lastWrongAt,
      question: e.question,
    })),
    upcoming: upcoming.map((e) => ({
      questionId: e.questionId,
      nextReview: e.nextReview,
      interval: e.interval,
      question: e.question,
    })),
  });
}
