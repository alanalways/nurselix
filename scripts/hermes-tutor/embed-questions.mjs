#!/usr/bin/env node
/**
 * One-shot backfill: embed every NCLEX question and write to QuestionEmbedding.
 * Idempotent — re-running skips rows already present unless --force.
 *
 * CTE-cosine fallback variant: stores embeddings as JSONB (768-element float
 * array). pgvector is unavailable on the Zeabur PG image.
 *
 * Usage:
 *   node scripts/hermes-tutor/embed-questions.mjs [--limit N] [--force]
 */
import { readFileSync } from "node:fs";
import pg from "pg";
import { GoogleGenerativeAI } from "@google/generative-ai";

const url = readFileSync(".env.local", "utf8")
  .split(/\r?\n/)
  .find((l) => l.startsWith("DATABASE_URL="))
  .slice(13)
  .replace(/^["']|["']$/g, "");

const KEYS = Object.keys(process.env)
  .filter((k) => /^GEMINI_API_KEY(_\d+)?$/.test(k))
  .map((k) => process.env[k])
  .filter(Boolean);

if (KEYS.length === 0) {
  console.error("No GEMINI_API_KEY_1..10 (or GEMINI_API_KEY) configured. Aborting.");
  process.exit(1);
}

const args = process.argv.slice(2);
const LIMIT = (() => {
  const i = args.indexOf("--limit");
  return i < 0 ? 0 : parseInt(args[i + 1], 10);
})();
const FORCE = args.includes("--force");

const c = new pg.Client({ connectionString: url });
await c.connect();

const where = FORCE
  ? `q.module = 'NCLEX'`
  : `q.module = 'NCLEX' AND NOT EXISTS (SELECT 1 FROM "QuestionEmbedding" e WHERE e."questionId" = q.id)`;
const r = await c.query(`
  SELECT q.id, q.stem, q."stemZh", q."explanationZh"
  FROM "Question" q
  WHERE ${where}
  ORDER BY q.id ASC
  ${LIMIT > 0 ? `LIMIT ${LIMIT}` : ""}
`);
console.log(`To embed: ${r.rows.length} questions (using ${KEYS.length} API keys)`);

let keyIdx = 0;
let ok = 0,
  fail = 0;

for (const q of r.rows) {
  const text = [q.stem, q.stemZh, q.explanationZh?.slice(0, 1500)].filter(Boolean).join("\n\n");
  const apiKey = KEYS[keyIdx % KEYS.length];
  keyIdx++;
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: "text-embedding-004" });
  try {
    const result = await model.embedContent({
      content: { role: "user", parts: [{ text: text.slice(0, 8000) }] },
      taskType: "RETRIEVAL_DOCUMENT",
    });
    const vec = result.embedding.values;
    if (!Array.isArray(vec) || vec.length !== 768) {
      throw new Error(`embedding had ${vec?.length} dims, expected 768`);
    }
    await c.query(
      `INSERT INTO "QuestionEmbedding" ("questionId", embedding, model, "updatedAt")
       VALUES ($1, $2::jsonb, 'text-embedding-004', (NOW() AT TIME ZONE 'UTC'))
       ON CONFLICT ("questionId") DO UPDATE
         SET embedding = EXCLUDED.embedding,
             "updatedAt" = (NOW() AT TIME ZONE 'UTC')`,
      [q.id, JSON.stringify(vec)]
    );
    ok++;
    if (ok % 50 === 0) console.log(`  ok=${ok} fail=${fail}`);
  } catch (e) {
    fail++;
    console.log(`  FAIL ${q.id.slice(0, 8)}: ${e.message?.slice(0, 80)}`);
    // back-off on rate limit
    if (e.message?.includes("429") || e.message?.includes("rate")) {
      await new Promise((r) => setTimeout(r, 30_000));
    }
  }
  // throttle: 60 req/min budget per key, with 10 keys = 600/min, but stay safe
  if (keyIdx % 10 === 0) await new Promise((r) => setTimeout(r, 1000));
}

console.log(`\nDone. ok=${ok} fail=${fail}`);
await c.end();
