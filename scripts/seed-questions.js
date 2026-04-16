#!/usr/bin/env node
/**
 * NCLEX bilingual question pool importer.
 *
 * Usage:
 *   node scripts/seed-questions.js [pool_path] [--limit=N] [--truncate]
 *
 *   pool_path   Path to the 14500-question JSON pool (.md / .json).
 *               Default: C:\Users\alanl\Downloads\nclex_rn_14500_bilingual_pool.md
 *   --limit=N   Only import the first N questions (useful for dev).
 *   --truncate  Wipe the Question table before importing (DANGEROUS).
 *
 * The pool file is a JSON object with { metadata, questions: [...] } structure;
 * each question has EN + ZH text, up to 6 options, correct_answer_ids, rationales,
 * CJMM / Bloom's / difficulty / category metadata.
 *
 * Import plan:
 *   - single_best_answer → questionType MCQ, correctAnswer = single letter
 *   - sata               → questionType SATA, correctAnswer = "B,C,E"
 *                           correctAnswers = ["B","C","E"]
 *   - All items set to APPROVED status so they can be served immediately.
 *   - IRT parameters default based on difficulty until recalibrated.
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

require("dotenv").config?.();

const DEFAULT_POOL_PATH = "C:\\Users\\alanl\\Downloads\\nclex_rn_14500_bilingual_pool.md";

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
    } else {
      args.positional.push(a);
    }
  }
  return args;
}

function uuid() {
  return crypto.randomUUID();
}

function transformQuestion(q) {
  const domain = CATEGORY_TO_DOMAIN[q.client_needs_category] ?? null;
  const difficulty = DIFFICULTY_MAP[q.difficulty] ?? "MEDIUM";
  const defaults = DIFFICULTY_DEFAULT_IRT[difficulty];

  const opts = q.options ?? [];
  const findOpt = (letter) => opts.find((o) => o.id === letter);

  const qt = q.question_type === "single_best_answer" ? "MCQ" : "SATA";
  const correctAnswers = (q.correct_answer_ids ?? []).map((s) => String(s).toUpperCase());
  const correctAnswer = correctAnswers.join(",");

  // Combine scenario + stem for "stem" (English shown primarily)
  const stem = [q.clinical_scenario_en, q.stem_en].filter(Boolean).join("\n\n");
  const stemZh = [q.clinical_scenario_zh, q.stem_zh].filter(Boolean).join("\n\n") || null;

  // Build per-option rationales (JSON)
  const rationales = {};
  for (const o of opts) {
    if (o.id) rationales[o.id] = { en: o.rationale_en ?? null, zh: o.rationale_zh ?? null };
  }

  // Explanation = answer_summary_zh as primary ZH explanation (fallback: rationale of correct option)
  let explanationZh = q.answer_summary_zh;
  if (!explanationZh || explanationZh.trim() === "") {
    const correctLetter = correctAnswers[0];
    explanationZh = rationales[correctLetter]?.zh ?? "暫無解析";
  }
  const explanationEn = q.answer_summary_en ?? null;

  // Tags: collect CJMM step, Bloom's, topic, cjmm+integrated process
  const tags = [
    q.topic_bucket_en,
    q.cjmm_step,
    q.blooms_level,
    ...(q.integrated_process_tags ?? []),
  ].filter(Boolean);

  return {
    id: uuid(),
    module: "NCLEX",
    questionType: qt,
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
    explanationEn,
    usTwDifference: null,
    optionRationales: rationales,
    domain,
    subDomain: q.client_needs_subcategory ?? q.topic_bucket_en ?? null,
    tags,
    cjmmStep: q.cjmm_step ?? null,
    bloomsLevel: q.blooms_level ?? null,
    caseStudySetId: q.item_set_mode === "case_study" ? q.case_study_set_id : null,
    caseStudyPosition: q.case_study_position ? Number(q.case_study_position) : null,
    irtA: defaults.a,
    irtB: defaults.b,
    irtC: defaults.c,
    difficulty,
    status: "APPROVED",
    createdBy: "pool-import",
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const poolPath = args.positional[0] ?? DEFAULT_POOL_PATH;
  const limit = args.flags.limit ? Number(args.flags.limit) : null;
  const truncate = !!args.flags.truncate;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[seed-questions] DATABASE_URL is not set");
    process.exit(1);
  }

  if (!fs.existsSync(poolPath)) {
    console.error(`[seed-questions] Pool file not found: ${poolPath}`);
    process.exit(1);
  }

  console.log(`[seed-questions] Loading ${poolPath}`);
  const raw = fs.readFileSync(poolPath, "utf8");
  console.log(`[seed-questions] Parsing ${(raw.length / 1024 / 1024).toFixed(1)} MB of JSON`);
  const data = JSON.parse(raw);

  const all = data.questions ?? [];
  const items = limit ? all.slice(0, limit) : all;
  console.log(`[seed-questions] Will import ${items.length} questions`);

  const pool = new Pool({ connectionString, max: 4 });
  const client = await pool.connect();

  try {
    if (truncate) {
      console.log('[seed-questions] Truncating "Question" table...');
      await client.query('TRUNCATE TABLE "Question" RESTART IDENTITY CASCADE');
    }

    // Check how many are already in DB (skip by ID basis not possible; use simple count)
    const existing = await client.query('SELECT COUNT(*)::int AS n FROM "Question" WHERE "createdBy" = $1', ["pool-import"]);
    if (existing.rows[0].n >= items.length && !truncate) {
      console.log(`[seed-questions] Already have ${existing.rows[0].n} pool-imported questions — skipping. Use --truncate to reset.`);
      return;
    }

    const BATCH = 200;
    let inserted = 0;
    let skipped = 0;

    const colList = [
      "id", "module", "questionType",
      "stem", "stemZh", "scenarioEn", "scenarioZh",
      "optionA", "optionB", "optionC", "optionD", "optionE", "optionF",
      "correctAnswer", "correctAnswers",
      "explanationZh", "explanationEn",
      "optionRationales", "domain", "subDomain", "tags",
      "cjmmStep", "bloomsLevel", "caseStudySetId", "caseStudyPosition",
      "irtA", "irtB", "irtC", "difficulty", "status", "createdBy", "updatedAt",
    ];
    const quotedCols = colList.map((c) => `"${c}"`).join(", ");

    for (let i = 0; i < items.length; i += BATCH) {
      const slice = items.slice(i, i + BATCH);
      const values = [];
      const placeholders = [];

      slice.forEach((raw, idx) => {
        try {
          const t = transformQuestion(raw);
          const now = new Date().toISOString();
          const row = [
            t.id, t.module, t.questionType,
            t.stem, t.stemZh, t.scenarioEn, t.scenarioZh,
            t.optionA, t.optionB, t.optionC, t.optionD, t.optionE, t.optionF,
            t.correctAnswer, t.correctAnswers,
            t.explanationZh, t.explanationEn,
            JSON.stringify(t.optionRationales ?? {}),
            t.domain, t.subDomain, t.tags,
            t.cjmmStep, t.bloomsLevel, t.caseStudySetId, t.caseStudyPosition,
            t.irtA, t.irtB, t.irtC, t.difficulty, t.status, t.createdBy, now,
          ];
          const base = idx * colList.length;
          placeholders.push(
            "(" + colList.map((_, k) => `$${base + k + 1}`).join(", ") + ")"
          );
          values.push(...row);
        } catch (err) {
          skipped++;
          console.warn(`[seed-questions] Skipped item at index ${i + idx}: ${err.message}`);
        }
      });

      if (placeholders.length === 0) continue;

      const sql = `INSERT INTO "Question" (${quotedCols}) VALUES ${placeholders.join(", ")}`;
      await client.query(sql, values);
      inserted += placeholders.length;

      if ((inserted % 1000) < BATCH) {
        console.log(`[seed-questions] Inserted ${inserted}/${items.length}`);
      }
    }

    console.log(`[seed-questions] Done. Inserted: ${inserted}, Skipped: ${skipped}`);

    // Quick sanity check
    const verify = await client.query(
      'SELECT "domain", COUNT(*)::int AS n FROM "Question" WHERE "status" = $1 GROUP BY "domain" ORDER BY n DESC',
      ["APPROVED"],
    );
    console.log("[seed-questions] Distribution by domain (APPROVED):");
    for (const r of verify.rows) console.log(`   ${r.domain ?? "(none)"}: ${r.n}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[seed-questions] Fatal error:", err);
  process.exit(1);
});
