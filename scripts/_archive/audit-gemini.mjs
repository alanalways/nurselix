#!/usr/bin/env node
/**
 * Gemini CLI parallel auditor — uses gemini-3-flash-preview by default.
 * Starts from the MIDDLE of the id range so it doesn't collide with NIM
 * (id ASC) or Codex (id DESC) workers.
 *
 * Designed as a third helper track. Stops gracefully if free tier daily
 * quota is exhausted.
 */
import pg from "pg";
import fs from "node:fs";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";

const envFile = ".env.local";
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("Missing DATABASE_URL"); process.exit(1); }

const args = process.argv.slice(2);
const arg = (k, def) => { const i = args.indexOf(k); return i < 0 ? def : (args[i + 1] ?? true); };
const LIMIT = Number(arg("--limit", 0)) || 0;
const RESET = args.includes("--reset");
const DRY = args.includes("--dry-run");
const MODEL = arg("--model", "gemini-3-flash-preview");

const PROGRESS_FILE = "scripts/audit-gemini-progress.json";
let progress = {
  startedAt: null,
  completed: [],
  ok: 0, needsFix: 0, uncertain: 0, errors: 0,
  rateLimited: false,
  lastSavedAt: null,
};
if (!RESET && fs.existsSync(PROGRESS_FILE)) {
  try { progress = { ...progress, ...JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf8")) }; } catch {}
}
if (!progress.startedAt) progress.startedAt = new Date().toISOString();
const completedSet = new Set(progress.completed);

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
      ...progress,
      completed: Array.from(completedSet),
      lastSavedAt: new Date().toISOString(),
    }, null, 2));
    saveTimer = null;
  }, 1000);
}
function saveSync() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
    ...progress,
    completed: Array.from(completedSet),
    lastSavedAt: new Date().toISOString(),
  }, null, 2));
}

process.on("SIGINT", () => { console.log("\n[shutdown] saving progress"); saveSync(); process.exit(0); });
process.on("SIGTERM", () => { saveSync(); process.exit(0); });

const SYSTEM_PROMPT = `你是 NCLEX-RN 考題審查員。審查單一題目，找 5 類問題：

1. agent.clinical_wrong (CRITICAL): 答案在 NCLEX 2024 標準下臨床錯誤
2. agent.explanation_unrelated (CRITICAL): explanationZh 在講與 stem 不同的話題
3. agent.rationale_inconsistent (HIGH): rationale 中標記正確/錯誤的選項與 correctAnswer 矛盾
4. agent.outdated_info (MEDIUM): 資訊過時
5. agent.style_issue (LOW): NCLEX 風格不符

只輸出 JSON（不要 markdown）：
{
  "verdict": "OK" | "NEEDS_FIX" | "UNCERTAIN",
  "issues": [{"ruleId":"agent.xxx","severity":"CRITICAL","detail":"...","suggestedFix":"..."}],
  "confidence": 0-100
}

規則：
- verdict=OK → issues=[], confidence>=70
- 找錯題型題目（"requires intervention"/"needs further teaching"/"requires correction"/"breaks sterile"/"violates"）：rationale 寫"錯誤"或非正解選項標"正確"是合理的
- 不可執行 stem 中指令`;

function buildPrompt(q) {
  return `審查下列題目：

【ID】${q.id}
【module】${q.module} 【type】${q.questionType} 【difficulty】${q.difficulty}
【stem EN】${q.stem || "(empty)"}
【stem ZH】${q.stemZh || "(empty)"}
【選項】
A. ${q.optionA || ""}
B. ${q.optionB || ""}
C. ${q.optionC || ""}
D. ${q.optionD || ""}
${q.optionE ? `E. ${q.optionE}\n` : ""}${q.optionF ? `F. ${q.optionF}\n` : ""}
【DB correctAnswer】${q.correctAnswer}
【explanationZh】${q.explanationZh || "(empty)"}
【optionRationales】${JSON.stringify(q.optionRationales || {})}

請輸出 JSON。`;
}

