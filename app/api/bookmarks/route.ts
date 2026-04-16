import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      question: {
        select: {
          id: true, stem: true, stemZh: true, domain: true, difficulty: true,
          questionType: true,
        },
      },
    },
  });

  return NextResponse.json({ rows });
}

const toggleSchema = z.object({
  questionId: z.string().min(1),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { questionId, note } = toggleSchema.parse(body);

    const existing = await prisma.bookmark.findUnique({
      where: { userId_questionId: { userId: session.user.id, questionId } },
    });

    if (existing) {
      await prisma.bookmark.delete({ where: { id: existing.id } });
      return NextResponse.json({ bookmarked: false });
    }

    await prisma.bookmark.create({
      data: { userId: session.user.id, questionId, note },
    });
    return NextResponse.json({ bookmarked: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
