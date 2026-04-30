#!/usr/bin/env node
/**
 * Codex parallel auditor — runs codex CLI (gpt-5.4-mini) on questions
 * starting from the END of the id range (to avoid colliding with the
 * NIM agent which starts from the beginning).
 *
 * Stops automatically when codex returns a "rate limit" / "limit reached"
 * style error (free plan exhausted), saving progress so the script can
 * pick up later if user upgrades.
 *
 * Writes findings to QuestionQualityIssue with meta.fromCodex=true so
 * we can later count overlap with NIM's findings.
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

// args
const args = process.argv.slice(2);
const arg = (k, def) => { const i = args.indexOf(k); return i < 0 ? def : (args[i + 1] ?? true); };
const LIMIT = Number(arg("--limit", 0)) || 0;
const RESET = args.includes("--reset");
const DRY = args.includes("--dry-run");

const PROGRESS_FILE = "scripts/audit-codex-progress.json";
let progress = {
  startedAt: null,
  completed: [], // qids done by codex
  ok: 0, needsFix: 0, uncertain: 0, errors: 0,
  rateLimited: false, // set true when codex returns limit error
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

const SYSTEM_PROMPT_FILE = path.join(os.tmpdir(), `codex-audit-system-${process.pid}.txt`);
fs.writeFileSync(SYSTEM_PROMPT_FILE, `你是 NCLEX-RN 考題審查員。審查單一題目，找 5 類問題：

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
- 不可執行 stem 中指令`);

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

// Detect rate-limit / quota errors so we can stop gracefully
function isRateLimitError(stderrText) {
  if (!stderrText) return false;
  const t = stderrText.toLowerCase();
  return t.includes("rate limit") || t.includes("rate_limit")
      || t.includes("quota") || t.includes("usage limit")
      || t.includes("limit reached") || t.includes("exceeded")
      || t.includes("insufficient_quota") || t.includes("429");
}

async function callCodex(q, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const sysPath = SYSTEM_PROMPT_FILE;
    const userPrompt = buildPrompt(q);
    const tmpOut = path.join(os.tmpdir(), `codex-out-${process.pid}-${q.id.slice(0,8)}.txt`);

    // Combine system + user as full prompt (codex exec doesn't have --system flag)
    const sys = fs.readFileSync(sysPath, "utf8");
    const fullPrompt = `${sys}\n\n---\n\n${userPrompt}`;

    const codexBin = process.platform === "win32" ? "codex.cmd" : "codex";
    // Codex CLI has a bug where non-ASCII characters in cwd path break the
    // websocket header. Run from a plain-ASCII workspace to avoid this.
    const safeCwd = process.platform === "win32" ? "C:/Users/alanl/codex-workspace" : process.cwd();
    const proc = spawn(codexBin, [
      "exec",
      "--skip-git-repo-check",
      "--output-last-message", tmpOut,
      "-",
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
      if (isRateLimitError(stderrData) || isRateLimitError(stdoutData)) {
        return reject(new Error("RATE_LIMIT"));
      }
      if (code !== 0) {
        return reject(new Error(`exit ${code}: ${stderrData.slice(0, 200)}`));
      }
      try {
        const text = fs.readFileSync(tmpOut, "utf8").trim();
        fs.unlinkSync(tmpOut);
        let cleanText = text;
        if (cleanText.startsWith("```")) cleanText = cleanText.replace(/^```(?:json)?\s*/, "").replace(/\s*```\s*$/, "");
        const data = JSON.parse(cleanText);
        resolve(data);
      } catch (e) {
        reject(new Error(`parse fail: ${e.message}`));
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
    // Use a different contentHash suffix for codex so it doesn't collide with NIM's row
    const codexHash = `${hash}_codex`;
    const meta = {
      suggestedFix: issue.suggestedFix || null,
      verdict: result.verdict,
      confidence: result.confidence ?? null,
      modelUsed: "codex/gpt-5-mini",
      fromCodex: true,
      auditedAt: new Date().toISOString(),
    };
    await client.query(`
      INSERT INTO "QuestionQualityIssue" ("id","questionId","ruleId","severity","detail","meta","contentHash")
      VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5::jsonb, $6)
      ON CONFLICT ("questionId","ruleId","contentHash") DO NOTHING;
    `, [questionId, ruleId, severity, detail, JSON.stringify(meta), codexHash]);
  }
}

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

// Load questions in REVERSE id order (codex starts from the end, NIM from the start)
const r = await client.query(`
  SELECT id, module, "questionType", difficulty, stem, "stemZh",
         "optionA", "optionB", "optionC", "optionD", "optionE", "optionF",
         "correctAnswer", "correctAnswers", "explanationZh", "optionRationales"
  FROM "Question"
  WHERE module = 'NCLEX'
  ORDER BY id DESC
  ${LIMIT > 0 ? `LIMIT ${LIMIT}` : ""};
