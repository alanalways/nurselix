import { readFileSync } from "node:fs";
import pg from "pg";

const url = readFileSync(".env.local", "utf8").split(/\r?\n/)
  .find(l => l.startsWith("DATABASE_URL=")).slice(13).replace(/^["']|["']$/g, "");
const c = new pg.Client({ connectionString: url });
await c.connect();

const total = await c.query(`SELECT COUNT(*) FROM "MarketingContent"`);
const byStatus = await c.query(`SELECT status, COUNT(*) FROM "MarketingContent" GROUP BY status ORDER BY 2 DESC`);
const recent = await c.query(`SELECT id, "contentType", platform, status, "generatedAt", title FROM "MarketingContent" ORDER BY "generatedAt" DESC LIMIT 5`);

console.log("Total marketing content:", total.rows[0].count);
console.log("\nBy status:");
for (const r of byStatus.rows) console.log(`  ${r.status.padEnd(15)} = ${r.count}`);
console.log("\nMost recent 5:");
for (const r of recent.rows) console.log(`  ${r.id.slice(0,8)} | ${(r.contentType || "?").padEnd(15)} | ${(r.platform||"-").padEnd(10)} | ${(r.status||"?").padEnd(10)} | ${new Date(r.generatedAt).toISOString().slice(0,19)} | ${(r.title||"").slice(0,40)}`);

await c.end();
