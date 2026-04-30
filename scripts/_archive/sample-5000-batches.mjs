#!/usr/bin/env node
/**
 * Sample 5000 NCLEX questions, exclude already-audited ones, split into batches.
 */
import pg from "pg";
import fs from "node:fs";

const envFile = ".env.local";
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const TARGET = 5000;
const BATCH_SIZE = 100; // 50 batches total
const TARGET_DIR = "scripts/subagent-batches";

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// Exclude questions already audited or fixed
const audited = await c.query(`
  SELECT DISTINCT "questionId"
  FROM "QuestionQualityIssue"
  WHERE "ruleId" LIKE 'agent.%' OR "resolvedBy" = 'claude-manual';
`);
const skipIds = new Set(audited.rows.map(r => r.questionId));
console.log(`Excluding ${skipIds.size} already-audited questions`);

// Sample 5000 from id range '5'..'b' (avoid NIM's working range '0'..'4')
// Plus c..f (NIM hasn't reached) for diversity
const r = await c.query(`
  SELECT id, stem, "stemZh", "optionA","optionB","optionC","optionD","optionE","optionF",
         "correctAnswer", "correctAnswers", "explanationZh", "optionRationales", "questionType"
  FROM "Question"
  WHERE module='NCLEX' AND status='APPROVED'
    AND (id > '5' AND id < 'b' OR id > 'c' AND id < 'f')
  ORDER BY RANDOM()
  LIMIT ${TARGET * 2};
`);

const filtered = r.rows.filter(q => !skipIds.has(q.id)).slice(0, TARGET);
console.log(`Sampled ${filtered.length} questions`);

// Split into batches
fs.mkdirSync(TARGET_DIR, { recursive: true });
const numBatches = Math.ceil(filtered.length / BATCH_SIZE);
for (let i = 0; i < numBatches; i++) {
  const batch = filtered.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
  // Shrink each question to essentials to save tokens
  const slim = batch.map(q => ({
    id: q.id,
    type: q.questionType,
    stem: q.stem,
    stemZh: q.stemZh,
    A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD,
    E: q.optionE, F: q.optionF,
    answer: q.correctAnswer,
    explanationZh: q.explanationZh,
    rationales: q.optionRationales,
  }));
  fs.writeFileSync(
    `${TARGET_DIR}/batch-${String(i + 1).padStart(3, "0")}.json`,
    JSON.stringify(slim, null, 2)
  );
}
console.log(`Wrote ${numBatches} batch files of ~${BATCH_SIZE} each to ${TARGET_DIR}/`);

await c.end();
