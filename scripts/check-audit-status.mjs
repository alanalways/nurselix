#!/usr/bin/env node
/**
 * Quick health check for the Zeabur audit worker.
 * Run: node scripts/check-audit-status.mjs
 *
 * Tells you in plain words whether NIM is alive, dead, or slow.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const { Client } = pg;

// Read DATABASE_URL straight from .env.local (no dotenv dep needed)
function readEnvLocal(key) {
  try {
    const txt = readFileSync(".env.local", "utf8");
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (m && m[1] === key) {
        let v = m[2].trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
          v = v.slice(1, -1);
        }
        return v;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

const url = readEnvLocal("DATABASE_URL");
if (!url) {
  console.error("X  DATABASE_URL missing in .env.local");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();

const now = new Date();
const fmt = (d) => d ? new Date(d).toLocaleString("zh-TW", { hour12: false }) : "—";
const minsAgo = (d) => d ? Math.round((now - new Date(d)) / 60000) : null;

// --- 1. NCLEX universe ---
const totalQ = await client.query(
  `SELECT COUNT(*) FROM "Question" WHERE module='NCLEX' AND status='APPROVED'`
);
const totalNclex = +totalQ.rows[0].count;

// --- 2. Audited (distinct questions touched by NIM) ---
const audited = await client.query(
  `SELECT COUNT(DISTINCT "questionId") FROM "QuestionQualityIssue" WHERE "ruleId" LIKE 'agent.%'`
);
const auditedCount = +audited.rows[0].count;

// --- 3. Heartbeat = TRUE last sign of life (written after every Q, OK or not) ---
const hbRes = await client.query(
  `SELECT value, "updatedAt" FROM "AppSetting" WHERE key='audit.heartbeat'`
);
let heartbeat = null;
let hbAgo = null;
if (hbRes.rows[0]) {
  try {
    heartbeat = JSON.parse(hbRes.rows[0].value);
    heartbeat.updatedAt = hbRes.rows[0].updatedAt;
    hbAgo = minsAgo(heartbeat.updatedAt);
  } catch {}
}

// Last issue timestamp (separate signal: when did NIM last find a real bug)
const latest = await client.query(
  `SELECT "detectedAt", "ruleId", "severity"
   FROM "QuestionQualityIssue"
   WHERE "ruleId" LIKE 'agent.%'
   ORDER BY "detectedAt" DESC LIMIT 1`
);
const latestRow = latest.rows[0];

// --- 4. Throughput windows ---
const windows = await Promise.all([
  client.query(`SELECT COUNT(*) FROM "QuestionQualityIssue" WHERE "ruleId" LIKE 'agent.%' AND "detectedAt" >= NOW() - INTERVAL '10 minutes'`),
  client.query(`SELECT COUNT(*) FROM "QuestionQualityIssue" WHERE "ruleId" LIKE 'agent.%' AND "detectedAt" >= NOW() - INTERVAL '1 hour'`),
  client.query(`SELECT COUNT(*) FROM "QuestionQualityIssue" WHERE "ruleId" LIKE 'agent.%' AND "detectedAt" >= NOW() - INTERVAL '24 hours'`),
]);
const w10 = +windows[0].rows[0].count;
const w60 = +windows[1].rows[0].count;
const w24h = +windows[2].rows[0].count;

// --- 5. Severity breakdown ---
const sev = await client.query(
  `SELECT severity, status, COUNT(*) AS n
   FROM "QuestionQualityIssue"
   WHERE "ruleId" LIKE 'agent.%'
   GROUP BY severity, status`
);
const sevMap = { CRITICAL: { open: 0, resolved: 0 }, HIGH: { open: 0, resolved: 0 }, MEDIUM: { open: 0, resolved: 0 }, LOW: { open: 0, resolved: 0 } };
for (const r of sev.rows) {
  if (!sevMap[r.severity]) sevMap[r.severity] = { open: 0, resolved: 0 };
  if (r.status === "OPEN") sevMap[r.severity].open = +r.n;
  else sevMap[r.severity].resolved = +r.n;
}

await client.end();

// --- Verdict (heartbeat is the truth, finding-time is just secondary signal) ---
const auditPercent = totalNclex > 0 ? (auditedCount / totalNclex * 100) : 0;
const remaining = totalNclex - auditedCount;
let verdict, color;
if (hbAgo === null) {
  verdict = "X  AppSetting 沒有 audit.heartbeat —— audit-worker 還沒發過心跳，可能未部署或從未啟動";
  color = "\x1b[31m";
} else if (hbAgo > 30) {
  verdict = `X  心跳 ${hbAgo} 分鐘前 —— audit-worker 卡住了，去 Zeabur 看 logs`;
  color = "\x1b[31m";
} else if (hbAgo > 5) {
  verdict = `!  心跳 ${hbAgo} 分鐘前 —— NIM 反應慢，但還活著`;
  color = "\x1b[33m";
} else {
  verdict = `OK 心跳 ${hbAgo} 分鐘前 —— audit-worker 健康在審題`;
  color = "\x1b[32m";
}
const reset = "\x1b[0m";

// --- Output ---
console.log("");
console.log("============================================================");
console.log(" NIM Audit Worker · Health Check");
console.log(` Now: ${fmt(now)}`);
console.log("============================================================");
console.log("");
console.log(`${color}${verdict}${reset}`);
console.log("");
if (heartbeat) {
  console.log("--- 心跳 ---");
  console.log(`  最後審題:                  ${fmt(heartbeat.updatedAt)}`);
  console.log(`  該題 verdict:              ${heartbeat.verdict ?? "?"} (model: ${heartbeat.modelUsed ?? "?"})`);
  console.log(`  worker 統計:               ok=${heartbeat.ok} fix=${heartbeat.fix} unc=${heartbeat.unc} err=${heartbeat.err}  workers=${heartbeat.workers}`);
  console.log("");
}
console.log("--- 進度 ---");
console.log(`  總題數 (NCLEX APPROVED):  ${totalNclex.toLocaleString()}`);
console.log(`  已審 (NIM 摸過):          ${auditedCount.toLocaleString()}  (${auditPercent.toFixed(1)}%)`);
console.log(`  剩下:                      ${remaining.toLocaleString()}`);
console.log("");
console.log("--- 吞吐量 (新 finding 數) ---");
console.log(`  最近 10 分鐘:             ${w10}`);
console.log(`  最近 1 小時:              ${w60}`);
console.log(`  最近 24 小時:             ${w24h}`);
if (latestRow) {
  console.log(`  最後一個 finding:          ${fmt(latestRow.detectedAt)}  (${latestRow.severity}, ${latestRow.ruleId})`);
}
console.log("");
console.log("--- 嚴重度分布 ---");
for (const k of ["CRITICAL", "HIGH", "MEDIUM", "LOW"]) {
  const s = sevMap[k];
  console.log(`  ${k.padEnd(9)}  open=${String(s.open).padStart(4)}   resolved=${String(s.resolved).padStart(4)}`);
}
console.log("");
console.log("--- ETA 估算 (依目前 1h 吞吐) ---");
if (w60 > 0 && remaining > 0) {
  // approximate: how many *questions* per hour does worker churn? findings per hour ≠ questions/hour, but during full sweep most questions produce 0-1 findings, so this is a rough lower bound on speed.
  // better: use findings/hour as a proxy for "worker is making progress at this rate".
  const hoursIfFindingsAreOnePerQuestion = remaining / w60;
  console.log(`  如果每題平均產 1 個 finding: ${hoursIfFindingsAreOnePerQuestion.toFixed(1)} 小時 (${(hoursIfFindingsAreOnePerQuestion / 24).toFixed(1)} 天)`);
  console.log(`  (實際更快, 因為很多題不會產 finding)`);
} else {
  console.log("  (吞吐 0, 算不出來)");
}
console.log("");
