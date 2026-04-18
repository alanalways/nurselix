import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const n = Math.min(100, Math.max(1, Number(searchParams.get("n") ?? 20)));
  const domain = searchParams.get("domain") ?? undefined;
  const createdBy = searchParams.get("createdBy") ?? undefined; // e.g. "core-import"
  const difficulty = searchParams.get("difficulty") ?? undefined;

  // Pull a random sample using TABLESAMPLE for large tables (Postgres).
  // We over-fetch then slice to handle the probabilistic nature of TABLESAMPLE.
  const where: Record<string, any> = { status: "APPROVED" };
  if (domain) where.domain = domain;
  if (difficulty) where.difficulty = difficulty;
  if (createdBy) where.createdBy = createdBy;

  // count so we can show coverage stats
  const [total, sample] = await Promise.all([
    prisma.question.count({ where }),
    prisma.$queryRawUnsafe<{
      id: string;
      stem: string;
      options: any;
      correctAnswer: string;
      correctAnswers: string[];
      questionType: string;
      difficulty: string;
      domain: string | null;
      explanationZh: string | null;
      createdBy: string | null;
    }[]>(
      `
      SELECT id, stem, options, "correctAnswer", "correctAnswers",
             "questionType", difficulty, domain, "explanationZh", "createdBy"
      FROM "Question"
      WHERE status = 'APPROVED'
        ${domain ? `AND domain = '${domain.replace(/'/g, "''")}'` : ""}
        ${difficulty ? `AND difficulty = '${difficulty.replace(/'/g, "''")}'` : ""}
        ${createdBy ? `AND "createdBy" = '${createdBy.replace(/'/g, "''")}'` : ""}
      ORDER BY RANDOM()
      LIMIT ${n}
      `
    ),
  ]);

  return NextResponse.json({ total, n: sample.length, questions: sample });
}
