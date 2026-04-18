#!/usr/bin/env node
/**
 * Nurslix 批次收取 + 自動過濾腳本
 *
 * 用法：
 *   node scripts/collect-batch.js <檔案路徑>
 *   node scripts/collect-batch.js scripts/batches/batch_001.json
 *
 * 腳本會：
 * 1. 驗證 schema（欄位、MCQ/SATA 規則、IRT）
 * 2. 偵測亂碼（副詞堆疊 >15 個 或 rationale >800 字）
 * 3. 偵測 Mad Libs（重複 usTwDifference、重複 explanation 開頭）
 * 4. 好題 → 追加到 scripts/batches/approved.json
 * 5. 壞題 → 列出清單讓你決定是否重生成
 */

const fs = require("fs");
const path = require("path");

const REQUIRED_FIELDS = [
  "stem", "stemZh", "questionType", "domain", "difficulty",
  "optionA", "optionB", "optionC", "optionD",
  "correctAnswer", "correctAnswers",
  "explanationZh", "optionRationales", "usTwDifference",
  "irtA", "irtB", "irtC",
];

const VALID_DOMAINS = [
  "Management of Care",
  "Safety & Infection Control",
  "Health Promotion & Maintenance",
  "Psychosocial Integrity",
  "Basic Care & Comfort",
  "Pharmacological and Parenteral Therapies",
  "Reduction of Risk Potential",
  "Physiological Adaptation",
];

const ADVERB_PATTERN = /(aggressively|fiercely|deeply|essentially|completely|entirely|absolutely|violently|purely|flawlessly|strictly|exclusively|thoroughly|directly|heavily|perfectly|smoothly|cleanly|safely|incredibly|seamlessly|magically)/gi;

const APPROVED_PATH = path.resolve(__dirname, "batches/approved.json");

// ─── 讀入已核准的題目 ─────────────────────────────────────────────────────
function loadApproved() {
  if (!fs.existsSync(APPROVED_PATH)) return [];
  try { return JSON.parse(fs.readFileSync(APPROVED_PATH, "utf8")); }
  catch { return []; }
}

// ─── 儲存已核准題目 ───────────────────────────────────────────────────────
function saveApproved(data) {
  fs.mkdirSync(path.dirname(APPROVED_PATH), { recursive: true });
  fs.writeFileSync(APPROVED_PATH, JSON.stringify(data, null, 2), "utf8");
}

// ─── 驗證單題 ─────────────────────────────────────────────────────────────
function validateQuestion(q, idx) {
  const errors = [];

  // 必填欄位
  for (const f of REQUIRED_FIELDS) {
    if (q[f] === undefined) errors.push(`缺少欄位: ${f}`);
  }

  // Domain 名稱
  if (q.domain && !VALID_DOMAINS.includes(q.domain)) {
    errors.push(`Domain 名稱錯誤: "${q.domain}"`);
  }

  // MCQ 規則
  if (q.questionType === "MCQ") {
    if (!q.correctAnswer) errors.push("MCQ 缺少 correctAnswer");
    if (q.correctAnswers !== null && q.correctAnswers !== undefined)
      errors.push("MCQ 的 correctAnswers 必須是 null");
    if (q.optionE !== undefined && q.optionE !== null)
      errors.push("MCQ 不能有 optionE");
  }

  // SATA 規則
  if (q.questionType === "SATA") {
    if (q.correctAnswer !== null && q.correctAnswer !== undefined)
      errors.push("SATA 的 correctAnswer 必須是 null");
    if (!Array.isArray(q.correctAnswers) || q.correctAnswers.length < 2)
      errors.push("SATA 的 correctAnswers 必須是陣列且至少 2 個");
    if (!q.optionE) errors.push("SATA 缺少 optionE");
  }

  // IRT 數值
  if (q.difficulty === "EASY" && (q.irtA !== 0.8 || q.irtB !== -1.0))
    errors.push(`EASY 的 IRT 應為 a=0.8 b=-1.0，實際 a=${q.irtA} b=${q.irtB}`);
  if (q.difficulty === "MEDIUM" && (q.irtA !== 1.0 || q.irtB !== 0.0))
    errors.push(`MEDIUM 的 IRT 應為 a=1.0 b=0.0，實際 a=${q.irtA} b=${q.irtB}`);
  if (q.difficulty === "HARD" && (q.irtA !== 1.2 || q.irtB !== 1.0))
    errors.push(`HARD 的 IRT 應為 a=1.2 b=1.0，實際 a=${q.irtA} b=${q.irtB}`);
  if (q.irtC !== 0.20 && q.irtC !== 0.2)
    errors.push(`irtC 應為 0.20，實際 ${q.irtC}`);

  // usTwDifference 不可 null
  if (!q.usTwDifference) errors.push("usTwDifference 為空或 null");

  // 題幹不可是填空縮寫式（如 "37F" "72M"）
  if (/^\d+[FM]\s/.test(q.stem)) errors.push("題幹是填空縮寫格式（如 37F、72M）");

  // 副詞亂碼偵測
  if (q.optionRationales) {
    for (const letter of ["A", "B", "C", "D", "E"]) {
      const en = q.optionRationales[letter]?.en || "";
      const matches = en.match(ADVERB_PATTERN) || [];
      if (matches.length > 15 || en.length > 800) {
        errors.push(`選項 ${letter} 英文說明疑似亂碼（副詞 ${matches.length} 個 / 長度 ${en.length}）`);
      }
    }
  }

  return errors;
}

