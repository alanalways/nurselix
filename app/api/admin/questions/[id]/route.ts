import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const q = await prisma.question.findUnique({ where: { id: params.id } });
  if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(q);
}

const patchSchema = z.object({
  stem: z.string().min(5).optional(),
  stemZh: z.string().nullable().optional(),
  scenarioEn: z.string().nullable().optional(),
  scenarioZh: z.string().nullable().optional(),
  optionA: z.string().optional(),
  optionB: z.string().optional(),
  optionC: z.string().optional(),
  optionD: z.string().optional(),
  optionE: z.string().nullable().optional(),
  optionF: z.string().nullable().optional(),
  correctAnswer: z.string().min(1).optional(),
  correctAnswers: z.array(z.string()).optional(),
  explanationZh: z.string().optional(),
  explanationEn: z.string().nullable().optional(),
  usTwDifference: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  subDomain: z.string().nullable().optional(),
  questionType: z.enum(["MCQ", "SATA", "ORDERED", "MATRIX", "BOWTIE", "DROPDOWN", "HIGHLIGHT"]).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  status: z.enum(["DRAFT", "APPROVED", "ARCHIVED"]).optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);
    if (data.correctAnswer) data.correctAnswer = data.correctAnswer.toUpperCase();

    const updated = await prisma.question.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    // Soft-archive rather than hard delete to keep referential integrity
    await prisma.question.update({
      where: { id: params.id },
      data: { status: "ARCHIVED" },
    });
    return NextResponse.json({ ok: true, archived: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
