import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();

  const [totalWords, learned, mastered, dueNow, byCategory, recent] = await Promise.all([
    prisma.vocabularyWord.count({ where: { status: "APPROVED" } }),
    prisma.userVocabProgress.count({ where: { userId } }),
    prisma.userVocabProgress.count({ where: { userId, mastered: true } }),
    prisma.userVocabProgress.count({ where: { userId, nextReview: { lte: now }, mastered: false } }),
    prisma.vocabularyWord.groupBy({
      by: ["category"],
      _count: { id: true },
      where: { status: "APPROVED" },
    }),
    prisma.vocabSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: { id: true, mode: true, totalWords: true, correctCount: true, startedAt: true, endedAt: true },
    }),
  ]);

  return NextResponse.json({
    totalWords,
    learned,
    mastered,
    dueNow,
    notStarted: Math.max(0, totalWords - learned),
    byCategory: byCategory.map((r) => ({ category: r.category, count: r._count.id })),
    recentSessions: recent,
  });
}
