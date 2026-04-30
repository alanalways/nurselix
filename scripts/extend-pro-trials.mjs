/**
 * 一次性：把所有 PRO 試用使用者延長一週。
 * 用於：beta 結束後讓既有試用者多體驗一週再付費。
 *
 * 安全策略：
 *  - 只動 plan=PRO 且仍有 trialEndsAt 的；不動 ELITE / ADMIN / 已付費 (subscriptionEndsAt)
 *  - 把 trialEndsAt 從原本的日期 + 7 天，且不少於 NOW + 7 天
 *
 * 執行：node scripts/extend-pro-trials.mjs
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const url = readFileSync(".env.local", "utf8").split(/\r?\n/)
  .find(l => l.startsWith("DATABASE_URL=")).slice(13).replace(/^["']|["']$/g, "");
const c = new pg.Client({ connectionString: url });
await c.connect();

const before = await c.query(
  `SELECT email, plan, "trialEndsAt"
   FROM "User"
   WHERE plan = 'PRO' AND "subscriptionEndsAt" IS NULL AND "trialEndsAt" IS NOT NULL
   ORDER BY "trialEndsAt"`
);
console.log(`Found ${before.rows.length} PRO trial users:`);
for (const u of before.rows) console.log(`  ${u.email.padEnd(36)} trial=${u.trialEndsAt.toISOString().slice(0,10)}`);

// 延長一週：MAX(原本 trialEndsAt + 7 day, NOW + 7 day)
const r = await c.query(`
  UPDATE "User"
  SET "trialEndsAt" = GREATEST(
        "trialEndsAt" + INTERVAL '7 days',
        NOW() + INTERVAL '7 days'
      )
  WHERE plan = 'PRO'
    AND "subscriptionEndsAt" IS NULL
    AND "trialEndsAt" IS NOT NULL
  RETURNING email, "trialEndsAt"
`);

console.log(`\nUpdated ${r.rowCount} users:`);
for (const u of r.rows) console.log(`  ${u.email.padEnd(36)} new trial=${u.trialEndsAt.toISOString().slice(0,10)}`);

await c.end();
