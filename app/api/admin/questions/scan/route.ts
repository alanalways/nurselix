import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

/**
 * Detect mojibake (garbled encoding) in Chinese text.
 * If text is > 10 chars but has < 20% CJK characters, or contains typical
 * mojibake byte-sequence markers, it's flagged as garbled.
 */
function isMojibake(text: string | null | undefined): boolean {
  if (!text || text.length < 10) return false;
  if (/[ÃÂÄÅØ]{2,}|â€|Ã©|Ã¨|Ã¢|Ã‰|å°|å¤§/.test(text)) return true;
  const cjk = text.match(/[\u4e00-\u9fff]/g) ?? [];
  return cjk.length / text.length < 0.2;
}

/**
 * Scan APPROVED questions for quality issues. Returns flagged questions with issue tags.
 * Issues detected:
 *  - short_explanation: explanationZh < 100 chars
 *  - missing_explanation: explanationZh is empty or "暫無解析"
 *  - missing_rationales: optionRationales null or < 4 keys
 *  - missing_stem_zh: stemZh is null/empty
 *  - garbled_chinese: stemZh or explanationZh contains mojibake
 */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const issue = searchParams.get("issue");
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "30"));

  const baseWhere = { status: "APPROVED" as const };

  // Full text scan for length + mojibake
  const allApproved = await prisma.question.findMany({
    where: baseWhere,
    select: { id: true, stemZh: true, explanationZh: true },
  });

  const shortExpIds = allApproved
    .filter((q) => q.explanationZh && q.explanationZh !== "暫無解析" && q.explanationZh.length < 100)
    .map((q) => q.id);

  const garbledIds = allApproved
    .filter((q) => isMojibake(q.stemZh) || isMojibake(q.explanationZh))
    .map((q) => q.id);

  const issueFilters: Record<string, any> = {
    missing_explanation: {
      OR: [{ explanationZh: "" }, { explanationZh: "暫無解析" }, { explanationZh: null }],
    },
    missing_rationales: { optionRationales: { equals: null as any } },
    missing_stem_zh: { OR: [{ stemZh: null }, { stemZh: "" }] },
  };

  const [totalApproved, missingExp, missingRat, missingStemZh] = await Promise.all([
    prisma.question.count({ where: baseWhere }),
    prisma.question.count({ where: { ...baseWhere, ...issueFilters.missing_explanation } }),
    prisma.question.count({ where: { ...baseWhere, ...issueFilters.missing_rationales } }),
    prisma.question.count({ where: { ...baseWhere, ...issueFilters.missing_stem_zh } }),
  ]);

  let where: any = baseWhere;
  if (issue === "short_explanation") {
    where = { ...baseWhere, id: { in: shortExpIds } };
  } else if (issue === "garbled_chinese") {
    where = { ...baseWhere, id: { in: garbledIds } };
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

  const garbledSet = new Set(garbledIds);

  const flagged = rows.map((q) => {
    const issues: string[] = [];
    if (!q.explanationZh || q.explanationZh === "暫無解析") issues.push("missing_explanation");
    else if (q.explanationZh.length < 100) issues.push("short_explanation");
    if (!q.optionRationales || Object.keys(q.optionRationales as object).length < 4) issues.push("missing_rationales");
    if (!q.stemZh) issues.push("missing_stem_zh");
    if (garbledSet.has(q.id)) issues.push("garbled_chinese");
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
      garbledChinese: garbledIds.length,
    },
    rows: flagged,
    total,
    page,
    pageSize,
  });
}
