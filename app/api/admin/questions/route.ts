import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);

  if (url.searchParams.get("stats") === "1") {
    const [domainRows, total] = await Promise.all([
      prisma.question.groupBy({
        by: ["domain"],
        _count: { id: true },
        where: { domain: { not: null } },
      }),
      prisma.question.count(),
    ]);
    const domains: Record<string, number> = {};
    for (const row of domainRows) {
      if (row.domain) domains[row.domain] = row._count.id;
    }
    return NextResponse.json({ total, domains });
  }

  const search = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const domain = url.searchParams.get("domain") ?? "";
  const moduleFilter = url.searchParams.get("module") ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? "30")));

  const where: Record<string, unknown> = {};
  if (status && ["APPROVED", "DRAFT", "ARCHIVED"].includes(status)) where.status = status;
  if (domain) where.domain = domain;
  if (moduleFilter && ["NCLEX", "TOEIC", "IELTS"].includes(moduleFilter)) where.module = moduleFilter;
  if (search) {
    where.OR = [
      { stem:   { contains: search, mode: "insensitive" } },
      { stemZh: { contains: search, mode: "insensitive" } },
      { domain: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, stem: true, stemZh: true, domain: true, difficulty: true,
        status: true, questionType: true, attemptCount: true, correctCount: true,
        errorRate: true, hasAudio: true, audioDurationSec: true,
        createdAt: true, updatedAt: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  return NextResponse.json({
    rows: rows.map((r) => ({
      ...r,
      errorRate: r.attemptCount > 0
        ? Math.round(((r.attemptCount - r.correctCount) / r.attemptCount) * 100)
        : null,
    })),
    items: rows,  // alias for new UI
    total,
    page,
    pageSize,
  });
}

// Bulk patch — approve / archive multiple questions at once
const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
  status: z.enum(["APPROVED", "DRAFT", "ARCHIVED"]),
});

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await req.json();
    const { ids, status } = bulkSchema.parse(body);
    const result = await prisma.question.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
    return NextResponse.json({ updated: result.count });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Truncate all questions (danger — admin only)
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const confirm = url.searchParams.get("confirm");
  if (confirm !== "TRUNCATE_ALL") {
    return NextResponse.json({ error: "Pass ?confirm=TRUNCATE_ALL to confirm" }, { status: 400 });
  }

  try {
    const before = await prisma.question.count();
    await prisma.$executeRaw`TRUNCATE "Question" CASCADE`;
    return NextResponse.json({ deleted: before });
  } catch (err) {
    console.error("[DELETE /api/admin/questions]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// Create a new question (admin only)
const createSchema = z.object({
  module: z.enum(["NCLEX", "TOEIC", "IELTS"]).default("NCLEX"),
  stem: z.string().min(5),
  stemZh: z.string().optional(),
  scenarioEn: z.string().optional(),
  scenarioZh: z.string().optional(),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  optionE: z.string().optional(),
  optionF: z.string().optional(),
  correctAnswer: z.string().min(1).max(20),
  correctAnswers: z.array(z.string()).optional(),
  explanationZh: z.string().min(5),
  explanationEn: z.string().optional(),
  usTwDifference: z.string().optional(),
  domain: z.string().optional(),
  subDomain: z.string().optional(),
  questionType: z.enum(["MCQ", "SATA", "ORDERED", "MATRIX", "BOWTIE", "DROPDOWN", "HIGHLIGHT"]).default("MCQ"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  status: z.enum(["DRAFT", "APPROVED"]).default("DRAFT"),
  tags: z.array(z.string()).default([]),
  audioScript: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const created = await prisma.question.create({
      data: {
        ...data,
        correctAnswer: data.correctAnswer.toUpperCase(),
        correctAnswers: data.correctAnswers ?? data.correctAnswer.split(",").map((s) => s.toUpperCase()),
        createdBy: guard.user?.id ?? "admin",
      },
      select: { id: true },
    });
    return NextResponse.json({ id: created.id });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    console.error("[admin/questions POST]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
