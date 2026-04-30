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
  const pageRaw = parseInt(searchParams.get("page") ?? "1", 10);
  const page = Math.max(1, Number.isNaN(pageRaw) ? 1 : pageRaw);
  const pageSizeRaw = parseInt(searchParams.get("pageSize") ?? "30", 10);
  const pageSize = Math.min(100, Number.isNaN(pageSizeRaw) ? 30 : pageSizeRaw);

  const baseWhere = { status: "APPROVED" as const };

  // Memory note: previously this loaded every APPROVED question (id + stemZh +
  // explanationZh) into memory at once, which OOM'd on Zeabur with 14k+ rows.
  // We now stream in id-ordered batches and accumulate only the small id arrays
  // needed for short_explanation / garbled_chinese filtering. The mojibake check
  // and length comparison still run in JS because they need regex / ratio logic
  // that's awkward to express in a Prisma where clause.
  const SCAN_BATCH_SIZE = 1000;
  const shortExpIds: string[] = [];
  const garbledIds: string[] = [];
  {
    let cursorId: string | undefined = undefined;
    while (true) {
      const batch: Array<{ id: string; stemZh: string | null; explanationZh: string }> =
        await prisma.question.findMany({
          where: baseWhere,
          select: { id: true, stemZh: true, explanationZh: true },
          orderBy: { id: "asc" },
          take: SCAN_BATCH_SIZE,
          ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
        });
      if (batch.length === 0) break;
      for (const q of batch) {
        if (q.explanationZh && q.explanationZh !== "暫無解析" && q.explanationZh.length < 100) {
          shortExpIds.push(q.id);
        }
        if (isMojibake(q.stemZh) || isMojibake(q.explanationZh)) {
          garbledIds.push(q.id);
        }
      }
      if (batch.length < SCAN_BATCH_SIZE) break;
      cursorId = batch[batch.length - 1].id;
    }
  }

  const issueFilters: Record<string, any> = {
    missing_explanation: {
      // explanationZh is non-nullable in schema; null filter would be rejected by Prisma
      OR: [{ explanationZh: "" }, { explanationZh: "暫無解析" }],
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
