/**
 * Start a vocab practice session.
 *
 * POST { mode, category?, tier?, count? }
 *
 * Mode logic:
 *   FLASHCARD  — pick mix of due-for-review + new words
 *   QUIZ       — pick words + generate 3 distractor definitions
 *   SPELLING   — pick words (user types the English word from ZH definition)
 *   DEFINITION — pick words + 3 distractor words for the given definition
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userRateLimit } from "@/lib/utils/rateLimit";

const schema = z.object({
  mode: z.enum(["FLASHCARD", "QUIZ", "SPELLING", "DEFINITION"]),
  category: z.string().optional(),
  tier: z.number().int().min(1).max(3).optional(),
  count: z.number().int().min(5).max(50).default(15),
});

interface QuestionCard {
  wordId: string;
  word: string;
  partOfSpeech: string | null;
  definitionEn: string;
  definitionZh: string;
  exampleEn: string | null;
  exampleZh: string | null;
  memoryHook: string | null;
  synonyms: string[];
  category: string;
  // QUIZ / DEFINITION mode extras
  choices?: { key: string; text: string }[];
  correctKey?: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await userRateLimit(session.user.id, "vocab-session", { limit: 60, windowSec: 3600 });
  if (!limit.success) return NextResponse.json({ error: "每小時最多建立 60 個練習" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const { mode, category, tier, count } = parsed.data;
  const userId = session.user.id;
  const now = new Date();

  // Prefer due-for-review first, then fill with new words
  const where: Record<string, unknown> = { status: "APPROVED" };
  if (category) where.category = category;
  if (tier) where.tier = tier;

  const [dueProgress, totalPool] = await Promise.all([
    prisma.userVocabProgress.findMany({
      where: {
        userId,
        nextReview: { lte: now },
        mastered: false,
        word: where,
      },
      orderBy: { nextReview: "asc" },
      take: count,
      include: { word: true },
    }),
    prisma.vocabularyWord.count({ where }),
  ]);

  let selectedWords = dueProgress.map((p) => p.word);
  const remaining = count - selectedWords.length;
  if (remaining > 0) {
    const seenIds = await prisma.userVocabProgress.findMany({
      where: { userId }, select: { wordId: true },
    });
    const excludeIds = new Set(seenIds.map((s) => s.wordId));
    const fresh = await prisma.vocabularyWord.findMany({
      where: { ...where, id: { notIn: Array.from(excludeIds) } },
      orderBy: [{ tier: "asc" }, { createdAt: "asc" }],
      take: remaining,
    });
    selectedWords = selectedWords.concat(fresh);
  }

  if (selectedWords.length === 0) {
    return NextResponse.json({
      error: totalPool === 0
        ? "詞庫尚未建立，請聯絡管理員初始化"
        : "已經沒有可複習的單字了，先休息一下吧",
    }, { status: 404 });
  }

  // Shuffle for the session order
  selectedWords = shuffle(selectedWords);

  // Build cards based on mode
  let cards: QuestionCard[] = [];
  if (mode === "FLASHCARD" || mode === "SPELLING") {
    cards = selectedWords.map((w) => ({
      wordId: w.id,
      word: w.word,
      partOfSpeech: w.partOfSpeech,
      definitionEn: w.definitionEn,
      definitionZh: w.definitionZh,
      exampleEn: w.exampleEn,
      exampleZh: w.exampleZh,
      memoryHook: w.memoryHook,
      synonyms: w.synonyms,
      category: w.category,
    }));
  } else {
    // For QUIZ / DEFINITION we need distractors from the same category if possible
    const categories = Array.from(new Set(selectedWords.map((w) => w.category)));
    const distractorPool = await prisma.vocabularyWord.findMany({
      where: {
        status: "APPROVED",
        id: { notIn: selectedWords.map((w) => w.id) },
        category: { in: categories },
      },
      take: 200,
    });

    cards = selectedWords.map((w) => {
      const sameCatPool = distractorPool.filter((d) => d.category === w.category);
      const distractors = shuffle(sameCatPool.length >= 3 ? sameCatPool : distractorPool).slice(0, 3);

      if (mode === "QUIZ") {
        // English word → choose ZH definition
        const opts = shuffle([
          { key: "A", text: w.definitionZh },
          ...distractors.map((d, i) => ({ key: ["B", "C", "D"][i], text: d.definitionZh })),
        ]);
        const correctKey = opts.find((o) => o.text === w.definitionZh)?.key ?? "A";
        return {
          wordId: w.id,
          word: w.word,
          partOfSpeech: w.partOfSpeech,
          definitionEn: w.definitionEn,
          definitionZh: w.definitionZh,
          exampleEn: w.exampleEn,
          exampleZh: w.exampleZh,
          memoryHook: w.memoryHook,
          synonyms: w.synonyms,
          category: w.category,
          choices: opts,
          correctKey,
        };
      }
      // DEFINITION mode — show EN definition, pick correct word
      const opts = shuffle([
        { key: "A", text: w.word },
        ...distractors.map((d, i) => ({ key: ["B", "C", "D"][i], text: d.word })),
      ]);
      const correctKey = opts.find((o) => o.text === w.word)?.key ?? "A";
      return {
        wordId: w.id,
        word: w.word,
        partOfSpeech: w.partOfSpeech,
        definitionEn: w.definitionEn,
        definitionZh: w.definitionZh,
        exampleEn: w.exampleEn,
        exampleZh: w.exampleZh,
        memoryHook: w.memoryHook,
        synonyms: w.synonyms,
        category: w.category,
        choices: opts,
        correctKey,
      };
    });
  }

  const created = await prisma.vocabSession.create({
    data: {
      userId,
      mode,
      tier: tier ?? null,
      category: category ?? null,
      wordIds: selectedWords.map((w) => w.id),
      totalWords: selectedWords.length,
    },
    select: { id: true, startedAt: true },
  });

  return NextResponse.json({
    sessionId: created.id,
    mode,
    cards,
    startedAt: created.startedAt.toISOString(),
  });
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
