import { readFileSync } from "node:fs";
import pg from "pg";

const url = readFileSync(".env.local", "utf8").split(/\r?\n/)
  .find(l => l.startsWith("DATABASE_URL=")).slice(13).replace(/^["']|["']$/g, "");
const c = new pg.Client({ connectionString: url });
await c.connect();

const total = await c.query(`SELECT COUNT(*) FROM "QuestionReport"`);
const byStatus = await c.query(`SELECT status, COUNT(*) FROM "QuestionReport" GROUP BY status ORDER BY 2 DESC`);
const pendingExact = await c.query(`SELECT COUNT(*) FROM "QuestionReport" WHERE status = 'PENDING'`);
const pendingLower = await c.query(`SELECT COUNT(*) FROM "QuestionReport" WHERE status = 'pending'`);
const triagedNotPending = await c.query(`SELECT COUNT(*) FROM "QuestionReport" WHERE "triagedAt" IS NOT NULL AND status IN ('pending','PENDING')`);

console.log("Total reports:", total.rows[0].count);
console.log("\nBy status:");
for (const r of byStatus.rows) console.log(`  ${r.status.padEnd(20)} = ${r.count}`);
console.log(`\nstatus='PENDING' (exact): ${pendingExact.rows[0].count}`);
console.log(`status='pending' (exact): ${pendingLower.rows[0].count}`);
console.log(`triaged but still pending/PENDING: ${triagedNotPending.rows[0].count}`);

await c.end();
