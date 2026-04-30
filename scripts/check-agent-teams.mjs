#!/usr/bin/env node
/**
 * Comprehensive agent team activity check.
 * Reads DB rows that each team writes when they work — gives you ground
 * truth about who's actually doing things vs who's silent.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const url = readFileSync(".env.local", "utf8").split(/\r?\n/)
  .find(l => l.startsWith("DATABASE_URL=")).slice(13).replace(/^["']|["']$/g, "");
const c = new pg.Client({ connectionString: url });
await c.connect();

const now = new Date();
// Postgres returns UTC timestamps, parsed by `pg` as Date objects. Most of
// the time arithmetic just works (now - date), but toLocaleString without a
// timeZone arg surprises by showing UTC on Windows shells. Force the local
// time zone explicitly for human-readable output.
const fmt = (d) => d
  ? new Date(d).toLocaleString("zh-TW", { hour12: false, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
  : "—";
const minsAgo = (d) => d ? Math.round((now - new Date(d)) / 60000) : null;
const daysAgo = (d) => d ? ((now - new Date(d)) / 86400000).toFixed(1) : null;

const G = "\x1b[32m"; const Y = "\x1b[33m"; const R = "\x1b[31m"; const D = "\x1b[2m"; const N = "\x1b[0m";

function status(mins, threshold) {
  if (mins === null) return `${R}NEVER${N}`;
  if (mins < threshold * 0.5) return `${G}HEALTHY${N}`;
  if (mins < threshold) return `${Y}AGING${N}`;
  return `${R}STALE${N}`;
}

console.log("\n=================================================================");
console.log(" Nurslix Agent Teams · Activity Audit");
console.log(` Now: ${fmt(now)}`);
console.log("=================================================================\n");

// ───── 1. Ops Team (CTO/PM/COO/CEO 4-agent pipeline) ────────────────────
console.log("┌─ OPS TEAM (CTO + PM + COO + CEO) ──────────────────────────────");
const ops = await c.query(
  `SELECT id, period, "periodType", status, "durationMs", "createdAt",
          ("ctoReport" IS NOT NULL) AS cto, ("pmReport" IS NOT NULL) AS pm,
          ("opsReport" IS NOT NULL) AS coo, ("summaryZh" IS NOT NULL) AS ceo
   FROM "OpsReport" ORDER BY "createdAt" DESC LIMIT 5`
);
if (ops.rows.length === 0) {
  console.log(`│  ${R}NEVER RAN${N} — OpsReport table is empty`);
} else {
  for (const r of ops.rows) {
    const flags = `${r.cto?"C":"-"}${r.pm?"P":"-"}${r.coo?"O":"-"}${r.ceo?"E":"-"}`;
    const mins = minsAgo(r.createdAt);
    console.log(`│  ${fmt(r.createdAt)} · ${r.status.padEnd(8)} · agents[${flags}] · ${(r.durationMs/1000).toFixed(0)}s · ${r.period}`);
  }
  console.log(`│  ${status(minsAgo(ops.rows[0].createdAt), 24*60)} (last run ${minsAgo(ops.rows[0].createdAt)} min ago)`);
}
console.log("└─────────────────────────────────────────────────────────────────\n");

// ───── 2. Triage Agent (使用者回報 NIM 分流) ─────────────────────────────
console.log("┌─ TRIAGE AGENT (使用者回報 NIM 分流) ────────────────────────────");
const triage = await c.query(
  `SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE "triagedAt" IS NOT NULL) AS triaged,
          MAX("triagedAt") AS last_triage,
          COUNT(*) FILTER (WHERE "triagedAt" IS NULL AND status IN ('PENDING','pending')) AS untriaged_pending
   FROM "QuestionReport"`
);
const tr = triage.rows[0];
console.log(`│  Total reports:    ${tr.total}`);
console.log(`│  Triaged:          ${tr.triaged}`);
console.log(`│  Pending+untriaged: ${tr.untriaged_pending}`);
console.log(`│  Last triage:      ${fmt(tr.last_triage)}  (${daysAgo(tr.last_triage) ?? "—"} days ago)`);
console.log(`│  ${status(minsAgo(tr.last_triage), 24*60)}`);
console.log("└─────────────────────────────────────────────────────────────────\n");

// ───── 3. Verifier + Repair Agent (CRITICAL issues -> proposals) ────────
console.log("┌─ VERIFIER + REPAIR AGENT (修補建議) ───────────────────────────");
const repair = await c.query(
  `SELECT COUNT(*) AS total,
          MAX("createdAt") AS last_proposal,
          COUNT(*) FILTER (WHERE (snapshot->>'applied')::boolean = false) AS unapplied,
          COUNT(*) FILTER (WHERE (snapshot->>'applied')::boolean = true) AS applied
   FROM "QuestionVersion"
   WHERE "changedBy" = 'agent:repair'`
);
const rp = repair.rows[0];
console.log(`│  Total proposals:  ${rp.total}`);
console.log(`│  Un-applied:       ${rp.unapplied}  (待你 review on Repairs tab)`);
console.log(`│  Applied:          ${rp.applied}`);
console.log(`│  Last proposal:    ${fmt(rp.last_proposal)}`);
console.log(`│  ${status(minsAgo(rp.last_proposal), 48*60)}`);
console.log("└─────────────────────────────────────────────────────────────────\n");

// ───── 4. Quality Scan (rule-based daily scan) ─────────────────────────
console.log("┌─ QUALITY SCAN AGENT (規則掃描，每日) ──────────────────────────");
const qhealth = await c.query(
  `SELECT period, "totalQuestions", "openIssueCount", "healthScore", "createdAt"
   FROM "QualityHealthReport" WHERE "periodType" = 'daily'
   ORDER BY period DESC LIMIT 5`
);
for (const r of qhealth.rows) {
  console.log(`│  ${r.period} · score=${r.healthScore} · open=${r.openIssueCount} · total=${r.totalQuestions}`);
}
if (qhealth.rows.length > 0) {
  console.log(`│  ${status(minsAgo(qhealth.rows[0].createdAt), 30*60)} (last ${minsAgo(qhealth.rows[0].createdAt)} min ago)`);
}
console.log("└─────────────────────────────────────────────────────────────────\n");

// ───── 5. Audit Worker (NIM 24/7 全題庫掃描) ────────────────────────────
console.log("┌─ AUDIT WORKER (NIM 24/7 全題庫) ──────────────────────────────");
const hb = await c.query(
  `SELECT value, "updatedAt" FROM "AppSetting" WHERE key = 'audit.heartbeat'`
);
if (hb.rows[0]) {
  const v = JSON.parse(hb.rows[0].value);
  console.log(`│  Last audit:       ${fmt(hb.rows[0].updatedAt)}  (${minsAgo(hb.rows[0].updatedAt)} min ago)`);
  console.log(`│  Workers:          ${v.workers || "?"}`);
  console.log(`│  Stats:            ok=${v.ok} fix=${v.fix} unc=${v.unc} err=${v.err} done=${v.done}/${v.total}`);
  console.log(`│  ${status(minsAgo(hb.rows[0].updatedAt), 30)}`);
} else {
  console.log(`│  ${R}NEVER ran (no heartbeat row)${N}`);
}
console.log("└─────────────────────────────────────────────────────────────────\n");

// ───── 6. Marketing Team (SEO + Social + Email + Analytics) ─────────────
console.log("┌─ MARKETING TEAM ───────────────────────────────────────────────");
const mkt = await c.query(
  `SELECT "contentType", platform, status, "generatedAt"
   FROM "MarketingContent" ORDER BY "generatedAt" DESC LIMIT 8`
);
for (const r of mkt.rows) {
  console.log(`│  ${fmt(r.generatedAt)} · ${(r.contentType||"?").padEnd(15)} · ${(r.platform||"-").padEnd(10)} · ${r.status}`);
}
const mktLast = mkt.rows[0]?.generatedAt;
console.log(`│  ${status(minsAgo(mktLast), 48*60)} (last ${minsAgo(mktLast) ?? "—"} min ago)`);
console.log("└─────────────────────────────────────────────────────────────────\n");

// ───── 7. Hermes Agent (使用者學習報告) ──────────────────────────────────
console.log("┌─ HERMES AGENT (使用者學習報告) ─────────────────────────────────");
const hermes = await c.query(
  `SELECT status, COUNT(*) FROM "HermesJob" GROUP BY status ORDER BY 2 DESC`
);
const hLast = await c.query(
  `SELECT MAX("updatedAt") AS last FROM "HermesJob" WHERE status = 'done'`
);
for (const r of hermes.rows) console.log(`│  ${r.status.padEnd(10)} = ${r.count}`);
console.log(`│  Last successful job: ${fmt(hLast.rows[0]?.last)}`);
console.log(`│  ${status(minsAgo(hLast.rows[0]?.last), 7*24*60)}`);
console.log("└─────────────────────────────────────────────────────────────────\n");

// ───── 8. Internal Scheduler (cron 自身狀態) ────────────────────────────
console.log("┌─ INTERNAL SCHEDULER (audit-worker 內建 cron) ──────────────────");
const sched = await c.query(
  `SELECT key, value, "updatedAt" FROM "AppSetting" WHERE key LIKE 'cron.%' ORDER BY key`
);
if (sched.rows.length === 0) {
  console.log(`│  ${Y}No cron state rows yet — scheduler hasn't fired anything${N}`);
} else {
  for (const r of sched.rows) {
    let v = {};
    try { v = JSON.parse(r.value); } catch {}
    const m = minsAgo(v.lastAttemptAt || r.updatedAt);
    const tone = v.lastStatus === "ok" ? G : v.lastStatus === "fail" ? R : Y;
    console.log(`│  ${r.key.replace("cron.","").padEnd(22)} ${tone}${(v.lastStatus||"?").padEnd(7)}${N} · ${m}m ago · fail#${v.failureCount ?? 0}`);
  }
}
console.log("└─────────────────────────────────────────────────────────────────\n");

// ───── 9. 結論 ──────────────────────────────────────────────────────────
console.log("=================================================================");
console.log(" SUMMARY");
console.log("=================================================================");
const checks = [
  { name: "Ops Team",       ok: ops.rows.length > 0 && minsAgo(ops.rows[0].createdAt) < 48*60 },
  { name: "Triage",         ok: minsAgo(tr.last_triage) !== null && minsAgo(tr.last_triage) < 48*60 },
  { name: "Verifier+Repair", ok: minsAgo(rp.last_proposal) !== null && minsAgo(rp.last_proposal) < 48*60 },
  { name: "Quality Scan",   ok: qhealth.rows.length > 0 && minsAgo(qhealth.rows[0].createdAt) < 48*60 },
  { name: "Audit Worker",   ok: hb.rows[0] && minsAgo(hb.rows[0].updatedAt) < 60 },
  { name: "Marketing",      ok: minsAgo(mktLast) !== null && minsAgo(mktLast) < 48*60 },
  { name: "Hermes",         ok: minsAgo(hLast.rows[0]?.last) !== null },
  { name: "Scheduler",      ok: sched.rows.length > 0 },
];
for (const ck of checks) {
  console.log(`  [${ck.ok ? `${G}✓${N}` : `${R}✗${N}`}] ${ck.name}`);
}
console.log("");

await c.end();
