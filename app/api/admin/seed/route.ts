import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const CATEGORY_TO_DOMAIN: Record<string, string> = {
  management_of_care: "Management of Care",
  safety_and_infection_control: "Safety & Infection Control",
  health_promotion_and_maintenance: "Health Promotion & Maintenance",
  psychosocial_integrity: "Psychosocial Integrity",
  basic_care_and_comfort: "Basic Care & Comfort",
  pharmacological_and_parenteral_therapies: "Pharmacological & Parenteral",
  reduction_of_risk_potential: "Reduction of Risk Potential",
  physiological_adaptation: "Physiological Adaptation",
};
const DIFFICULTY_MAP: Record<string, "EASY" | "MEDIUM" | "HARD"> = {
  easy: "EASY", medium: "MEDIUM", hard: "HARD",
};
const IRT_DEFAULTS = {
  EASY: { a: 0.8, b: -1.0, c: 0.20 },
  MEDIUM: { a: 1.0, b: 0.0, c: 0.20 },
  HARD: { a: 1.2, b: 1.0, c: 0.20 },
};

function transformQuestion(q: any) {
  const domain = CATEGORY_TO_DOMAIN[q.client_needs_category] ?? null;
  const difficulty = DIFFICULTY_MAP[q.difficulty] ?? "MEDIUM";
  const irt = IRT_DEFAULTS[difficulty];
  const opts: any[] = q.options ?? [];
  const findOpt = (l: string) => opts.find((o) => o.id === l);
  const qt = q.question_type === "single_best_answer" ? "MCQ" : "SATA";
  const correctAnswers = (q.correct_answer_ids ?? []).map((s: any) => String(s).toUpperCase());
  const correctAnswer = correctAnswers.join(",");
  const stem = [q.clinical_scenario_en, q.stem_en].filter(Boolean).join("\n\n");
  const stemZh = [q.clinical_scenario_zh, q.stem_zh].filter(Boolean).join("\n\n") || null;
  const rationales: Record<string, unknown> = {};
  for (const o of opts) {
    if (o.id) rationales[o.id] = { en: o.rationale_en ?? null, zh: o.rationale_zh ?? null };
  }
  let explanationZh = q.answer_summary_zh;
  if (!explanationZh?.trim()) {
    explanationZh = (rationales[correctAnswers[0]] as any)?.zh ?? "暫無解析";
  }
  const tags = [q.topic_bucket_en, q.cjmm_step, q.blooms_level, ...(q.integrated_process_tags ?? [])].filter(Boolean) as string[];

  return {
    stem: stem || "—",
    stemZh,
    scenarioEn: q.clinical_scenario_en ?? null,
    scenarioZh: q.clinical_scenario_zh ?? null,
    optionA: findOpt("A")?.text_en ?? "",
    optionB: findOpt("B")?.text_en ?? "",
    optionC: findOpt("C")?.text_en ?? "",
    optionD: findOpt("D")?.text_en ?? "",
    optionE: findOpt("E")?.text_en ?? null,
    optionF: findOpt("F")?.text_en ?? null,
    correctAnswer,
    correctAnswers,
    explanationZh: explanationZh || "暫無解析",
    explanationEn: q.answer_summary_en ?? null,
    optionRationales: rationales as any,
    domain,
    subDomain: q.client_needs_subcategory ?? q.topic_bucket_en ?? null,
    questionType: qt as "MCQ" | "SATA",
    difficulty,
    tags,
    cjmmStep: q.cjmm_step ?? null,
    bloomsLevel: q.blooms_level ?? null,
    caseStudySetId: q.item_set_mode === "case_study" ? (q.case_study_set_id ?? null) : null,
    caseStudyPosition: q.case_study_position ? Number(q.case_study_position) : null,
    irtA: irt.a, irtB: irt.b, irtC: irt.c,
    status: "APPROVED" as const,
    module: "NCLEX" as const,
    createdBy: "pool-import",
  };
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const driveId = (body.driveId as string) ?? "1R3RyhLvF9rFsCgX5lXwQ0Q_jJ56djo4F";
  const limit = body.limit ? Number(body.limit) : undefined;

  const downloadUrl = `https://drive.google.com/uc?export=download&id=${driveId}`;

  let pool: any;
  try {
    const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) return NextResponse.json({ error: `Drive download failed: ${res.status}` }, { status: 502 });
    pool = await res.json();
  } catch (e: any) {
    return NextResponse.json({ error: `Download error: ${e.message}` }, { status: 502 });
  }

  const allQuestions: any[] = pool.questions ?? pool;
  const toImport = limit ? allQuestions.slice(0, limit) : allQuestions;

  const transformed = toImport
    .map(transformQuestion)
    .filter((q) => q.stem && q.optionA && q.correctAnswer);

  const CHUNK = 500;
  let inserted = 0;
  let skipped = 0;
  const now = new Date();

  for (let i = 0; i < transformed.length; i += CHUNK) {
    const chunk = transformed.slice(i, i + CHUNK);
    try {
      const r = await prisma.question.createMany({
        data: chunk.map((q) => ({ ...q, createdAt: now, updatedAt: now })),
        skipDuplicates: true,
      });
      inserted += r.count;
    } catch {
      skipped += chunk.length;
    }
  }

  const domainStats = await prisma.question.groupBy({
    by: ["domain"],
    where: { status: "APPROVED" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });

  return NextResponse.json({
    ok: true,
    total: transformed.length,
    inserted,
    skipped,
    domainStats: domainStats.map((d) => ({ domain: d.domain, count: d._count.id })),
  });
}
