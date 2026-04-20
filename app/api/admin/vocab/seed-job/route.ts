/**
 * Background bulk vocab seeding job.
 *
 * Runs entirely in Node process memory (Docker/Zeabur — NOT serverless).
 *
 * POST { categories?, tier, totalPerCategory, batchSize }  start job
 * GET                                                      current job status
 * DELETE                                                   clear finished job
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { generateVocabBatch, VOCAB_CATEGORIES } from "@/lib/vocab/generateBatch";

export interface VocabSeedJob {
  id: string;
  status: "running" | "done" | "failed" | "stopped";
  startedAt: number;
  updatedAt: number;
  tier: number;
  totalTarget: number;
  inserted: number;
  batchesDone: number;
  errors: number;
  currentCategory: string | null;
  lastMessage: string;
  totalCostUsd: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __vocabSeedJob: VocabSeedJob | null | undefined;
}

function getJob(): VocabSeedJob | null {
  return globalThis.__vocabSeedJob ?? null;
}

function setJob(j: VocabSeedJob | null) {
  globalThis.__vocabSeedJob = j;
}

export async function GET() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  return NextResponse.json({ job: getJob() });
}

export async function DELETE() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const cur = getJob();
  if (cur && cur.status === "running") {
    return NextResponse.json({ error: "Job running — stop first" }, { status: 400 });
  }
  setJob(null);
  return NextResponse.json({ ok: true });
}

const startSchema = z.object({
  categories: z.array(z.enum(VOCAB_CATEGORIES)).optional(),
  tier: z.number().int().min(1).max(3),
  totalPerCategory: z.number().int().min(10).max(500),
  batchSize: z.number().int().min(5).max(30).default(20),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const existing = getJob();
  if (existing && existing.status === "running") {
    return NextResponse.json({ error: "Job already running", job: existing }, { status: 409 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY missing" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { categories, tier, totalPerCategory, batchSize } = parsed.data;
  const cats = categories && categories.length > 0 ? categories : [...VOCAB_CATEGORIES];

  const job: VocabSeedJob = {
    id: crypto.randomUUID(),
    status: "running",
    startedAt: Date.now(),
    updatedAt: Date.now(),
    tier,
    totalTarget: totalPerCategory * cats.length,
    inserted: 0,
    batchesDone: 0,
    errors: 0,
    currentCategory: cats[0] ?? null,
    lastMessage: "啟動中…",
    totalCostUsd: 0,
  };
  setJob(job);

  void runVocabSeedJob(job.id, cats, tier, totalPerCategory, batchSize).catch((e) => {
    const cur = getJob();
    if (cur && cur.id === job.id) {
      cur.status = "failed";
      cur.lastMessage = `任務失敗: ${e instanceof Error ? e.message : String(e)}`;
      cur.updatedAt = Date.now();
      setJob(cur);
    }
  });

  return NextResponse.json({ ok: true, job });
}

async function runVocabSeedJob(
  jobId: string,
  categories: readonly string[],
  tier: number,
  totalPerCategory: number,
  batchSize: number,
) {
  for (const category of categories) {
    let insertedForCat = 0;
    while (insertedForCat < totalPerCategory) {
      const cur = getJob();
      if (!cur || cur.id !== jobId || cur.status !== "running") return;

      cur.currentCategory = category;
      cur.lastMessage = `產生中：${category} Tier${tier}（${insertedForCat}/${totalPerCategory}）`;
      cur.updatedAt = Date.now();
      setJob(cur);

      const remaining = totalPerCategory - insertedForCat;
      const count = Math.min(batchSize, remaining);

      // Get all existing words so Claude doesn't duplicate
      const existing = await prisma.vocabularyWord.findMany({
        select: { word: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });

      try {
        const { words, usage, costUsd } = await generateVocabBatch({
          category, tier, count,
          existingWords: existing.map((w) => w.word),
        });

        if (words.length === 0) {
          cur.errors += 1;
          cur.lastMessage = `${category}：Claude 回傳 0 字，跳過一輪`;
          cur.updatedAt = Date.now();
          setJob(cur);
          // avoid tight retry loops
          break;
        }

        const ins = await prisma.vocabularyWord.createMany({
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
            model: "claude-sonnet-4-6",
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            cacheReadTokens: usage.cacheReadTokens,
            cacheWriteTokens: usage.cacheWriteTokens,
            purpose: "vocab_seed",
            costUsd,
          },
        });

        insertedForCat += ins.count;
        cur.inserted += ins.count;
        cur.batchesDone += 1;
        cur.totalCostUsd += costUsd;
        cur.lastMessage = `✓ ${category}：+${ins.count}（批次 ${cur.batchesDone}）`;
        cur.updatedAt = Date.now();
        setJob(cur);

        // Exit the inner loop if Claude can't find new words (all duplicates)
        if (ins.count === 0) break;
      } catch (err) {
        cur.errors += 1;
        cur.lastMessage = `⚠️ ${category} 錯誤：${err instanceof Error ? err.message : String(err)}`;
        cur.updatedAt = Date.now();
        setJob(cur);
        break;
      }
    }
  }

  const final = getJob();
  if (final && final.id === jobId) {
    final.status = "done";
    final.lastMessage = `✅ 完成：共插入 ${final.inserted} 字，花費 $${final.totalCostUsd.toFixed(4)}`;
    final.currentCategory = null;
    final.updatedAt = Date.now();
    setJob(final);
  }
}

/** PATCH — stop running job */
export async function PATCH() {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;
  const cur = getJob();
  if (!cur) return NextResponse.json({ error: "No job" }, { status: 404 });
  if (cur.status !== "running") return NextResponse.json({ job: cur });
  cur.status = "stopped";
  cur.lastMessage = "任務已停止";
  cur.updatedAt = Date.now();
  setJob(cur);
  return NextResponse.json({ job: cur });
}
