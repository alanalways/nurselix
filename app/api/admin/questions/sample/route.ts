import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const n = Math.min(100, Math.max(1, Number(searchParams.get("n") ?? 20)));
  const domain = searchParams.get("domain") ?? undefined;
  const createdBy = searchParams.get("createdBy") ?? undefined;
  const difficulty = searchParams.get("difficulty") ?? undefined;

  const where = {
    status: "APPROVED" as const,
    ...(domain ? { domain } : {}),
    ...(difficulty ? { difficulty: difficulty as any } : {}),
    ...(createdBy ? { createdBy } : {}),
  };

  const total = await prisma.question.count({ where });

  // Random sample: pick a random offset then take n rows
  const skip = total > n ? Math.floor(Math.random() * (total - n)) : 0;
  const sample = await prisma.question.findMany({
    where,
    skip,
    take: n,
    select: {
      id: true,
      stem: true,
      stemZh: true,
      optionA: true,
      optionB: true,
      optionC: true,
      optionD: true,
      optionE: true,
      correctAnswer: true,
      correctAnswers: true,
      questionType: true,
      difficulty: true,
      domain: true,
      explanationZh: true,
      createdBy: true,
    },
  });

  return NextResponse.json({ total, n: sample.length, questions: sample });
}
