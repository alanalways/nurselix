import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vs = await prisma.vocabSession.findUnique({ where: { id: params.id } });
  if (!vs || vs.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (vs.endedAt) return NextResponse.json({ ok: true, alreadyEnded: true });

  const updated = await prisma.vocabSession.update({
    where: { id: params.id },
    data: { endedAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    totalWords: updated.totalWords,
    correctCount: updated.correctCount,
    timeSpentSec: updated.timeSpentSec,
    accuracy: updated.totalWords > 0 ? Math.round((updated.correctCount / updated.totalWords) * 100) : 0,
  });
}
