#!/usr/bin/env node
/**
 * NIM model benchmark — runs each candidate through 4 real-world workloads
 * the ops/quality/audit teams actually do, then prints a recommendation.
 *
 * Workloads:
 *   1. simple-quick        : single-turn, tiny prompt — is the model alive?
 *   2. tool-calling        : OpenAI-compatible function call — does the model
 *                            use tools? (CTO/PM/COO agents need this)
 *   3. long-prompt-zh      : 2KB Chinese system prompt + JSON output —
 *                            mimics audit-worker's NIM call (NCLEX审题)
 *   4. structured-json     : ask for strict JSON, parse it — quality team's
 *                            triage/verifier/repair agents need this
 *
 * Each model gets up to 60s per workload before being marked SLOW.
 */
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8").split(/\r?\n/);
const KEY = env.find((l) => l.startsWith("NVIDIA_NIM_API_KEY="))?.slice(19).replace(/^["']|["']$/g, "");
if (!KEY) { console.error("Missing NVIDIA_NIM_API_KEY in .env.local"); process.exit(1); }

const MODELS = [
  // DeepSeek
  "deepseek-ai/deepseek-coder-6.7b-instruct",
  "deepseek-ai/deepseek-v3.1-terminus",
  "deepseek-ai/deepseek-v3.2",
  "deepseek-ai/deepseek-v4-flash",
  "deepseek-ai/deepseek-v4-pro",
  // MiniMax
  "minimaxai/minimax-m2.5",
  "minimaxai/minimax-m2.7",
];

async function callNIM(model, body, timeoutMs = 60_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();
  try {
    const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, ...body }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const dur = Date.now() - start;
    if (!r.ok) {
      const errText = await r.text();
      return { ok: false, status: r.status, durMs: dur, err: errText.slice(0, 100) };
    }
    const j = await r.json();
    return { ok: true, status: 200, durMs: dur, body: j };
  } catch (e) {
    clearTimeout(t);
    const dur = Date.now() - start;
    return { ok: false, status: 0, durMs: dur, err: e.message || String(e) };
  }
}

// ────────────────── Workload 1: simple-quick ──────────────────────────────
async function workload1(model) {
  const r = await callNIM(model, {
    messages: [{ role: "user", content: "Say 'hi' and nothing else." }],
    max_tokens: 10,
    temperature: 0,
  });
  if (!r.ok) return { pass: false, dur: r.durMs, why: `HTTP ${r.status} ${r.err}` };
  const c = r.body.choices?.[0]?.message?.content?.trim() || "";
  return { pass: c.length > 0 && c.length < 50, dur: r.durMs, why: `content="${c.slice(0, 40)}"` };
}

// ────────────────── Workload 2: tool-calling ──────────────────────────────
async function workload2(model) {
  const tools = [{
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the weather for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string", description: "City name" } },
        required: ["city"],
      },
    },
  }];
  const r = await callNIM(model, {
    messages: [{ role: "user", content: "What's the weather in Taipei? Use the tool." }],
    tools,
    tool_choice: "auto",
    max_tokens: 200,
    temperature: 0,
  });
  if (!r.ok) return { pass: false, dur: r.durMs, why: `HTTP ${r.status} ${r.err.slice(0, 60)}` };
  const msg = r.body.choices?.[0]?.message;
  const calls = msg?.tool_calls;
  if (!calls || calls.length === 0) return { pass: false, dur: r.durMs, why: `no tool_calls (content="${msg?.content?.slice(0, 30) || ""}")` };
  const arg = calls[0].function?.arguments;
  let parsed;
  try { parsed = JSON.parse(arg); } catch { return { pass: false, dur: r.durMs, why: "tool args not JSON" }; }
  return { pass: parsed.city?.toLowerCase().includes("taipei"), dur: r.durMs, why: `called get_weather(${JSON.stringify(parsed)})` };
}

// ────────────────── Workload 3: long Chinese prompt + JSON out ────────────
async function workload3(model) {
  const SYSTEM = `你是 NCLEX-RN 護理考題審查員，負責評估題目的品質。
評估面向：
1. 答案的臨床正確性（依 NCLEX 2024 標準）
2. 解析是否真的在解釋題幹問的問題
3. 選項 rationale 是否與標記答案一致
4. 風格是否符合 NCLEX（無雙重否定、不誇飾）

只輸出 JSON，不要 markdown 包裹：
{
  "verdict": "OK" | "NEEDS_FIX" | "UNCERTAIN",
  "primaryIssue": "answer_wrong" | "explanation_unrelated" | "rationale_inconsistent" | null,
  "reasoning": "繁中 1-2 句說明",
  "confidence": 0-100
}`;
  const USER = `審查下列題目：
題幹：A 35-year-old male presents with sudden chest pain and dyspnea. ECG shows ST elevation in leads II, III, aVF.
A. Anterior wall MI
B. Inferior wall MI
C. Lateral wall MI
D. Posterior wall MI
正確答案：B
解析：ST elevation in II/III/aVF indicates inferior wall infarction, typically RCA occlusion.

請輸出 JSON。`;
  const r = await callNIM(model, {
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: USER }],
    max_tokens: 500,
    temperature: 0.1,
    response_format: { type: "json_object" },
  });
  if (!r.ok) return { pass: false, dur: r.durMs, why: `HTTP ${r.status} ${r.err.slice(0, 60)}` };
  const c = r.body.choices?.[0]?.message?.content?.trim() || "";
  let parsed;
  try {
    let t = c;
    if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/, "").replace(/\s*```\s*$/, "");
    parsed = JSON.parse(t);
  } catch {
    return { pass: false, dur: r.durMs, why: `not JSON: "${c.slice(0, 60)}"` };
  }
  const ok = ["OK", "NEEDS_FIX", "UNCERTAIN"].includes(parsed.verdict);
  return { pass: ok, dur: r.durMs, why: `verdict=${parsed.verdict} conf=${parsed.confidence}` };
}

// ────────────────── Workload 4: structured tools/output combo ─────────────
async function workload4(model) {
  // Mimics propose-repairs: ask for explicit JSON with multiple fields
  const r = await callNIM(model, {
    messages: [{
      role: "user",
      content: `Output exactly this JSON (no markdown, no commentary):
{"name":"alice","age":30,"hobbies":["read","run"]}`,
    }],
    max_tokens: 100,
    temperature: 0,
    response_format: { type: "json_object" },
  });
  if (!r.ok) return { pass: false, dur: r.durMs, why: `HTTP ${r.status} ${r.err.slice(0, 60)}` };
  const c = r.body.choices?.[0]?.message?.content?.trim() || "";
  try {
    let t = c;
    if (t.startsWith("```")) t = t.replace(/^```(?:json)?\s*/, "").replace(/\s*```\s*$/, "");
    const p = JSON.parse(t);
    const ok = p.name === "alice" && p.age === 30 && Array.isArray(p.hobbies) && p.hobbies.length === 2;
    return { pass: ok, dur: r.durMs, why: ok ? "exact match" : `parsed but wrong: ${JSON.stringify(p).slice(0, 60)}` };
  } catch {
    return { pass: false, dur: r.durMs, why: `not JSON: "${c.slice(0, 60)}"` };
  }
}

