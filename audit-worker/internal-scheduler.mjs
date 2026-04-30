#!/usr/bin/env node
/**
 * Internal Cron Scheduler — runs alongside the audit-parallel worker
 * inside the same Zeabur container.
 *
 * Why this exists:
 *  GitHub Actions cron jobs were unreliable (network timeouts, runner death,
 *  yml syntax breakage). This scheduler runs everything in-process so failures
 *  show up in the same log stream and can't be silently dropped by GitHub.
 *
 * What it does:
 *  - Wakes up every 60 seconds
 *  - Checks each registered job's cron expression against UTC now
 *  - If a job is due and was last run >= the cron's interval, fires it
 *  - Calls the corresponding /api/cron/... endpoint on the Next.js service
 *    via the internal Zeabur hostname (set NURSLIX_INTERNAL_URL)
 *  - Records last-run + last-status in AppSetting (key=cron.<job>)
 *  - One job at a time, sequential, so a slow job doesn't pile up calls
 *
 * Required env on Zeabur (audit-worker service):
 *   DATABASE_URL              — same Postgres
 *   CRON_SECRET               — bearer token the endpoints check
 *   NURSLIX_INTERNAL_URL      — e.g. http://nurslix.zeabur.internal:8080
 *                                or  https://nurslix.zeabur.app
 */
import pg from "pg";
import fs from "node:fs";

// ───── env ────────────────────────────────────────────────────────────────
const envFile = ".env.local";
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split("\n").forEach((line) => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
}

const DATABASE_URL = process.env.DATABASE_URL;
const CRON_SECRET  = process.env.CRON_SECRET;
const APP_URL      = process.env.NURSLIX_INTERNAL_URL || process.env.APP_URL || "https://nurslix.zeabur.app";

if (!DATABASE_URL) { console.error("[scheduler] Missing DATABASE_URL"); process.exit(1); }
if (!CRON_SECRET)  { console.error("[scheduler] Missing CRON_SECRET");  process.exit(1); }

// ───── jobs ───────────────────────────────────────────────────────────────
// Each job: { name, cron, path, method, timeoutMs, mode }
//   cron: 'HH:MM' UTC for daily, 'every Nm' for interval, 'every Nh' for hourly
//   mode: 'GET' (default) or 'POST'
//   timeoutMs: how long to wait for the endpoint
const JOBS = [
  // Daily ones — fire once per UTC day at the given hour
  { name: "ops",                   at: "02:00", path: "/api/cron/ops",                       timeoutMs: 5 * 60_000 },
  { name: "trial-expiry",          at: "02:00", path: "/api/cron/trial-expiry",              timeoutMs: 60_000 },
  { name: "quality-scan",          at: "03:00", path: "/api/cron/quality-scan?autoArchive=1", timeoutMs: 5 * 60_000 },
  { name: "report-triage",         at: "04:00", path: "/api/cron/report-triage?limit=30&autoArchive=1", timeoutMs: 12 * 60_000 },
  { name: "error-rate-recompute",  at: "05:00", path: "/api/cron/error-rate-recompute",      timeoutMs: 8 * 60_000 },
  // propose-repairs runs as 10 sequential 1-issue calls so it actually
  // completes given Zeabur's 5-min per-request HTTP cap
  { name: "propose-repairs",       at: "05:30", path: "/api/cron/propose-repairs?limit=1",   timeoutMs: 8 * 60_000, repeat: 10, repeatDelayMs: 3000 },
  { name: "daily-health-report",   at: "09:00", path: "/api/cron/daily-health-report",       timeoutMs: 5 * 60_000 },
  { name: "marketing-daily",       at: "10:00", path: "/api/cron/marketing-daily",           timeoutMs: 5 * 60_000 },

  // Recurring (interval) ones
  { name: "hermes-retry",          everyHours: 2,  path: "/api/admin/hermes/retry", method: "POST", timeoutMs: 5 * 60_000 },
  { name: "finalize-abandoned",    everyMinutes: 60, path: "/api/cron/finalize-abandoned-sessions", timeoutMs: 60_000 },
];

