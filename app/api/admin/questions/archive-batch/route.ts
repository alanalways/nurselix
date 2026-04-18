import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

function isMojibake(text: string | null | undefined): boolean {
  if (!text || text.length < 10) return false;
  if (/[ÃÂÄÅØ]{2,}|â€|Ã©|Ã¨|Ã¢|Ã‰|å°|å¤§/.test(text)) return true;
  const cjk = text.match(/[\u4e00-\u9fff]/g) ?? [];
  return cjk.length / text.length < 0.2;
}

/**
 * Batch-archive APPROVED questions matching the supplied issue categories.
 * Sets status = ARCHIVED so they stop appearing in practice / assessments.
 *
 * Body: { issues: string[] }  supported: missing_explanation | short_explanation
 *                                      | missing_rationales  | missing_stem_zh
 *                                      | garbled_chinese
 * Returns: { archived: number, byIssue: Record<string, number> }
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const issues: string[] = Array.isArray(body.issues) ? body.issues : [];
  if (issues.length === 0) {
    return NextResponse.json({ error: "issues array required" }, { status: 400 });
  }

  const baseWhere = { status: "APPROVED" as const };
  const idsToArchive = new Set<string>();
  const byIssue: Record<string, number> = {};

  // Text-based issues need full scan
  const needsFullScan = issues.some((i) =>
    ["short_explanation", "garbled_chinese"].includes(i)
  );
  let textRows: { id: string; stemZh: string | null; explanationZh: string | null }[] = [];
  if (needsFullScan) {
    textRows = await prisma.question.findMany({
      where: baseWhere,
      select: { id: true, stemZh: true, explanationZh: true },
    });
  }

  for (const issue of issues) {
    let ids: string[] = [];
    if (issue === "missing_explanation") {
      const rows = await prisma.question.findMany({
        where: {
          ...baseWhere,
          OR: [{ explanationZh: "" }, { explanationZh: "暫無解析" }],
        },
        select: { id: true },
      });
      ids = rows.map((r) => r.id);
    } else if (issue === "missing_rationales") {
      const rows = await prisma.question.findMany({
        where: { ...baseWhere, optionRationales: { equals: null as any } },
        select: { id: true },
      });
      ids = rows.map((r) => r.id);
    } else if (issue === "missing_stem_zh") {
      const rows = await prisma.question.findMany({
        where: { ...baseWhere, OR: [{ stemZh: null }, { stemZh: "" }] },
        select: { id: true },
      });
      ids = rows.map((r) => r.id);
    } else if (issue === "short_explanation") {
      ids = textRows
        .filter((q) => q.explanationZh && q.explanationZh !== "暫無解析" && q.explanationZh.length < 100)
        .map((q) => q.id);
    } else if (issue === "garbled_chinese") {
      ids = textRows
        .filter((q) => isMojibake(q.stemZh) || isMojibake(q.explanationZh))
        .map((q) => q.id);
    } else {
      continue;
    }

    byIssue[issue] = ids.length;
    for (const id of ids) idsToArchive.add(id);
  }

  if (idsToArchive.size === 0) {
    return NextResponse.json({ archived: 0, byIssue });
  }

  // Archive in chunks to avoid huge IN() clauses
  const allIds = Array.from(idsToArchive);
  const CHUNK = 1000;
  let archived = 0;
  for (let i = 0; i < allIds.length; i += CHUNK) {
    const result = await prisma.question.updateMany({
      where: { id: { in: allIds.slice(i, i + CHUNK) } },
      data: { status: "ARCHIVED" },
    });
    archived += result.count;
  }

  return NextResponse.json({ archived, byIssue });
}
