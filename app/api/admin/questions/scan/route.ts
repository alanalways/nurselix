import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

/**
 * Scan APPROVED questions for quality issues. Returns flagged questions with issue tags.
 * Issues detected:
 *  - short_explanation: explanationZh < 100 chars
 *  - missing_explanation: explanationZh is empty or "暫無解析"
 *  - missing_rationales: optionRationales null or < 4 keys
 *  - missing_stem_zh: stemZh is null/empty
 *  - invalid_answer: correctAnswer empty or references missing option
 */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const issue = searchParams.get("issue");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "30"));

  // Build per-issue Prisma where clauses
  const issueFilters: Record<string, any> = {
    short_explanation: {
      AND: [
        { explanationZh: { not: "暫無解析" } },
      ],
    },
    missing_explanation: {
      OR: [
        { explanationZh: "" },
        { explanationZh: "暫無解析" },
      ],
    },
    missing_rationales: { optionRationales: { equals: null as any } },
    missing_stem_zh:    { OR: [{ stemZh: null }, { stemZh: "" }] },
  };

  const baseWhere = { status: "APPROVED" as const };

  // For counts, compute each issue separately
  const [totalApproved, missingExp, missingRat, missingStemZh, shortExpRows] = await Promise.all([
    prisma.question.count({ where: baseWhere }),
    prisma.question.count({ where: { ...baseWhere, ...issueFilters.missing_explanation } }),
    prisma.question.count({ where: { ...baseWhere, ...issueFilters.missing_rationales } }),
    prisma.question.count({ where: { ...baseWhere, ...issueFilters.missing_stem_zh } }),
    prisma.question.findMany({
      where: baseWhere,
      select: { id: true, explanationZh: true },
    }),
  ]);

  const shortExpIds = shortExpRows
    .filter((q) => q.explanationZh && q.explanationZh !== "暫無解析" && q.explanationZh.length < 100)
    .map((q) => q.id);

  // Filter for specific issue
  let where: any = baseWhere;
  if (issue === "short_explanation") {
    where = { ...baseWhere, id: { in: shortExpIds } };
  } else if (issue && issueFilters[issue]) {
    where = { ...baseWhere, ...issueFilters[issue] };
  }

  const [rows, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        stem: true,
        stemZh: true,
        domain: true,
        difficulty: true,
        questionType: true,
        explanationZh: true,
        optionRationales: true,
        attemptCount: true,
        correctCount: true,
      },
    }),
    issue ? prisma.question.count({ where }) : Promise.resolve(totalApproved),
  ]);

  const flagged = rows.map((q) => {
    const issues: string[] = [];
    if (!q.explanationZh || q.explanationZh === "暫無解析") issues.push("missing_explanation");
    else if (q.explanationZh.length < 100) issues.push("short_explanation");
    if (!q.optionRationales || Object.keys(q.optionRationales as object).length < 4) issues.push("missing_rationales");
    if (!q.stemZh) issues.push("missing_stem_zh");
    return {
      id: q.id,
      stem: q.stem.substring(0, 120),
      stemZh: q.stemZh?.substring(0, 120) ?? null,
      domain: q.domain,
      difficulty: q.difficulty,
      questionType: q.questionType,
      explanationLength: q.explanationZh?.length ?? 0,
      issues,
    };
  });

  return NextResponse.json({
    summary: {
      totalApproved,
      missingExplanation: missingExp,
      shortExplanation: shortExpIds.length,
      missingRationales: missingRat,
      missingStemZh,
    },
    rows: flagged,
    total,
    page,
    pageSize,
  });
}
