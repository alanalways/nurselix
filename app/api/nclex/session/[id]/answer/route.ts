import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { submitAnswer } from "@/lib/nclex/sessionEngine";
import { userRateLimit } from "@/lib/utils/rateLimit";
import { consumeDaily } from "@/lib/utils/dailyLimit";
import type { Plan } from "@/types";

const schema = z.object({
  questionId: z.string().min(1),
  selectedAnswer: z.string().min(1).max(20),
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

    // Consume daily quota
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
