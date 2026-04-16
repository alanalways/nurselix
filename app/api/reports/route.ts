import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userRateLimit } from "@/lib/utils/rateLimit";

const schema = z.object({
  questionId: z.string().min(1),
  reason: z.string().min(2).max(100),
  detail: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await userRateLimit(session.user.id, "report", { limit: 5, windowSec: 60 });
  if (!limit.success) return NextResponse.json({ error: "請求太頻繁" }, { status: 429 });

  try {
    const body = await req.json();
    const { questionId, reason, detail } = schema.parse(body);

    const exists = await prisma.question.findUnique({ where: { id: questionId }, select: { id: true } });
    if (!exists) return NextResponse.json({ error: "Question not found" }, { status: 404 });

    const created = await prisma.questionReport.create({
      data: { userId: session.user.id, questionId, reason, detail, status: "pending" },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