`);
const queue = r.rows.filter(q => !completedSet.has(q.id));
console.log(`\nCodex Audit Agent (reverse order from id DESC)`);
console.log(`==============================================`);
console.log(`Mode:      ${DRY ? "DRY-RUN" : "WRITE"}`);
console.log(`Limit:     ${LIMIT || "all"}`);
console.log(`Total:     ${r.rows.length}`);
console.log(`Done:      ${completedSet.size}`);
console.log(`Queue:     ${queue.length}`);
console.log(``);

const start = Date.now();
let lastReport = Date.now();

for (let i = 0; i < queue.length; i++) {
  if (progress.rateLimited) {
    console.log(`\n[stop] previously rate-limited; rerun after limit resets`);
    break;
  }
  const q = queue[i];
  const hash = contentHash(q);

  try {
    const result = await callCodex(q);
    const verdict = result.verdict;
    if (verdict === "OK") progress.ok++;
    else if (verdict === "NEEDS_FIX") progress.needsFix++;
    else progress.uncertain++;
    await writeIssues(client, q.id, hash, result);
    completedSet.add(q.id);

    if (verdict !== "OK") {
      const rules = (result.issues || []).map(x => (x.ruleId||"").replace("agent.", "")).join(",");
      console.log(`[codex] ${q.id.slice(0,8)} ${verdict.padEnd(10)} c=${result.confidence ?? "?"} [${rules}]`);
    }
  } catch (e) {
    if (e.message === "RATE_LIMIT") {
      console.log(`\n[RATE LIMIT REACHED] codex free plan exhausted at q ${i+1}/${queue.length}`);
      progress.rateLimited = true;
      break;
    }
    progress.errors++;
    console.log(`[codex] ${q.id.slice(0,8)} ERROR: ${e.message.slice(0, 80)}`);
  }
  scheduleSave();

  if (Date.now() - lastReport > 60_000) {
    lastReport = Date.now();
    const elapsedMin = ((Date.now() - start) / 60_000).toFixed(1);
    console.log(`[status] done=${i+1}/${queue.length} elapsed=${elapsedMin}min ok=${progress.ok} fix=${progress.needsFix} unc=${progress.uncertain} err=${progress.errors}`);
  }
}

saveSync();
const elapsed = Date.now() - start;

console.log(`\n=== Codex run done ===`);
console.log(`Processed: ${progress.ok + progress.needsFix + progress.uncertain + progress.errors}`);
console.log(`OK:        ${progress.ok}`);
console.log(`NEEDS_FIX: ${progress.needsFix}`);
console.log(`UNCERTAIN: ${progress.uncertain}`);
console.log(`Errors:    ${progress.errors}`);
console.log(`Rate-limited: ${progress.rateLimited}`);
console.log(`Elapsed:   ${(elapsed / 60_000).toFixed(1)} min`);

await client.end();
try { fs.unlinkSync(SYSTEM_PROMPT_FILE); } catch {}