// ────────────────── Run ────────────────────────────────────────────────────
const G = "\x1b[32m"; const R = "\x1b[31m"; const Y = "\x1b[33m"; const D = "\x1b[2m"; const N = "\x1b[0m";
const tag = (ok) => ok ? `${G}✓${N}` : `${R}✗${N}`;
const fmtMs = (ms) => ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`;

const results = {};
for (const m of MODELS) {
  console.log(`\n${D}━━━ ${m} ━━━${N}`);
  results[m] = {};
  for (const [name, fn] of [["simple", workload1], ["tools", workload2], ["zh-json", workload3], ["json-strict", workload4]]) {
    const r = await fn(m);
    results[m][name] = r;
    const lat = r.dur < 1500 ? `${G}${fmtMs(r.dur)}${N}` : r.dur < 5000 ? `${Y}${fmtMs(r.dur)}${N}` : `${R}${fmtMs(r.dur)}${N}`;
    console.log(`  ${tag(r.pass)} ${name.padEnd(13)} ${lat.padEnd(20)} ${D}${r.why.slice(0, 80)}${N}`);
  }
}

// ────────────────── Summary ────────────────────────────────────────────────
console.log(`\n\n=================================================================`);
console.log(` SUMMARY · pass count + total latency`);
console.log(`=================================================================\n`);
const rows = [];
for (const m of MODELS) {
  const r = results[m];
  const pass = ["simple", "tools", "zh-json", "json-strict"].filter((k) => r[k].pass).length;
  const total = ["simple", "tools", "zh-json", "json-strict"].reduce((s, k) => s + r[k].dur, 0);
  rows.push({ model: m, pass, total, simple: r.simple.dur, tools: r.tools.dur, zh: r["zh-json"].dur, jstrict: r["json-strict"].dur });
}
rows.sort((a, b) => (b.pass - a.pass) || (a.total - b.total));
console.log("model".padEnd(42) + "pass  total       simple    tools     zh-json   json-strict");
console.log("─".repeat(105));
for (const r of rows) {
  const passColor = r.pass === 4 ? G : r.pass >= 2 ? Y : R;
  console.log(
    r.model.padEnd(42) +
    `${passColor}${r.pass}/4${N}   ` +
    `${(r.total/1000).toFixed(1)}s`.padEnd(11) +
    `${fmtMs(r.simple)}`.padEnd(10) +
    `${fmtMs(r.tools)}`.padEnd(10) +
    `${fmtMs(r.zh)}`.padEnd(10) +
    `${fmtMs(r.jstrict)}`
  );
}
console.log("");

// recommendations
console.log(`=================================================================`);
console.log(` RECOMMENDATIONS by role`);
console.log(`=================================================================\n`);
const passAll = rows.filter((r) => r.pass === 4);
const fastestAll = passAll.sort((a, b) => a.total - b.total)[0];
const goodTools = rows.filter((r) => results[r.model].tools.pass && results[r.model].simple.pass);
const goodZh = rows.filter((r) => results[r.model]["zh-json"].pass);
const fastestTools = goodTools.sort((a, b) => a.tools - b.tools)[0];
const fastestZh = goodZh.sort((a, b) => a.zh - b.zh)[0];

console.log(`Ops Team (CTO/PM/COO/CEO — needs tool-calling, low latency):`);
console.log(`  ${G}→ ${fastestTools?.model || "(none passed)"}${N}  (tools=${fmtMs(fastestTools?.tools ?? 0)})`);
console.log("");
console.log(`Quality Team (triage / verifier / repair — Chinese JSON):`);
console.log(`  ${G}→ ${fastestZh?.model || "(none passed)"}${N}  (zh-json=${fmtMs(fastestZh?.zh ?? 0)})`);
console.log("");
console.log(`Audit Worker (NIM 全題庫掃描 — only zh-json matters, latency tolerant):`);
console.log(`  ${G}→ ${goodZh.sort((a,b) => a.zh - b.zh)[0]?.model || "(none)"}${N}  (currently deepseek-v4-pro)`);
console.log("");
console.log(`Best all-rounder (passes all 4):`);
console.log(`  ${G}→ ${fastestAll?.model || "(none)"}${N}  (total=${(fastestAll?.total/1000 || 0).toFixed(1)}s)`);
console.log("");
