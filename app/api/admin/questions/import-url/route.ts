import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const ADVERB_RE = /(aggressively|fiercely|deeply|essentially|completely|entirely|absolutely|violently|purely|flawlessly|strictly|exclusively|thoroughly|directly|heavily|perfectly|smoothly|cleanly|safely|incredibly|seamlessly|magically)/gi;

const VALID_DOMAINS = new Set([
  "Management of Care",
  "Safety & Infection Control",
  "Health Promotion & Maintenance",
  "Psychosocial Integrity",
  "Basic Care & Comfort",
  "Pharmacological and Parenteral Therapies",
  "Reduction of Risk Potential",
  "Physiological Adaptation",
]);

function isGibberish(en: string): boolean {
  const matches = en.match(ADVERB_RE) ?? [];
  return matches.length > 15 || en.length > 800;
}

function validate(q: Record<string, unknown>): string | null {
  if (!q.stem || !q.optionA || !q.optionB || !q.optionC || !q.optionD)
    return "missing required fields";
  if (!q.explanationZh) return "missing explanationZh";
  if (q.questionType === "MCQ" && q.correctAnswers !== null && q.correctAnswers !== undefined)
    return "MCQ correctAnswers must be null";
  if (q.questionType === "SATA" && q.correctAnswer !== null && q.correctAnswer !== undefined)
    return "SATA correctAnswer must be null";
  if (q.questionType === "SATA" && (!Array.isArray(q.correctAnswers) || (q.correctAnswers as string[]).length < 2))
    return "SATA needs ≥2 correctAnswers";
  if (!q.usTwDifference) return "missing usTwDifference";
  if (q.domain && !VALID_DOMAINS.has(q.domain as string)) return `invalid domain: ${q.domain}`;

  // Gibberish check on rationales
  const rationales = q.optionRationales as Record<string, { en?: string }> | undefined;
  if (rationales) {
    for (const letter of ["A", "B", "C", "D", "E"]) {
      const en = rationales[letter]?.en ?? "";
      if (isGibberish(en)) return `option ${letter} rationale looks like gibberish`;
    }
  }

  return null;
}

// Convert Google Drive share URL to direct download URL
function toDriveDirectUrl(url: string): string {
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  return url;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  let url: string;
  try {
    const body = await req.json();
    url = String(body.url ?? "").trim();
    if (!url) throw new Error("missing url");
  } catch {
    return NextResponse.json({ error: "Provide { url: '...' }" }, { status: 400 });
  }

  // Fetch the JSON from the URL
  const fetchUrl = toDriveDirectUrl(url);
  let raw: unknown[];
  try {
    const res = await fetch(fetchUrl, {
      headers: { "User-Agent": "Nurslix-ImportBot/1.0" },
      redirect: "follow",
    });
    if (!res.ok) return NextResponse.json({ error: `Fetch failed: HTTP ${res.status}` }, { status: 400 });
    const text = await res.text();
    const parsed = JSON.parse(text);
    raw = Array.isArray(parsed) ? parsed : parsed.questions ?? [];
  } catch (err) {
    return NextResponse.json({ error: `Failed to fetch/parse JSON: ${String(err)}` }, { status: 400 });
  }

  // Filter
  const good: Record<string, unknown>[] = [];
  const badReasons: { idx: number; reason: string }[] = [];

  for (let i = 0; i < raw.length; i++) {
    const q = raw[i] as Record<string, unknown>;
    const reason = validate(q);
    if (reason) badReasons.push({ idx: i, reason });
    else good.push(q);
  }

  if (good.length === 0) {
    return NextResponse.json({ error: "No valid questions found", badReasons }, { status: 400 });
  }

  // Insert in chunks
  const adminId = (guard as { user?: { id?: string } }).user?.id ?? "admin";
  const now = new Date();
  const IRT: Record<string, { a: number; b: number }> = {
    EASY: { a: 0.8, b: -1.0 }, MEDIUM: { a: 1.0, b: 0.0 }, HARD: { a: 1.2, b: 1.0 },
  };

  const CHUNK = 500;
  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < good.length; i += CHUNK) {
    const chunk = good.slice(i, i + CHUNK);
    try {
      const result = await prisma.question.createMany({
        data: chunk.map((q) => {
          const diff = (["EASY","MEDIUM","HARD"].includes(q.difficulty as string) ? q.difficulty : "MEDIUM") as string;
          const irt = IRT[diff];
          const cas = Array.isArray(q.correctAnswers) && (q.correctAnswers as string[]).length
            ? (q.correctAnswers as string[]).map((s) => s.toUpperCase())
            : String(q.correctAnswer ?? "A").toUpperCase().split(",").map((s) => s.trim());
          const ca = (q.correctAnswer as string | null)?.toUpperCase() ?? cas.join(",");
          return {
            stem: String(q.stem),
            stemZh: (q.stemZh as string) ?? null,
            optionA: String(q.optionA),
            optionB: String(q.optionB),
            optionC: String(q.optionC),
            optionD: String(q.optionD),
            optionE: (q.optionE as string) ?? null,
            correctAnswer: ca,
            correctAnswers: cas,
            explanationZh: String(q.explanationZh),
            optionRationales: (q.optionRationales as object) ?? undefined,
            usTwDifference: (q.usTwDifference as string) ?? null,
            domain: (q.domain as string) ?? null,
            questionType: q.questionType === "SATA" ? "SATA" : "MCQ",
            difficulty: diff,
            tags: [],
            irtA: (q.irtA as number) ?? irt.a,
            irtB: (q.irtB as number) ?? irt.b,
            irtC: 0.20,
            status: "APPROVED" as const,
            createdBy: adminId,
            createdAt: now,
            updatedAt: now,
          };
        }),
        skipDuplicates: true,
      });
      inserted += result.count;
    } catch {
      skipped += chunk.length;
    }
  }

  return NextResponse.json({
    total: raw.length,
    passed: good.length,
    rejected: badReasons.length,
    inserted,
    skipped,
    badReasons: badReasons.slice(0, 10),
  });
}
