/**
 * Hermes vocab helper — recommends today's vocab focus based on:
 *  - words due for review (SM-2)
 *  - user's weakest domains (from LearnerProfile)
 *  - auto-extracted terms from recent wrong questions
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DOMAIN_TO_VOCAB_CATEGORY: Record<string, string> = {
  "Pharmacological and Parenteral Therapies": "Pharmacology",
  "Pharmacology":                                 "Pharmacology",
  "Physiological Adaptation":                     "Pathophysiology",
  "Reduction of Risk Potential":                  "Lab Values & Diagnostics",
  "Basic Care and Comfort":                       "Procedures & Skills",
  "Safety and Infection Control":                 "Patient Safety & Priority",
  "Management of Care":                           "Nursing Process & Delegation",
  "Health Promotion and Maintenance":             "Maternal-Newborn",
  "Psychosocial Integrity":                       "Mental Health",
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const now = new Date();

  const [dueCount, profile, masteredCount, totalVocab] = await Promise.all([
    prisma.userVocabProgress.count({ where: { userId, nextReview: { lte: now }, mastered: false } }),
    prisma.learnerProfile.findUnique({ where: { userId } }),
    prisma.userVocabProgress.count({ where: { userId, mastered: true } }),
    prisma.vocabularyWord.count({ where: { status: "APPROVED" } }),
  ]);

  const weakDomains = (profile?.topWeaknesses ?? []) as string[];
  const recommendCats = Array.from(new Set(
    weakDomains
      .map((d) => DOMAIN_TO_VOCAB_CATEGORY[d])
      .filter((c): c is string => !!c)
  ));

  // Suggest 5 words: prefer due words; fallback to unseen tier-1/2 words from recommended categories
  const dueWords = await prisma.userVocabProgress.findMany({
    where: { userId, nextReview: { lte: now }, mastered: false },
    orderBy: { nextReview: "asc" },
    take: 5,
    include: { word: { select: { id: true, word: true, definitionZh: true, category: true, tier: true } } },
  });

  let suggestions = dueWords.map((p) => ({
    id:           p.word.id,
    word:         p.word.word,
    definitionZh: p.word.definitionZh,
    category:     p.word.category,
    tier:         p.word.tier,
    reason:       "due",
  }));

  if (suggestions.length < 5) {
    const seen = await prisma.userVocabProgress.findMany({ where: { userId }, select: { wordId: true } });
    const excludeIds = seen.map((s) => s.wordId);
    const filler = await prisma.vocabularyWord.findMany({
      where: {
        status: "APPROVED",
        id: { notIn: excludeIds },
        ...(recommendCats.length > 0 ? { category: { in: recommendCats } } : {}),
      },
      orderBy: [{ tier: "asc" }, { createdAt: "asc" }],
      take: 5 - suggestions.length,
    });
    suggestions = suggestions.concat(filler.map((w) => ({
      id:           w.id,
      word:         w.word,
      definitionZh: w.definitionZh,
      category:     w.category,
      tier:         w.tier,
      reason:       "weak_domain",
    })));
  }

  return NextResponse.json({
    dueCount,
    masteredCount,
    totalVocab,
    recommendedCategories: recommendCats,
    suggestions,
  });
}
