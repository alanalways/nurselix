import { readFileSync } from "node:fs";
import pg from "pg";

const url = readFileSync(".env.local", "utf8").split(/\r?\n/)
  .find(l => l.startsWith("DATABASE_URL=")).slice(13).replace(/^["']|["']$/g, "");
const c = new pg.Client({ connectionString: url });
await c.connect();

const total = await c.query(`SELECT status, COUNT(*) FROM "QuestionQualityIssue" WHERE severity='CRITICAL' GROUP BY status ORDER BY 2 DESC`);
const byResolvedBy = await c.query(`SELECT "resolvedBy", COUNT(*) FROM "QuestionQualityIssue" WHERE severity='CRITICAL' AND "resolvedBy" IS NOT NULL GROUP BY "resolvedBy"`);
const oldestOpen = await c.query(`SELECT id, "ruleId", "questionId", "detectedAt" FROM "QuestionQualityIssue" WHERE severity='CRITICAL' AND status='OPEN' ORDER BY "detectedAt" ASC LIMIT 5`);

console.log("=== CRITICAL issues by status ===");
for (const r of total.rows) console.log(`  ${r.status.padEnd(15)} = ${r.count}`);

console.log("\n=== resolvedBy breakdown ===");
if (byResolvedBy.rows.length === 0) console.log("  (none yet)");
for (const r of byResolvedBy.rows) console.log(`  ${r.resolvedBy.padEnd(35)} = ${r.count}`);

console.log("\n=== oldest 5 OPEN CRITICAL (next cron will pick these) ===");
for (const r of oldestOpen.rows) {
  console.log(`  ${r.id.slice(0,8)} | ${r.ruleId.padEnd(30)} | qid=${r.questionId.slice(0,8)} | ${new Date(r.detectedAt).toISOString().slice(0,19)}`);
}

await c.end();