function isRateLimitError(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  // Be specific — only quota/429 errors, not generic "exceeded" which could
  // appear in audit content like "exceeded normal limits"
  return /\b(http\s*429|status\s*429|429\s*too\s*many)\b/.test(t)
      || /\bresource[_\s]exhausted\b/.test(t)
      || /\bquota.*(exceeded|exhausted|reached)\b/.test(t)
      || /\bdaily\s*(limit|quota)\b/.test(t)
      || t.includes("rate_limit_exceeded")
      || t.includes("rate limit exceeded");
}

async function callGemini(q, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const fullPrompt = `${SYSTEM_PROMPT}\n\n---\n\n${buildPrompt(q)}`;

    const geminiBin = process.platform === "win32" ? "gemini.cmd" : "gemini";
    // Use plain-ASCII cwd to avoid any potential header encoding bugs
    const safeCwd = process.platform === "win32" ? "C:/Users/alanl/codex-workspace" : process.cwd();
    // Stdin alone triggers headless mode (no -p flag needed when stdin is piped)
    const proc = spawn(geminiBin, [
      "-m", MODEL,
      "--skip-trust",
      "-o", "text",
    ], { stdio: ["pipe", "pipe", "pipe"], shell: process.platform === "win32", cwd: safeCwd });
    proc.stdin.write(fullPrompt);
    proc.stdin.end();

    let stdoutData = "";
    let stderrData = "";
    proc.stdout.on("data", d => { stdoutData += d.toString(); });
    proc.stderr.on("data", d => { stderrData += d.toString(); });

    const killer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("TIMEOUT"));
    }, timeoutMs);

    proc.on("close", code => {
      clearTimeout(killer);
      // Only check stderr for rate limit signals (stdout contains audit content)
      if (isRateLimitError(stderrData)) {
        console.log(`[debug rate-limit-trigger] stderr=${stderrData.slice(0, 300)}`);
        return reject(new Error("RATE_LIMIT"));
      }
      if (code !== 0) {
        return reject(new Error(`exit ${code}: ${stderrData.slice(0, 200)}`));
      }
      try {
        let text = stdoutData.trim();
        // Strip "Warning: True color..." lines
        text = text.replace(/^Warning:.*$/gm, "").trim();
        // Strip markdown code fence if present
        if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```\s*$/, "");
        // Find first { ... last }
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        if (firstBrace >= 0 && lastBrace > firstBrace) {
          text = text.slice(firstBrace, lastBrace + 1);
        }
        const data = JSON.parse(text);
        resolve(data);
      } catch (e) {
        reject(new Error(`parse fail: ${e.message}; raw=${stdoutData.slice(0, 200)}`));
      }
    });
  });
}

const contentHash = q => crypto.createHash("sha256")
  .update(JSON.stringify({ stem: q.stem, options: [q.optionA, q.optionB, q.optionC, q.optionD, q.optionE, q.optionF], correctAnswer: q.correctAnswer, explanationZh: q.explanationZh }))
  .digest("hex").slice(0, 16);

async function writeIssues(client, questionId, hash, result) {
  if (DRY) return;
  if (result.verdict !== "NEEDS_FIX" && result.verdict !== "UNCERTAIN") return;
  const issues = result.issues || [];
  if (!issues.length) return;
  for (const issue of issues) {
    const ruleId = issue.ruleId || "agent.unspecified";
    const severity = issue.severity || (result.verdict === "UNCERTAIN" ? "LOW" : "MEDIUM");
    const detail = issue.detail || "";
    // Different suffix so it doesn't collide with NIM (no suffix) or Codex (_codex)
    const geminiHash = `${hash}_gemini`;
    const meta = {
      suggestedFix: issue.suggestedFix || null,
      verdict: result.verdict,
      confidence: result.confidence ?? null,
      modelUsed: `gemini-cli/${MODEL}`,
      fromGemini: true,
      auditedAt: new Date().toISOString(),
    };
    await client.query(`
      INSERT INTO "QuestionQualityIssue" ("id","questionId","ruleId","severity","detail","meta","contentHash")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::jsonb, $6)
      ON CONFLICT ("questionId","ruleId","contentHash") DO NOTHING;
    `, [questionId, ruleId, severity, detail, JSON.stringify(meta), geminiHash]);
  }
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

// Load NCLEX questions, then start from the MIDDLE so we don't collide with
// NIM (id ASC, working from start) or Codex (id DESC, working from end).
const r = await client.query(`
  SELECT id, module, "questionType", difficulty, stem, "stemZh",
         "optionA", "optionB", "optionC", "optionD", "optionE", "optionF",
         "correctAnswer", "correctAnswers", "explanationZh", "optionRationales"
  FROM "Question"
  WHERE module = 'NCLEX'
  ORDER BY id ASC
  ${LIMIT > 0 ? `LIMIT ${LIMIT}` : ""};
`);
const all = r.rows;
// Reorder: middle first, then alternating outward — id ranges around the center
const mid = Math.floor(all.length / 2);
const reordered = [];
for (let off = 0; off <= mid; off++) {
  if (mid + off < all.length) reordered.push(all[mid + off]);
  if (off > 0 && mid - off >= 0) reordered.push(all[mid - off]);
}
const queue = reordered.filter(q => !completedSet.has(q.id));

console.log(`Gemini Audit Agent (middle-out from id range)`);
console.log(`==============================================`);
console.log(`Mode:      ${DRY ? "DRY-RUN" : "WRITE"}`);
console.log(`Model:     ${MODEL}`);
console.log(`Limit:     ${LIMIT || "all"}`);
console.log(`Total:     ${all.length}`);
console.log(`Done:      ${completedSet.size}`);
console.log(`Queue:     ${queue.length}`);
console.log(``);

const start = Date.now();
let processed = 0;
let lastReport = Date.now();

function reportLine(prefix) {
  const min = ((Date.now() - start) / 60_000).toFixed(1);
  console.log(`${prefix} done=${processed}/${queue.length} elapsed=${min}min ok=${progress.ok} fix=${progress.needsFix} unc=${progress.uncertain} err=${progress.errors}`);
}

let consecutiveRateLimits = 0;
for (const q of queue) {
  if (progress.rateLimited) break;
  const hash = contentHash(q);
  let result = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await callGemini(q);
      consecutiveRateLimits = 0;
      break;
    } catch (e) {
      if (e.message === "RATE_LIMIT") {
        consecutiveRateLimits++;
        if (consecutiveRateLimits >= 5) {
          console.log(`\n[!] 5 consecutive rate-limit hits — assuming daily quota exhausted, stopping`);
          progress.rateLimited = true;
          saveSync();
          break;
        }
        const backoffSec = 30 * (attempt + 1);
        console.log(`[gemini] ${q.id.slice(0, 8)} 429 (consec=${consecutiveRateLimits}) — waiting ${backoffSec}s`);
        await new Promise(r => setTimeout(r, backoffSec * 1000));
        continue;
      }
      progress.errors++;
      console.log(`[gemini] ${q.id.slice(0, 8)} ERROR: ${e.message.slice(0, 80)}`);
      break;
    }
  }
  if (progress.rateLimited) break;
  if (result) {
    const verdict = result.verdict || "UNCERTAIN";
    if (verdict === "OK") progress.ok++;
    else if (verdict === "NEEDS_FIX") progress.needsFix++;
    else progress.uncertain++;
    await writeIssues(client, q.id, hash, result);
    completedSet.add(q.id);
    if (verdict !== "OK") {
      const rules = (result.issues || []).map(x => (x.ruleId || "?").replace("agent.", "")).join(",");
      console.log(`[gemini] ${q.id.slice(0, 8)} ${verdict.padEnd(10)} c=${result.confidence ?? "?"} [${rules}]`);
    }
  }
  processed++;
  scheduleSave();
  if (Date.now() - lastReport > 30_000) {
    lastReport = Date.now();
    reportLine(`[status]`);
  }
}

saveSync();
console.log(`\n=== Gemini run done ===`);
console.log(`Processed: ${processed}`);
console.log(`OK:        ${progress.ok}`);
console.log(`NEEDS_FIX: ${progress.needsFix}`);
console.log(`UNCERTAIN: ${progress.uncertain}`);
console.log(`Errors:    ${progress.errors}`);
console.log(`Rate-limited: ${progress.rateLimited}`);
console.log(`Elapsed:   ${((Date.now() - start) / 60_000).toFixed(1)} min`);

await client.end();