// ─── 批次層面檢查 ─────────────────────────────────────────────────────────
function batchChecks(questions) {
  const warnings = [];

  // usTwDifference 重複
  const usTwMap = {};
  for (let i = 0; i < questions.length; i++) {
    const v = questions[i].usTwDifference;
    if (v) usTwMap[v] = (usTwMap[v] || 0) + 1;
  }
  const dupeUsTw = Object.entries(usTwMap).filter(([, c]) => c >= 3);
  if (dupeUsTw.length) {
    warnings.push(`⚠️  ${dupeUsTw.length} 個 usTwDifference 在批次內重複出現 ≥3 次（Mad Libs 模板跡象）`);
  }

  // explanationZh 開頭重複
  const explStarts = {};
  for (const q of questions) {
    const s = (q.explanationZh || "").slice(0, 15);
    explStarts[s] = (explStarts[s] || 0) + 1;
  }
  const dupeExpl = Object.entries(explStarts).filter(([, c]) => c >= 5);
  if (dupeExpl.length) {
    for (const [text, count] of dupeExpl) {
      warnings.push(`⚠️  "${text}..." 作為 explanation 開頭重複 ${count} 次`);
    }
  }

  return warnings;
}

// ─── 主流程 ───────────────────────────────────────────────────────────────
function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("用法: node scripts/collect-batch.js <JSON檔案路徑>");
    process.exit(1);
  }

  const absPath = path.resolve(inputPath);
  if (!fs.existsSync(absPath)) {
    console.error(`找不到檔案: ${absPath}`);
    process.exit(1);
  }

  let raw;
  try { raw = JSON.parse(fs.readFileSync(absPath, "utf8")); }
  catch (e) { console.error("JSON 解析失敗:", e.message); process.exit(1); }

  if (!Array.isArray(raw)) {
    console.error("JSON 根層不是陣列");
    process.exit(1);
  }

  console.log(`\n📂 讀取: ${inputPath}`);
  console.log(`📊 題數: ${raw.length}`);
  console.log("─".repeat(60));

  const good = [];
  const bad = [];

  for (let i = 0; i < raw.length; i++) {
    const errors = validateQuestion(raw[i], i);
    if (errors.length === 0) {
      good.push(raw[i]);
    } else {
      bad.push({ idx: i, stem: (raw[i].stem || "").slice(0, 80), errors });
    }
  }

  // 批次層面警告
  const warnings = batchChecks(raw);

  // ─── 報告 ─────────────────────────────────────────────────────────────
  console.log(`\n✅ 通過: ${good.length} 題`);
  console.log(`❌ 失敗: ${bad.length} 題`);

  if (warnings.length) {
    console.log("\n⚠️  批次層面警告：");
    for (const w of warnings) console.log(" ", w);
  }

  if (bad.length) {
    console.log("\n❌ 失敗題目詳情：");
    for (const b of bad.slice(0, 20)) {
      console.log(`\n  [IDX ${b.idx}] ${b.stem}...`);
      for (const e of b.errors) console.log(`    - ${e}`);
    }
    if (bad.length > 20) console.log(`  ...還有 ${bad.length - 20} 題未顯示`);
  }

  if (good.length === 0) {
    console.log("\n⛔ 沒有可入庫的題目，退出。");
    process.exit(1);
  }

  // ─── 入庫 ─────────────────────────────────────────────────────────────
  const approved = loadApproved();
  const before = approved.length;
  approved.push(...good);
  saveApproved(approved);

  const byDomain = {};
  for (const q of approved) byDomain[q.domain] = (byDomain[q.domain] || 0) + 1;

  console.log(`\n💾 已追加 ${good.length} 題 → approved.json`);
  console.log(`📈 總入庫: ${before} → ${approved.length} 題`);
  console.log(`🎯 目標: 11,000 題 (剩餘 ${Math.max(0, 11000 - approved.length)} 題)`);
  console.log("\n📊 各 Domain 入庫進度：");
  const domainTargets = {
    "Management of Care": 1540,
    "Safety & Infection Control": 1210,
    "Health Promotion & Maintenance": 1210,
    "Psychosocial Integrity": 990,
    "Basic Care & Comfort": 990,
    "Pharmacological and Parenteral Therapies": 1540,
    "Reduction of Risk Potential": 1540,
    "Physiological Adaptation": 1980,
  };
  for (const [d, target] of Object.entries(domainTargets)) {
    const count = byDomain[d] || 0;
    const pct = Math.round((count / target) * 100);
    const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
    console.log(`  ${bar} ${pct.toString().padStart(3)}% ${d} (${count}/${target})`);
  }

  console.log("\n✨ 完成！");
}

main();
