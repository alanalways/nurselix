#!/usr/bin/env node
/**
 * Probe NVIDIA NIM concurrency limits.
 *
 * Sends N parallel requests to deepseek-v4-pro and measures:
 *  - success rate
 *  - latency per request
 *  - error type breakdown
 *
 * Usage: node scripts/concurrency-probe.mjs [concurrency]
 */
import fs from "node:fs";

const envFile = ".env.local";
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const NVIDIA = process.env.NVIDIA_NIM_API_KEY;
if (!NVIDIA) { console.error("Missing NVIDIA_NIM_API_KEY"); process.exit(1); }

const TEST_PROMPT = `審查下列題目（測試用）:

【題幹】A nurse is teaching about food safety. Which is most important?
A. Wash hands before handling food
B. Eat raw eggs
C. Cook meat thoroughly
D. Discard old food

【正解】A
【解析】手部衛生是首要食品安全步驟。

只輸出 JSON: {"verdict":"OK","issues":[],"confidence":95}`;

const SYSTEM = "你是 NCLEX 審查員，輸出 JSON。";

async function callOnce(idx) {
  const start = Date.now();
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${NVIDIA}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-ai/deepseek-v4-pro",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: TEST_PROMPT },
        ],
        max_tokens: 256,
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { idx, ok: false, status: res.status, elapsed, error: errText.slice(0, 100) };
    }
    await res.json();
    return { idx, ok: true, elapsed };
  } catch (e) {
    clearTimeout(timeout);
    const elapsed = Date.now() - start;
    return { idx, ok: false, elapsed, error: e.name === "AbortError" ? "TIMEOUT" : e.message };
  }
}

async function probeAt(concurrency) {
  console.log(`\n=== Probe with concurrency=${concurrency} ===`);
  const start = Date.now();
  const promises = Array.from({ length: concurrency }, (_, i) => callOnce(i));
  const results = await Promise.all(promises);
  const elapsed = Date.now() - start;

  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);

  console.log(`Total: ${results.length}`);
  console.log(`OK:    ${ok.length} (${(ok.length / results.length * 100).toFixed(0)}%)`);
  console.log(`Fail:  ${fail.length}`);

  if (ok.length) {
    const times = ok.map(r => r.elapsed).sort((a, b) => a - b);
    const avg = times.reduce((s, t) => s + t, 0) / times.length;
    const p50 = times[Math.floor(times.length * 0.5)];
    const p95 = times[Math.floor(times.length * 0.95)] ?? times[times.length - 1];
    console.log(`Latency: avg ${avg.toFixed(0)}ms · p50 ${p50}ms · p95 ${p95}ms`);
  }

  if (fail.length) {
    const byErr = {};
    fail.forEach(f => {
      const key = f.status ? `HTTP ${f.status}` : (f.error || "unknown");
      byErr[key] = (byErr[key] || 0) + 1;
    });
    console.log(`Errors:`);
    Object.entries(byErr).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
    fail.slice(0, 3).forEach(f => console.log(`  e.g. [${f.idx}] ${f.error?.slice(0, 80)}`));
  }

  console.log(`Wall-clock for batch: ${(elapsed / 1000).toFixed(1)}s`);

  // Rough throughput projection
  if (ok.length > 0) {
    const effRate = ok.length / (elapsed / 1000); // q/s
    const total14k = 14323 / effRate / 60 / 60;
    console.log(`Effective throughput: ${effRate.toFixed(2)} q/s → 14,323 in ${total14k.toFixed(1)} hr`);
  }

  return { concurrency, ok: ok.length, fail: fail.length, elapsed };
}

// Step concurrency up
const levels = [1, 3, 5, 8, 12];

for (const c of levels) {
  await probeAt(c);
  // brief cool-down between levels
  await new Promise(r => setTimeout(r, 3000));
}

console.log("\n=== Done ===");
