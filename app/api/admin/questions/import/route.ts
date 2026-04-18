import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const questionSchema = z.object({
  stem: z.string().min(3),
  stemZh: z.string().optional(),
  scenarioEn: z.string().optional(),
  scenarioZh: z.string().optional(),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  optionE: z.string().optional(),
  optionF: z.string().optional(),
  correctAnswer: z.string().min(1).max(20).optional().nullable(),
  correctAnswers: z.array(z.string()).optional(),
  explanationZh: z.string().min(1),
  explanationEn: z.string().optional(),
  usTwDifference: z.string().optional(),
  optionRationales: z.record(z.string(), z.any()).nullable().optional(),
  domain: z.string().optional(),
  subDomain: z.string().optional(),
  questionType: z.enum(["MCQ", "SATA"]).default("MCQ"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  tags: z.array(z.string()).default([]),
  cjmmStep: z.string().optional(),
  bloomsLevel: z.string().optional(),
  irtA: z.number().optional(),
  irtB: z.number().optional(),
  irtC: z.number().optional(),
});

const bodySchema = z.object({
  questions: z.array(questionSchema).min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const now = new Date();
  const adminId = (guard as { user?: { id?: string } }).user?.id ?? "admin";

  // Batch insert in chunks of 500
  const CHUNK = 500;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < parsed.questions.length; i += CHUNK) {
    const chunk = parsed.questions.slice(i, i + CHUNK);
    try {
      const result = await prisma.question.createMany({
        data: chunk.map((q) => {
          const cas = q.correctAnswers?.map((s) => s.toUpperCase()) ?? (q.correctAnswer ?? "A").toUpperCase().split(",").map((s) => s.trim());
          const ca = q.correctAnswer?.toUpperCase() ?? cas.join(",");
          return {
            stem: q.stem,
            stemZh: q.stemZh,
            scenarioEn: q.scenarioEn,
            scenarioZh: q.scenarioZh,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            optionE: q.optionE,
            optionF: q.optionF,
            correctAnswer: ca,
            correctAnswers: cas,
            explanationZh: q.explanationZh,
            explanationEn: q.explanationEn,
            usTwDifference: q.usTwDifference,
            optionRationales: (q.optionRationales as any) ?? undefined,
            domain: q.domain,
            subDomain: q.subDomain,
            questionType: q.questionType,
            difficulty: q.difficulty,
            tags: q.tags,
            cjmmStep: q.cjmmStep,
            bloomsLevel: q.bloomsLevel,
            irtA: q.irtA,
            irtB: q.irtB,
            irtC: q.irtC,
            status: "APPROVED",
            createdBy: adminId,
            createdAt: now,
            updatedAt: now,
          };
        }),
        skipDuplicates: true,
      });
      inserted += result.count;
    } catch {
      skipped += chunk.length;
    }
  }

  return NextResponse.json({ inserted, skipped, total: parsed.questions.length });
}