// ───── DB ─────────────────────────────────────────────────────────────────
const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
console.log(`[scheduler] connected to DB, ${JOBS.length} jobs registered, target=${APP_URL}`);

async function readState(jobName) {
  const r = await client.query(`SELECT value, "updatedAt" FROM "AppSetting" WHERE key = $1`, [`cron.${jobName}`]);
  if (!r.rows[0]) return null;
  try { return { ...JSON.parse(r.rows[0].value), updatedAt: r.rows[0].updatedAt }; } catch { return null; }
}

async function writeState(jobName, payload) {
  await client.query(`
    INSERT INTO "AppSetting" (key, value, "updatedAt")
    VALUES ($1, $2, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = NOW();
  `, [`cron.${jobName}`, JSON.stringify(payload)]);
}

// ───── HTTP fire ──────────────────────────────────────────────────────────
async function fireOnce(job) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), job.timeoutMs);
  const url = APP_URL.replace(/\/$/, "") + job.path;
  const startedAt = Date.now();
  try {
    const res = await fetch(url, {
      method: job.method ?? "GET",
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
      signal: ctrl.signal,
    });
    const text = await res.text();
    clearTimeout(t);
    return { ok: res.ok, status: res.status, body: text.slice(0, 500), durationMs: Date.now() - startedAt };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, status: 0, body: String(e?.message || e), durationMs: Date.now() - startedAt };
  }
}

async function runJob(job) {
  const reps = job.repeat ?? 1;
  const results = [];
  for (let i = 0; i < reps; i++) {
    if (i > 0 && job.repeatDelayMs) await new Promise((r) => setTimeout(r, job.repeatDelayMs));
    const r = await fireOnce(job);
    results.push(r);
    console.log(`[scheduler] ${job.name}${reps > 1 ? ` ${i + 1}/${reps}` : ""} → ${r.ok ? "OK" : "FAIL"} status=${r.status} ${r.durationMs}ms`);
    if (!r.ok && reps === 1) break;
  }
  const okCount = results.filter((r) => r.ok).length;
  await writeState(job.name, {
    lastRunAt: new Date().toISOString(),
    lastStatus: okCount === results.length ? "ok" : (okCount > 0 ? "partial" : "fail"),
    lastDurationMs: results.reduce((s, r) => s + r.durationMs, 0),
    lastResults: results.map((r) => ({ ok: r.ok, status: r.status })),
    lastBody: results[results.length - 1]?.body?.slice(0, 200),
  });
}

// ───── due check ──────────────────────────────────────────────────────────
function nowUTC() { return new Date(); }

async function isDue(job) {
  const state = await readState(job.name);
  const lastRun = state?.lastRunAt ? new Date(state.lastRunAt) : null;
  const now = nowUTC();

  if (job.at) {
    // Daily at HH:MM UTC
    const [hh, mm] = job.at.split(":").map(Number);
    const todayTrigger = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hh, mm));
    // Due if now >= today's trigger AND we haven't run since today's trigger
    if (now < todayTrigger) return false;
    if (lastRun && lastRun >= todayTrigger) return false;
    return true;
  }
  if (job.everyHours) {
    if (!lastRun) return true;
    return (now - lastRun) >= job.everyHours * 3600_000;
  }
  if (job.everyMinutes) {
    if (!lastRun) return true;
    return (now - lastRun) >= job.everyMinutes * 60_000;
  }
  return false;
}

// ───── main loop ──────────────────────────────────────────────────────────
console.log(`[scheduler] entering loop`);
let cycle = 0;
while (true) {
  cycle++;
  for (const job of JOBS) {
    try {
      if (await isDue(job)) {
        console.log(`[scheduler] firing ${job.name} ...`);
        await runJob(job);
      }
    } catch (e) {
      console.log(`[scheduler] ${job.name} dispatch error: ${e?.message || e}`);
    }
  }
  // Hourly heartbeat in log
  if (cycle % 60 === 1) {
    console.log(`[scheduler] alive cycle=${cycle} time=${new Date().toISOString()}`);
  }
  await new Promise((r) => setTimeout(r, 60_000));
}
