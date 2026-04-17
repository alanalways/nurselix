#!/usr/bin/env node
/**
 * Batch question explanation enhancer.
 *
 * Scans APPROVED questions with missing / short explanations and calls
 * Claude Sonnet 4.6 to generate detailed explanations, per-option rationales,
 * US-TW difference notes, and Chinese stem translations, then writes them
 * directly to the database.
 *
 * Usage:
 *   node scripts/batch-enhance-questions.js [options]
 *
 *   --dry-run        Count flagged questions, print cost estimate, exit without calling Claude.
 *   --limit=N        Process at most N questions (default: all).
 *   --issue=TYPE     Filter by issue type:
 *                      missing_explanation  (no explanation or "暫無解析")
 *                      short_explanation    (< 100 chars)
 *                      missing_rationales   (null optionRationales)
 *                      missing_stem_zh      (null/empty stemZh)
 *                      all                  (any of the above, default)
 *   --concurrency=N  Max parallel Claude requests (default: 3, max: 5).
 *   --env=FILE       Path to .env file (default: .env.local then .env).
 *
 * Cost estimate (Sonnet 4.6):
 *   ~$0.016 per question (≈ 350 input + 900 output tokens).
 *   1 000 questions ≈ $16   (≈ NT$520)
 *   5 000 questions ≈ $80   (≈ NT$2 600)
 *  14 500 questions ≈ $232  (≈ NT$7 500)
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// ─── Load env ────────────────────────────────────────────────────────────────
function loadEnv(file) {
  try {
    const content = fs.readFileSync(file, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // ignore missing files
  }
}

const args = parseArgs(process.argv);
const envFile = args.flags["env"];
if (envFile) {
  loadEnv(envFile);
} else {
  const root = path.resolve(__dirname, "..");
  loadEnv(path.join(root, ".env.local"));
  loadEnv(path.join(root, ".env"));
}

// ─── Arg parsing ─────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { positional: [], flags: {} };
  for (const a of argv.slice(2)) {
    if (a.startsWith("--")) {
      const [k, v] = a.substring(2).split("=");
      args.flags[k] = v === undefined ? true : v;
    } else {
      args.positional.push(a);
    }
  }
  return args;
}

const DRY_RUN     = args.flags["dry-run"] === true || args.flags["dry-run"] === "true";
const LIMIT       = args.flags["limit"]       ? parseInt(args.flags["limit"])       : Infinity;
const ISSUE       = args.flags["issue"]       ?? "all";
const CONCURRENCY = Math.min(5, parseInt(args.flags["concurrency"] ?? "3"));

// ─── Claude ───────────────────────────────────────────────────────────────────
let Anthropic;
try {
  Anthropic = require("@anthropic-ai/sdk");
} catch {
  console.error("❌  @anthropic-ai/sdk not found. Run: npm install @anthropic-ai/sdk");
  process.exit(1);
}
const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `你是資深 NCLEX-RN 護理教學專家，擅長以繁體中文為 NCLEX 題目撰寫詳細、精確、有臨床實用性的解析，目標讀者是準備赴美執業的台灣護理師。

撰寫原則：
1. 解析必須涵蓋：核心概念、為什麼正確答案對、臨床思路（priority / safety / ABC 等）
2. 每個選項的分析要精確說明「為什麼對」或「為什麼錯」
3. 若台美臨床做法有差異（藥物、劑量、routine order、scope of practice），必須點出
4. 語氣專業但易懂，避免過度艱深的中文
5. 專有名詞：第一次用「中文（英文）」格式，後續用中文即可
6. 不要寫空話、不要複述題目，重點在教學`;

// ─── DB ───────────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Cost calc ────────────────────────────────────────────────────────────────
function calcCost(usage) {
  const { inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0 } = usage;
  return (inputTokens / 1_000_000) * 3.00
       + (outputTokens / 1_000_000) * 15.00
       + (cacheReadTokens / 1_000_000) * 0.30
       + (cacheWriteTokens / 1_000_000) * 3.75;
}

// ─── Query helpers ────────────────────────────────────────────────────────────
async function fetchFlagged() {
  let whereExtra = "";
  if (ISSUE === "missing_explanation") {
    whereExtra = `AND (q."explanationZh" = '' OR q."explanationZh" = '暫無解析' OR q."explanationZh" IS NULL)`;
  } else if (ISSUE === "short_explanation") {
    whereExtra = `AND q."explanationZh" IS NOT NULL AND q."explanationZh" != '暫無解析' AND LENGTH(q."explanationZh") < 100`;
  } else if (ISSUE === "missing_rationales") {
    whereExtra = `AND q."optionRationales" IS NULL`;
  } else if (ISSUE === "missing_stem_zh") {
    whereExtra = `AND (q."stemZh" IS NULL OR q."stemZh" = '')`;
  } else {
    // "all" – any of the above
    whereExtra = `AND (
      q."explanationZh" = '' OR q."explanationZh" = '暫無解析' OR q."explanationZh" IS NULL
      OR (q."explanationZh" IS NOT NULL AND q."explanationZh" != '暫無解析' AND LENGTH(q."explanationZh") < 100)
      OR q."optionRationales" IS NULL
      OR q."stemZh" IS NULL OR q."stemZh" = ''
    )`;
  }

  const sql = `
    SELECT
      q.id,
      q.stem,
      q."stemZh",
      q.domain,
      q.difficulty,
      q."questionType",
      q."correctAnswer",
      q."correctAnswers",
      q."optionA", q."optionB", q."optionC", q."optionD",
      q."optionE", q."optionF",
      q."explanationZh",
      q."optionRationales",
      q."usTwDifference"
    FROM "Question" q
    WHERE q.status = 'APPROVED'
    ${whereExtra}
    ORDER BY q."createdAt" ASC
  `;
  const { rows } = await pool.query(sql);
  return rows;
}

// ─── Claude call ─────────────────────────────────────────────────────────────
async function enhance(q) {
  const correctLetters = Array.isArray(q.correctAnswers) && q.correctAnswers.length > 0
    ? q.correctAnswers
    : (q.correctAnswer ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const options = {
    A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD,
    ...(q.optionE ? { E: q.optionE } : {}),
    ...(q.optionF ? { F: q.optionF } : {}),
  };

  const optionsText = Object.entries(options)
    .map(([k, v]) => `${k}. ${v}${correctLetters.includes(k) ? "  ← 正確答案" : ""}`)
    .join("\n");

  const hasE = !!q.optionE;
  const hasF = !!q.optionF;

  const userPrompt = `題型：${q.questionType === "SATA" ? "複選題 (SATA)" : "單選題 (SBA)"}
Domain：${q.domain ?? "未分類"}　難度：${q.difficulty}

題幹 (EN)：
${q.stem}

${q.stemZh ? `題幹 (中)：\n${q.stemZh}\n` : ""}選項：
${optionsText}

正確答案：${correctLetters.join(", ")}

現有解析（可能過短或欠缺）：
${q.explanationZh || "（無）"}

請輸出 JSON（只輸出 JSON，無其他文字）：
{
  "explanationZh": "<400-600 字繁體中文詳細解析：核心概念 + 臨床思路 + 為何此答案最佳>",
  "optionRationales": {
    "A": "<選項 A 為什麼對/錯，80-150 字繁中>",
    "B": "...",
    "C": "...",
    "D": "..."${hasE ? ',\n    "E": "..."' : ""}${hasF ? ',\n    "F": "..."' : ""}
  },
  "usTwDifference": "<若台美臨床做法不同，簡述差異（50-150 字）。若無顯著差異，回傳空字串>",
  "stemZh": "${q.stemZh ? "" : "<若原本無中文題幹，請產生繁體中文翻譯（不超過原文長度的 1.2 倍）>"}"
}`;

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
  });

  const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "{}";
  const usage = {
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
    cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: msg.usage.cache_creation_input_tokens ?? 0,
  };

  let parsed = {};
  try {
    parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
  } catch {
    console.warn(`  ⚠️  Parse error for ${q.id}`);
  }

  return { parsed, usage, costUsd: calcCost(usage) };
}

// ─── DB write ─────────────────────────────────────────────────────────────────
async function applyEnhancement(q, parsed) {
  // Merge rationales: keep existing EN, overwrite ZH
  let mergedRationales = null;
  if (parsed.optionRationales && Object.keys(parsed.optionRationales).length > 0) {
    const existing = q.optionRationales ?? {};
    mergedRationales = { ...existing };
    for (const [letter, text] of Object.entries(parsed.optionRationales)) {
      mergedRationales[letter] = {
        en: mergedRationales[letter]?.en ?? null,
        zh: text,
      };
    }
  }

  const sets = [];
  const vals = [];
  let idx = 1;

  if (parsed.explanationZh) {
    sets.push(`"explanationZh" = $${idx++}`);
    vals.push(parsed.explanationZh);
  }
  if (mergedRationales) {
    sets.push(`"optionRationales" = $${idx++}`);
    vals.push(JSON.stringify(mergedRationales));
  }
  if (parsed.usTwDifference !== undefined) {
    sets.push(`"usTwDifference" = $${idx++}`);
    vals.push(parsed.usTwDifference || null);
  }
  if (parsed.stemZh && !q.stemZh) {
    sets.push(`"stemZh" = $${idx++}`);
    vals.push(parsed.stemZh);
  }

  if (sets.length === 0) return;
  vals.push(q.id);
  await pool.query(
    `UPDATE "Question" SET ${sets.join(", ")} WHERE id = $${idx}`,
    vals
  );
}

async function logApiUsage(usage, costUsd) {
  await pool.query(
    `INSERT INTO "ApiUsageLog"
       (id, model, "inputTokens", "outputTokens", "cacheReadTokens", "cacheWriteTokens", purpose, "costUsd", "createdAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now())`,
    [
      MODEL,
      usage.inputTokens,
      usage.outputTokens,
      usage.cacheReadTokens,
      usage.cacheWriteTokens,
      "question_enhance_batch",
      costUsd,
    ]
  );
}

// ─── Concurrency pool ─────────────────────────────────────────────────────────
async function runWithConcurrency(items, concurrency, fn) {
  let idx = 0;
  const results = [];
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍  Scanning questions…");
  const allFlagged = await fetchFlagged();
  const flagged = allFlagged.slice(0, LIMIT === Infinity ? undefined : LIMIT);

  const EST_INPUT  = 350;
  const EST_OUTPUT = 900;
  const estCostPer = calcCost({ inputTokens: EST_INPUT, outputTokens: EST_OUTPUT });
  const estTotal   = estCostPer * flagged.length;
  const estNtd     = Math.round(estTotal * 32.5);

  console.log(`\n📊  Flagged (issue="${ISSUE}"): ${allFlagged.length} questions`);
  if (LIMIT < Infinity) console.log(`    Processing first: ${flagged.length}`);
  console.log(`    Est. cost: $${estTotal.toFixed(2)} USD ≈ NT$${estNtd}`);
  console.log(`    Est. time: ~${Math.ceil(flagged.length / CONCURRENCY * 4 / 60)} min (${CONCURRENCY} parallel)\n`);

  if (DRY_RUN) {
    console.log("✅  Dry-run done. No changes made.");
    await pool.end();
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("❌  ANTHROPIC_API_KEY not set.");
    await pool.end();
    process.exit(1);
  }

  let done = 0;
  let errors = 0;
  let totalCost = 0;

  const startTime = Date.now();

  await runWithConcurrency(flagged, CONCURRENCY, async (q, i) => {
    try {
      const { parsed, usage, costUsd } = await enhance(q);
      await applyEnhancement(q, parsed);
      await logApiUsage(usage, costUsd);
      totalCost += costUsd;
      done++;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const pct = Math.round((done + errors) / flagged.length * 100);
      process.stdout.write(
        `\r  [${pct}%] ${done + errors}/${flagged.length}  ✓${done} ✗${errors}  $${totalCost.toFixed(3)}  ${elapsed}s`
      );
    } catch (err) {
      errors++;
      const pct = Math.round((done + errors) / flagged.length * 100);
      process.stdout.write(
        `\r  [${pct}%] ${done + errors}/${flagged.length}  ✓${done} ✗${errors}  $${totalCost.toFixed(3)}`
      );
      if (process.env.VERBOSE) console.error(`\n  ✗ ${q.id}: ${err.message}`);
    }
  });

  const elapsedMin = ((Date.now() - startTime) / 60000).toFixed(1);
  console.log(`\n\n✅  Done in ${elapsedMin} min`);
  console.log(`   ✓ ${done} enhanced   ✗ ${errors} failed`);
  console.log(`   Total cost: $${totalCost.toFixed(4)} USD ≈ NT$${Math.round(totalCost * 32.5)}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  pool.end();
  process.exit(1);
});
