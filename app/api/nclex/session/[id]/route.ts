import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.userSession.findUnique({
    where: { id: params.id },
    select: {
      id: true, mode: true, theta: true, se: true,
      totalQuestions: true, correctCount: true, totalTimeSec: true,
      targetCount: true, timeLimitSec: true,
      isPaused: true, pausedAt: true, endedAt: true,
      passFail: true, score: true, stopReason: true,
      startedAt: true,
      userId: true,
    },
  });

  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Strip userId from the payload without ESLint noise
  const safe = { ...row, userId: undefined };
  delete (safe as { userId?: string }).userId;
  return NextResponse.json(safe);
}
