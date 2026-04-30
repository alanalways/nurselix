#!/usr/bin/env node
/**
 * Round 2: sample 5000 NCLEX questions, exclude already-audited (round 1 + claude-manual fixes).
 * Cover the WHOLE id range this time, not just '5'..'b'.
 */
import pg from "pg";
import fs from "node:fs";
import path from "node:path";

const envFile = ".env.local";
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const TARGET = 5000;
const BATCH_SIZE = 100;
const TARGET_DIR = "scripts/subagent-batches";

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// 1) Exclude questions in round 1 batches
const round1Ids = new Set();
const dir = TARGET_DIR;
fs.readdirSync(dir).filter(f => f.startsWith("batch-") && f.endsWith(".json")).forEach(f => {
  const arr = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  arr.forEach(q => round1Ids.add(q.id));
});
console.log(`Round 1 batches contained ${round1Ids.size} unique questions`);

// 2) Exclude questions audited by NIM/Codex/claude-manual
const audited = await c.query(`
  SELECT DISTINCT "questionId"
  FROM "QuestionQualityIssue"
  WHERE "ruleId" LIKE 'agent.%' OR "resolvedBy" = 'claude-manual';
`);
const dbAudited = new Set(audited.rows.map(r => r.questionId));
console.log(`DB-audited (NIM/codex/claude-manual): ${dbAudited.size}`);

// Combine
const skipIds = new Set([...round1Ids, ...dbAudited]);
console.log(`Total skip: ${skipIds.size}`);

// 3) Sample new 5000 across all id ranges
const r = await c.query(`
  SELECT id, stem, "stemZh", "optionA","optionB","optionC","optionD","optionE","optionF",
         "correctAnswer", "correctAnswers", "explanationZh", "optionRationales", "questionType"
  FROM "Question"
  WHERE module='NCLEX' AND status='APPROVED'
  ORDER BY RANDOM()
  LIMIT ${TARGET * 3};
`);

const filtered = r.rows.filter(q => !skipIds.has(q.id)).slice(0, TARGET);
console.log(`Sampled ${filtered.length} new questions`);

// 4) Wipe old batch files (keep verdicts)
fs.readdirSync(dir).filter(f => f.startsWith("batch-") && f.endsWith(".json")).forEach(f => {
  fs.unlinkSync(path.join(dir, f));
});
console.log(`Cleared old batch-*.json`);

// 5) Write new batches (round 2)
const numBatches = Math.ceil(filtered.length / BATCH_SIZE);
for (let i = 0; i < numBatches; i++) {
  const batch = filtered.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
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
    `${dir}/batch-${String(i + 1).padStart(3, "0")}.json`,
    JSON.stringify(slim, null, 2)
  );
}
console.log(`Wrote ${numBatches} round-2 batches`);

await c.end();
