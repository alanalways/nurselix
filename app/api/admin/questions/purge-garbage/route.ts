import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

/**
 * Detects and archives questions with garbled AI-generated content.
 * Heuristic: any single word repeating 6+ times in the stem = garbage.
 * GET  → preview how many would be archived
 * POST → actually archive them
 */

function isGarbled(text: string): boolean {
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g);
  if (!words || words.length < 20) return false;
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] ?? 0) + 1;
    if (freq[w] >= 6) return true;
  }
  return false;
}

async function findGarbageIds(): Promise<string[]> {
  const questions = await prisma.question.findMany({
    where: { status: "APPROVED" },
    select: { id: true, stem: true },
  });
  return questions.filter((q) => isGarbled(q.stem)).map((q) => q.id);
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const ids = await findGarbageIds();
  return NextResponse.json({ count: ids.length, ids: ids.slice(0, 20) });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const dryRun = body.dryRun === true;

  const ids = await findGarbageIds();

  if (!dryRun && ids.length > 0) {
    await prisma.question.updateMany({
      where: { id: { in: ids } },
      data: { status: "ARCHIVED" },
    });
  }

  return NextResponse.json({
    archived: dryRun ? 0 : ids.length,
    detected: ids.length,
    dryRun,
  });
}
