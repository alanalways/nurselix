/**
 * Admin: seed the NCLEX vocabulary word bank via Claude.
 *
 * POST { category, tier, count }  — generate one batch, insert (skip dupes)
 * GET                             — list distinct categories + totals
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { generateVocabBatch, VOCAB_CATEGORIES, VocabProvider } from "@/lib/vocab/generateBatch";

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const [total, byCategory, byTier] = await Promise.all([
    prisma.vocabularyWord.count(),
    prisma.vocabularyWord.groupBy({ by: ["category"], _count: { id: true } }),
    prisma.vocabularyWord.groupBy({ by: ["tier"], _count: { id: true } }),
  ]);

  return NextResponse.json({
    total,
    categories: VOCAB_CATEGORIES,
    byCategory: byCategory.map((r) => ({ category: r.category, count: r._count.id })),
    byTier: byTier.map((r) => ({ tier: r.tier, count: r._count.id })),
  });
}

const seedSchema = z.object({
  category: z.enum(VOCAB_CATEGORIES),
  tier: z.number().int().min(1).max(3),
  count: z.number().int().min(5).max(40).default(20),
  provider: z.enum(["claude", "gemini"]).default("claude"),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const parsed = seedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { category, tier, count, provider } = parsed.data;

  const hasGeminiKey = Array.from({ length: 10 }, (_, i) => process.env[`GEMINI_API_KEY_${i + 1}`]).some(Boolean)
    || !!process.env.GOOGLE_AI_API_KEY || !!process.env.GEMINI_API_KEY;
  if (provider === "gemini" && !hasGeminiKey) {
    return NextResponse.json({ error: "未設定 Gemini API Key（GEMINI_API_KEY_1 ~ GEMINI_API_KEY_10）" }, { status: 503 });
  }
  if (provider !== "gemini" && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY missing" }, { status: 503 });
  }

  // Fetch existing words (all, since uniqueness is global) to avoid duplicates
  const existing = await prisma.vocabularyWord.findMany({
    select: { word: true },
    orderBy: { createdAt: "desc" },
  });
  const existingWords = existing.map((w) => w.word);

  const { words, usage, costUsd, raw, modelUsed } = await generateVocabBatch({
    category, tier, count, existingWords, provider: provider as VocabProvider,
  });

  if (words.length === 0) {
    return NextResponse.json({ error: `${provider === "gemini" ? "Gemini" : "Claude"} returned no usable words`, raw: raw.slice(0, 600) }, { status: 500 });
  }

  // Bulk insert skipping duplicates (word is unique)
  const result = await prisma.vocabularyWord.createMany({
    data: words.map((w) => ({
      word: w.word,
      partOfSpeech: w.partOfSpeech ?? null,
      definitionEn: w.definitionEn,
      definitionZh: w.definitionZh,
      category: w.category,
      tier: w.tier,
      difficulty: w.difficulty,
      exampleEn: w.exampleEn ?? null,
      exampleZh: w.exampleZh ?? null,
      synonyms: w.synonyms ?? [],
      memoryHook: w.memoryHook ?? null,
    })),
    skipDuplicates: true,
  });

  await prisma.apiUsageLog.create({
    data: {
      model: modelUsed,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      purpose: "vocab_seed",
      costUsd,
    },
  });

  return NextResponse.json({
    ok: true,
    requested: count,
    generated: words.length,
    inserted: result.count,
    skippedDuplicates: words.length - result.count,
    costUsd: Math.round(costUsd * 10000) / 10000,
  });
}

/** DELETE — truncate vocabulary (admin only, confirm flag required) */
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const url = new URL(req.url);
  if (url.searchParams.get("confirm") !== "TRUNCATE_VOCAB") {
    return NextResponse.json({ error: "Pass ?confirm=TRUNCATE_VOCAB to confirm" }, { status: 400 });
  }
  const before = await prisma.vocabularyWord.count();
  await prisma.$executeRaw`TRUNCATE "VocabularyWord" CASCADE`;
  return NextResponse.json({ deleted: before });
}
