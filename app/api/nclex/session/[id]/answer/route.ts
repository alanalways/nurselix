import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { submitAnswer } from "@/lib/nclex/sessionEngine";
import { userRateLimit } from "@/lib/utils/rateLimit";
import { consumeDaily } from "@/lib/utils/dailyLimit";
import { prisma } from "@/lib/prisma";
import type { Plan } from "@/types";

const schema = z.object({
  questionId: z.string().min(1),
  // Uppercase letters A-F, optionally comma-separated (SATA).
  // Rejects malformed input like "A,A,A" (duplicates handled below) or "a,1".
  selectedAnswer: z.string()
    .min(1)
    .max(20)
    .regex(/^[A-Fa-f](,[A-Fa-f])*$/, "invalid selectedAnswer format"),
  timeSpentSec: z.number().int().min(0).max(7200).default(0),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await userRateLimit(session.user.id, "submit-answer", { limit: 30, windowSec: 60 });
  if (!limit.success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const body = await req.json();
    const input = schema.parse(body);

    // Reject duplicate letters like "A,A,A"
    const letters = input.selectedAnswer.toUpperCase().split(",");
    if (new Set(letters).size !== letters.length) {
      return NextResponse.json({ error: "重複的答案選項" }, { status: 400 });
    }

    // Pre-validate session and question before consuming quota.
    const sessionRecord = await prisma.userSession.findUnique({
      where: { id: params.id },
      select: { userId: true, endedAt: true, questionIds: true },
    });
    if (!sessionRecord || sessionRecord.userId !== session.user.id) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (sessionRecord.endedAt) {
      return NextResponse.json({ error: "Session already ended" }, { status: 409 });
    }
    if (!sessionRecord.questionIds.includes(input.questionId)) {
      return NextResponse.json({ error: "Question not part of this session" }, { status: 400 });
    }

    // Idempotency: return 409 if this question was already answered in this session.
    const duplicate = await prisma.userAnswer.findFirst({
      where: { sessionId: params.id, questionId: input.questionId },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: "Question already answered in this session" }, { status: 409 });
    }

    // Consume daily quota only after confirming the request is valid.
    const plan = (session.user.plan ?? "FREE") as Plan;
    const quota = await consumeDaily(session.user.id, plan);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: `今日題數已達 ${quota.limit} 題上限`, resetAt: quota.resetAt },
        { status: 429 },
      );
    }

    const result = await submitAnswer({
      sessionId: params.id,
      userId: session.user.id,
      questionId: input.questionId,
      selectedAnswer: input.selectedAnswer.toUpperCase(),
      timeSpentSec: input.timeSpentSec,
    });

    if (!result) {
      return NextResponse.json({ error: "Session not found or ended" }, { status: 404 });
    }

    return NextResponse.json({
      ...result,
      dailyUsed: quota.used,
      dailyLimit: quota.limit,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("[nclex/session/answer POST]", err);
    return NextResponse.json({ error: "伺服器錯誤" }, { status: 500 });
  }
}
