#!/usr/bin/env node
/**
 * Convert the bilingual question pool MD/JSON file to an importable JSON array.
 *
 * Usage:
 *   node scripts/export-questions-json.js [input] [output] [--limit=N]
 *
 *   input   Path to nclex_rn_14500_bilingual_pool.md (default: same dir as seed script)
 *   output  Output JSON file path (default: questions-import.json)
 *   --limit=N  Only export first N questions
 *
 * The output file can be imported via the Admin → 題庫管理 → 匯入 JSON button.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const CATEGORY_TO_DOMAIN = {
  management_of_care: "Management of Care",
  safety_and_infection_control: "Safety & Infection Control",
  health_promotion_and_maintenance: "Health Promotion & Maintenance",
  psychosocial_integrity: "Psychosocial Integrity",
  basic_care_and_comfort: "Basic Care & Comfort",
  pharmacological_and_parenteral_therapies: "Pharmacological & Parenteral",
  reduction_of_risk_potential: "Reduction of Risk Potential",
  physiological_adaptation: "Physiological Adaptation",
};
const DIFFICULTY_MAP = { easy: "EASY", medium: "MEDIUM", hard: "HARD" };
const DIFFICULTY_DEFAULT_IRT = {
  EASY: { a: 0.8, b: -1.0, c: 0.20 },
  MEDIUM: { a: 1.0, b: 0.0, c: 0.20 },
  HARD: { a: 1.2, b: 1.0, c: 0.20 },
};

function parseArgs(argv) {
  const args = { positional: [], flags: {} };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--")) {
      const [k, v] = a.substring(2).split("=");
      args.flags[k] = v === undefined ? true : v;
    } else args.positional.push(a);
  }
  return args;
}

function transform(q) {
  const domain = CATEGORY_TO_DOMAIN[q.client_needs_category] ?? null;
  const difficulty = DIFFICULTY_MAP[q.difficulty] ?? "MEDIUM";
  const irt = DIFFICULTY_DEFAULT_IRT[difficulty];
  const opts = q.options ?? [];
  const findOpt = (l) => opts.find((o) => o.id === l);
  const qt = q.question_type === "single_best_answer" ? "MCQ" : "SATA";
  const correctAnswers = (q.correct_answer_ids ?? []).map((s) => String(s).toUpperCase());
  const correctAnswer = correctAnswers.join(",");
  const stem = [q.clinical_scenario_en, q.stem_en].filter(Boolean).join("\n\n");
  const stemZh = [q.clinical_scenario_zh, q.stem_zh].filter(Boolean).join("\n\n") || null;
  const rationales = {};
  for (const o of opts) {
    if (o.id) rationales[o.id] = { en: o.rationale_en ?? null, zh: o.rationale_zh ?? null };
  }
  let explanationZh = q.answer_summary_zh;
  if (!explanationZh?.trim()) {
    explanationZh = rationales[correctAnswers[0]]?.zh ?? "暫無解析";
  }
  return {
    stem,
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
    explanationZh,
    explanationEn: q.answer_summary_en ?? null,
    optionRationales: rationales,
    domain,
    subDomain: q.client_needs_subcategory ?? q.topic_bucket_en ?? null,
    questionType: qt,
    difficulty,
    tags: [q.topic_bucket_en, q.cjmm_step, q.blooms_level, ...(q.integrated_process_tags ?? [])].filter(Boolean),
    cjmmStep: q.cjmm_step ?? null,
    bloomsLevel: q.blooms_level ?? null,
    irtA: irt.a, irtB: irt.b, irtC: irt.c,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.positional[0] ?? "C:\\Users\\alanl\\Downloads\\nclex_rn_14500_bilingual_pool.md";
  const outputPath = args.positional[1] ?? path.join(process.cwd(), "questions-import.json");
  const limit = args.flags.limit ? parseInt(args.flags.limit, 10) : Infinity;

  console.log(`[export] Reading: ${inputPath}`);
  if (!fs.existsSync(inputPath)) {
    console.error(`[export] File not found: ${inputPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, "utf8");
  const pool = JSON.parse(raw);
  const allQuestions = pool.questions ?? pool;
  const slice = allQuestions.slice(0, isFinite(limit) ? limit : allQuestions.length);

  console.log(`[export] Transforming ${slice.length} questions...`);
  const result = slice.map(transform).filter((q) => q.stem && q.optionA && q.correctAnswer);

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`[export] Done. Wrote ${result.length} questions to: ${outputPath}`);
  console.log(`[export] Upload this file via Admin → 題庫管理 → 匯入 JSON`);
}

main().catch((e) => { console.error(e); process.exit(1); });
