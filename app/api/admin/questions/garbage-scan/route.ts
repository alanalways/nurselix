/**
 * Detect "adverb pollution" / LLM-noise questions across the entire bank.
 *
 * Symptom: stems and options stuffed with meaningless adverbs
 * (gracefully, smartly, securely, perfectly, dynamically, etc.).
 * Rationale-fields containing "Irrelevant noise" or "無關雜訊" are also flagged.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const NOISE_ADVERBS = [
  "gracefully", "smartly", "securely", "perfectly", "actively",
  "smoothly", "expertly", "forcefully", "dynamically", "cleanly",
  "tightly", "exactly", "completely", "strictly", "correctly",
  "reliably", "boldly", "vigorously", "exquisitely", "aggressively",
  "optimally", "explicitly", "deeply", "entirely",
];

const NOISE_REGEX = new RegExp(
  `\\b(${NOISE_ADVERBS.join("|")})\\b`,
  "gi"
);

const RATIONALE_NOISE = /(irrelevant noise|無關雜訊|純干擾|此試錯題)/i;

interface FlaggedQuestion {
  id: string;
  stem: string;
  domain: string | null;
  status: string;
  adverbCount: number;
  flagReason: string[];
  createdBy: string | null;
  createdAt: string;
}

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const url = new URL(req.url);
  const minAdverbs = parseInt(url.searchParams.get("minAdverbs") ?? "5", 10);
  const includeArchived = url.searchParams.get("includeArchived") === "1";

  const questions = await prisma.question.findMany({
    where: includeArchived ? {} : { status: { not: "ARCHIVED" } },
    select: {
      id: true, stem: true, domain: true, status: true,
      optionA: true, optionB: true, optionC: true, optionD: true,
      optionE: true, optionF: true,
      optionRationales: true, explanationZh: true,
      createdBy: true, createdAt: true,
    },
  });

  const flagged: FlaggedQuestion[] = [];

  for (const q of questions) {
    const reasons: string[] = [];
    const text = [q.stem, q.optionA, q.optionB, q.optionC, q.optionD, q.optionE ?? "", q.optionF ?? ""].join(" ");

    const adverbMatches = text.match(NOISE_REGEX) ?? [];
    if (adverbMatches.length >= minAdverbs) {
      reasons.push(`${adverbMatches.length} 個雜訊副詞`);
    }
    if (q.stem.length > 800) reasons.push("題幹過長 >800 字");

    // Check rationales for "Irrelevant noise" markers
    if (q.optionRationales) {
      const rationaleStr = JSON.stringify(q.optionRationales);
      if (RATIONALE_NOISE.test(rationaleStr)) {
        reasons.push("Rationale 含「無關雜訊」標記");
      }
    }
    if (q.explanationZh && RATIONALE_NOISE.test(q.explanationZh)) {
      reasons.push("解析含「無關雜訊」標記");
    }

    if (reasons.length > 0) {
      flagged.push({
        id: q.id,
        stem: q.stem.slice(0, 200),
        domain: q.domain,
        status: q.status,
        adverbCount: adverbMatches.length,
        flagReason: reasons,
        createdBy: q.createdBy,
        createdAt: q.createdAt.toISOString(),
      });
    }
  }

  // Sort by adverb count desc
  flagged.sort((a, b) => b.adverbCount - a.adverbCount);

  // Group by createdBy for "batch" detection
  const byCreator: Record<string, number> = {};
  for (const f of flagged) {
    const key = f.createdBy ?? "unknown";
    byCreator[key] = (byCreator[key] ?? 0) + 1;
  }

  return NextResponse.json({
    totalScanned: questions.length,
    flaggedCount: flagged.length,
    byCreator,
    flagged: flagged.slice(0, 500),  // cap response size
  });
}

// POST { ids: string[] } — bulk archive flagged questions
export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({})) as { ids?: unknown };
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }
  const ids = body.ids.filter((x): x is string => typeof x === "string");

  const result = await prisma.question.updateMany({
    where: { id: { in: ids } },
    data: { status: "ARCHIVED" },
  });

  return NextResponse.json({ archived: result.count });
}
