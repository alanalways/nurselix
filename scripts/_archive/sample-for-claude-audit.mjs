#!/usr/bin/env node
/**
 * Sample 250 NCLEX questions for Claude's manual audit.
 * Strategy: pick from id range '5'..'b' (NIM is working from start, hasn't reached
 * here yet). Bias toward SATA (1.5x weight) since they have more rationale fields
 * and are more error-prone.
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

const TARGET = 250;
const SATA_TARGET = 100;
const MCQ_TARGET = TARGET - SATA_TARGET;

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();

// Avoid IDs already audited or already fixed
const alreadyAudited = await c.query(`
  SELECT DISTINCT q.id
  FROM "Question" q
  JOIN "QuestionQualityIssue" i ON i."questionId" = q.id
  WHERE i."ruleId" LIKE 'agent.%' OR i."resolvedBy" = 'claude-manual';
`);
const skipIds = new Set(alreadyAudited.rows.map(r => r.id));
console.log(`Skip IDs (already audited or fixed): ${skipIds.size}`);

const sata = await c.query(`
  SELECT id, stem, "stemZh", "optionA","optionB","optionC","optionD","optionE","optionF",
         "correctAnswer", "correctAnswers", "explanationZh", "optionRationales", "questionType"
  FROM "Question"
  WHERE module='NCLEX' AND status='APPROVED'
    AND id > '5' AND id < 'b'
    AND "questionType" = 'SATA'
  ORDER BY RANDOM() LIMIT ${SATA_TARGET * 2};
`);
const mcq = await c.query(`
  SELECT id, stem, "stemZh", "optionA","optionB","optionC","optionD","optionE","optionF",
         "correctAnswer", "correctAnswers", "explanationZh", "optionRationales", "questionType"
  FROM "Question"
  WHERE module='NCLEX' AND status='APPROVED'
    AND id > '5' AND id < 'b'
    AND "questionType" = 'MCQ'
  ORDER BY RANDOM() LIMIT ${MCQ_TARGET * 2};
`);

const filteredSata = sata.rows.filter(q => !skipIds.has(q.id)).slice(0, SATA_TARGET);
const filteredMcq = mcq.rows.filter(q => !skipIds.has(q.id)).slice(0, MCQ_TARGET);
const sample = [...filteredSata, ...filteredMcq];

fs.writeFileSync("scripts/claude-audit-sample.json", JSON.stringify(sample, null, 2));
console.log(`Wrote ${sample.length} questions (${filteredSata.length} SATA + ${filteredMcq.length} MCQ) to scripts/claude-audit-sample.json`);

await c.end();
