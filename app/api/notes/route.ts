import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const questionId = url.searchParams.get("questionId");

  if (questionId) {
    const note = await prisma.questionNote.findUnique({
      where: { userId_questionId: { userId: session.user.id, questionId } },
    });
    return NextResponse.json({ note });
  }

  const notes = await prisma.questionNote.findMany({
    where: { userId: session.user.id },
    include: { question: { select: { id: true, stem: true, domain: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ notes });
}

const upsertSchema = z.object({
  questionId: z.string().min(1),
  content: z.string().max(2000),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { questionId, content } = upsertSchema.parse(body);

    if (content.trim().length === 0) {
      await prisma.questionNote.deleteMany({
        where: { userId: session.user.id, questionId },
      });
      return NextResponse.json({ deleted: true });
    }

    const note = await prisma.questionNote.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      create: { userId: session.user.id, questionId, content },
      update: { content },
    });
    return NextResponse.json({ note });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
