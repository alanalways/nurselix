#!/usr/bin/env node
/**
 * Quality deep scan — applies all 18 rules to every Question and writes findings
 * to QuestionQualityIssue. Pure rules, no LLM API calls.
 *
 * Usage:  node scripts/quality-deep-scan.mjs [--dry-run] [--auto-archive-critical]
 *
 * Behavior:
 *   - Inserts new issues (skipped if same questionId+ruleId+contentHash exists).
 *   - Closes resolved issues (issue exists in DB but no longer detected).
 *   - With --auto-archive-critical: questions with any CRITICAL issue → status DRAFT.
 *   - Writes a daily QualityHealthReport row.
 *   - Writes JSON summary to scripts/last-quality-scan.json.
 */
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Load .env.local if present
const envFile = ".env.local";
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf8").split("\n").forEach(line => {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  });
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("DATABASE_URL not set"); process.exit(1); }

const DRY_RUN = process.argv.includes("--dry-run");
const AUTO_ARCHIVE = process.argv.includes("--auto-archive-critical");

// ---------- Rules (mirror of lib/quality/rules.ts in plain JS) ----------

const ADVERBS = [
  "gracefully","smartly","securely","perfectly","actively","smoothly",
  "expertly","forcefully","dynamically","cleanly","tightly","exactly",
  "completely","strictly","correctly","reliably","boldly","vigorously",
  "intelligently","flawlessly","beautifully","seamlessly","faithfully",
];

const countOcc = (text, words) => {
  const lower = text.toLowerCase();
  return words.reduce((s, w) => s + ((lower.match(new RegExp(`\\b${w}\\b`, "g")) || []).length), 0);
};
const getOpts = q => [
  { letter: "A", text: q.optionA },
  { letter: "B", text: q.optionB },
  { letter: "C", text: q.optionC },
  { letter: "D", text: q.optionD },
  ...(q.optionE ? [{ letter: "E", text: q.optionE }] : []),
  ...(q.optionF ? [{ letter: "F", text: q.optionF }] : []),
];
const getCorrect = q => Array.isArray(q.correctAnswers) && q.correctAnswers.length
  ? q.correctAnswers
  : (q.correctAnswer || "").split(",").map(s => s.trim()).filter(Boolean);

const RULES = [
  { id: "adverb_pollution", severity: "HIGH", check: q => {
    const combined = [q.stem, q.optionA, q.optionB, q.optionC, q.optionD, q.optionE, q.optionF].filter(Boolean).join(" ");
    const hits = countOcc(combined, ADVERBS);
    if (hits >= 40) return { severity: "CRITICAL", detail: `Severe noise: ${hits} adverbs`, meta: { hits } };
    if (hits >= 8) return { severity: "HIGH", detail: `Heavy noise: ${hits} adverbs`, meta: { hits } };
    if (hits >= 3) return { severity: "MEDIUM", detail: `Mild noise: ${hits} adverbs`, meta: { hits } };
    return null;
  }},
  { id: "irrelevant_noise_rationale", severity: "CRITICAL", check: q => {
    const r = q.optionRationales ? JSON.stringify(q.optionRationales) : "";
    if (r.includes("Irrelevant noise") || r.includes("無關雜訊"))
      return { severity: "CRITICAL", detail: "Rationale contains 'Irrelevant noise' marker" };
    return null;
  }},
  { id: "answer_rationale_contradiction", severity: "CRITICAL", check: q => {
    if (!q.optionRationales || typeof q.optionRationales !== "object") return null;
    // Skip "find the wrong action" type stems
    const stemAll = `${q.stem || ""} ${q.stemZh || ""}`;
    const isNegStem = /requires? (further |additional |immediate )?(teaching|instruction|education|clarification|correction|intervention)/i.test(stemAll)
      || /indicates? (a )?need for (further |additional )?(teaching|instruction|education|clarification|correction)/i.test(stemAll)
      || /is (NOT |inappropriate|incorrect|contraindicated|wrong)/i.test(stemAll)
      || /which action breaks/i.test(stemAll) || /needs further/i.test(stemAll)
      || /needs? clarification/i.test(stemAll) || /which.+inappropriate/i.test(stemAll)
      || /需要進一步(指導|教學|衛教|教育|澄清)/.test(stemAll) || /何者(不|錯誤|不適當|不正確)/.test(stemAll);
    if (isNegStem) return null;
    const offenders = [];
    for (const letter of getCorrect(q)) {
      const r = q.optionRationales?.[letter];
      const zh = r?.zh || "";
      if (/^錯誤[，,。 ]/.test(zh) || zh.startsWith("錯。"))
        offenders.push(letter);
    }
    if (offenders.length) return { severity: "CRITICAL",
      detail: `Correct option(s) ${offenders.join(",")} have rationale starting with '錯誤'`, meta: { offenders } };
    return null;
  }},
  { id: "wrong_option_marked_correct", severity: "HIGH", check: q => {
    if (!q.optionRationales || typeof q.optionRationales !== "object") return null;
    const correct = new Set(getCorrect(q));
    const offenders = [];
    for (const letter of ["A","B","C","D","E","F"]) {
      if (correct.has(letter)) continue;
      const r = q.optionRationales?.[letter];
      const zh = r?.zh || "";
      if (/^正確[，,。 ]/.test(zh) || zh.startsWith("正確。")) offenders.push(letter);
    }
    if (offenders.length) return { severity: "HIGH",
      detail: `Incorrect option(s) ${offenders.join(",")} have rationale starting with '正確'`, meta: { offenders } };
    return null;
  }},
  { id: "long_stem", severity: "MEDIUM", check: q => {
    const len = (q.stem || "").length;
    if (len > 800) return { severity: "MEDIUM", detail: `Stem ${len} chars`, meta: { len } };
    return null;
  }},
  { id: "short_stem", severity: "HIGH", check: q => {
    const len = (q.stem || "").trim().length;
    if (len === 0) return { severity: "CRITICAL", detail: "Stem is empty" };
    if (len < 20) return { severity: "HIGH", detail: `Stem only ${len} chars`, meta: { len } };
    return null;
  }},
  { id: "empty_explanation", severity: "HIGH", check: q => {
    if (!(q.explanationZh || "").trim()) return { severity: "HIGH", detail: "explanationZh empty" };
    return null;
  }},
  { id: "short_explanation", severity: "MEDIUM", check: q => {
    const len = (q.explanationZh || "").trim().length;
    if (len > 0 && len < 50) return { severity: "MEDIUM", detail: `Explanation only ${len} chars`, meta: { len } };
    return null;
  }},
  { id: "placeholder_text", severity: "HIGH", check: q => {
    const all = [q.stem, q.explanationZh, q.optionA, q.optionB, q.optionC, q.optionD].filter(Boolean).join(" ");
    if (/(暫無解析|lorem ipsum|TBD|TODO|待補|placeholder|to be filled)/i.test(all))
      return { severity: "HIGH", detail: "Placeholder text found" };
    return null;
  }},
  { id: "extreme_option_imbalance", severity: "MEDIUM", check: q => {
    const opts = getOpts(q).filter(o => o.text && o.text.trim());
    if (opts.length < 2) return null;
    const lens = opts.map(o => o.text.length);
    const max = Math.max(...lens), min = Math.min(...lens);
    if (min > 0 && max / min > 3 && max > 80)
      return { severity: "MEDIUM", detail: `Option lengths max ${max} / min ${min}, ratio ${(max/min).toFixed(1)}`, meta: { max, min } };
    return null;
  }},
  { id: "answer_pointing_null", severity: "CRITICAL", check: q => {
    const correct = getCorrect(q);
    const optMap = Object.fromEntries(getOpts(q).map(o => [o.letter, o.text]));
    const off = correct.filter(l => !optMap[l] || !optMap[l].trim());
    if (off.length) return { severity: "CRITICAL", detail: `correctAnswer ${off.join(",")} points at empty option`, meta: { offenders: off } };
    return null;
  }},
  { id: "answer_correctAnswers_mismatch", severity: "HIGH", check: q => {
    const fromS = (q.correctAnswer || "").split(",").map(s => s.trim()).filter(Boolean).sort();
    const fromA = (q.correctAnswers || []).slice().sort();
    if (fromA.length === 0) return null;
    if (fromS.join(",") !== fromA.join(","))
      return { severity: "HIGH", detail: `correctAnswer="${fromS.join(",")}" vs correctAnswers=[${fromA.join(",")}]` };
    return null;
  }},
  { id: "sata_single_answer", severity: "MEDIUM", check: q => {
    if (q.questionType === "SATA" && getCorrect(q).length <= 1)
      return { severity: "MEDIUM", detail: "SATA but only 1 correct answer" };
    return null;
  }},
  { id: "mcq_multi_answer", severity: "HIGH", check: q => {
    if (q.questionType === "MCQ" && getCorrect(q).length > 1)
      return { severity: "HIGH", detail: `MCQ but ${getCorrect(q).length} correct answers` };
    return null;
  }},
  { id: "missing_rationale", severity: "MEDIUM", check: q => {
    const r = q.optionRationales;
    if (!r || typeof r !== "object") return { severity: "MEDIUM", detail: "optionRationales missing" };
    const opts = getOpts(q).filter(o => o.text && o.text.trim());
    const missing = opts.filter(o => {
      const ro = r?.[o.letter];
      return !ro || (!ro.zh && !ro.en);
    });
    if (missing.length) return { severity: "MEDIUM", detail: `Rationale missing for ${missing.map(o=>o.letter).join(",")}` };
    return null;
  }},
  { id: "missing_stemZh", severity: "MEDIUM", check: q => {
    if (q.module === "NCLEX" && !(q.stemZh || "").trim())
      return { severity: "MEDIUM", detail: "stemZh missing on NCLEX question" };
    return null;
  }},
  { id: "duplicate_options", severity: "HIGH", check: q => {
    const opts = getOpts(q).filter(o => o.text && o.text.trim().length > 10);
    for (let i = 0; i < opts.length; i++) for (let j = i+1; j < opts.length; j++) {
      if (opts[i].text.trim() === opts[j].text.trim())
        return { severity: "HIGH", detail: `Options ${opts[i].letter}/${opts[j].letter} identical` };
    }
    return null;
  }},
  { id: "high_error_rate", severity: "HIGH", check: q => {
    const a = q.attemptCount || 0, c = q.correctCount || 0;
    if (a >= 10) {
      const rate = 1 - c/a;
      if (rate > 0.7) return { severity: "HIGH", detail: `${a} attempts, error ${(rate*100).toFixed(0)}%`, meta: { attemptCount: a, rate } };
    }
    return null;
  }},
];

const contentHash = q => crypto.createHash("sha256")
  .update(JSON.stringify({ stem: q.stem, options: [q.optionA, q.optionB, q.optionC, q.optionD, q.optionE, q.optionF], correctAnswer: q.correctAnswer, explanationZh: q.explanationZh }))
  .digest("hex").slice(0, 16);

// ---------- Main ----------

async function main() {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log(`Quality deep scan starting${DRY_RUN ? " (DRY RUN)" : ""}${AUTO_ARCHIVE ? " (AUTO-ARCHIVE)" : ""}\n`);

  const { rows: questions } = await client.query(`
    SELECT id, module, "questionType", difficulty, status,
           stem, "stemZh", "optionA", "optionB", "optionC", "optionD", "optionE", "optionF",
           "correctAnswer", "correctAnswers", "explanationZh", "explanationEn",
           "optionRationales", "attemptCount", "correctCount", "errorRate"
    FROM "Question";
  `);
  console.log(`Loaded ${questions.length} questions`);

  // Existing open issues for delta
  const { rows: existing } = await client.query(`
    SELECT "questionId", "ruleId", "contentHash" FROM "QuestionQualityIssue" WHERE status = 'OPEN';
  `);
  const existingKeys = new Set(existing.map(e => `${e.questionId}:${e.ruleId}:${e.contentHash || ""}`));
  console.log(`Existing OPEN issues: ${existing.length}`);

  // Run rules
  const newIssues = [];
  const stats = {
    total: questions.length,
    issuesByRule: {},
    issuesBySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
    questionsWithIssues: 0,
    criticalQuestions: new Set(),
  };

  for (const q of questions) {
    const hash = contentHash(q);
    let hasIssue = false;
    let hasCritical = false;
    for (const rule of RULES) {
      const r = rule.check(q);
      if (!r) continue;
      hasIssue = true;
      if (r.severity === "CRITICAL") hasCritical = true;
      stats.issuesByRule[rule.id] = (stats.issuesByRule[rule.id] || 0) + 1;
      stats.issuesBySeverity[r.severity] = (stats.issuesBySeverity[r.severity] || 0) + 1;
      const key = `${q.id}:${rule.id}:${hash}`;
      if (existingKeys.has(key)) continue;
      newIssues.push({ questionId: q.id, ruleId: rule.id, severity: r.severity, detail: r.detail, meta: r.meta || null, contentHash: hash });
    }
    if (hasIssue) stats.questionsWithIssues++;
    if (hasCritical) stats.criticalQuestions.add(q.id);
  }

  console.log(`\n=== Scan summary ===`);
  console.log(`Questions with ≥1 issue: ${stats.questionsWithIssues}`);
  console.log(`Total issues:`);
  Object.entries(stats.issuesBySeverity).forEach(([s,n]) => console.log(`  ${s}: ${n}`));
  console.log(`\nBy rule:`);
  Object.entries(stats.issuesByRule).sort((a,b)=>b[1]-a[1]).forEach(([r,n]) => console.log(`  ${r}: ${n}`));
  console.log(`\nNew issues to insert: ${newIssues.length}`);
  console.log(`Critical questions: ${stats.criticalQuestions.size}`);

  // Write
  if (!DRY_RUN && newIssues.length) {
    console.log(`\nInserting ${newIssues.length} new issues...`);
    const BATCH = 500;
    for (let i = 0; i < newIssues.length; i += BATCH) {
      const chunk = newIssues.slice(i, i + BATCH);
      const values = chunk.map((_, idx) => {
        const o = idx * 6;
        return `($${o+1}, $${o+2}, $${o+3}, $${o+4}, $${o+5}::jsonb, $${o+6})`;
      }).join(",");
      const params = chunk.flatMap(n => [n.questionId, n.ruleId, n.severity, n.detail, JSON.stringify(n.meta), n.contentHash]);
      await client.query(`
        INSERT INTO "QuestionQualityIssue" ("questionId","ruleId","severity","detail","meta","contentHash")
        VALUES ${values}
        ON CONFLICT ("questionId","ruleId","contentHash") DO NOTHING;
      `, params);
    }
    console.log("Inserted.");
  }

  // Auto-archive critical
  if (AUTO_ARCHIVE && !DRY_RUN && stats.criticalQuestions.size > 0) {
    const ids = Array.from(stats.criticalQuestions);
    const r = await client.query(`
      UPDATE "Question" SET status = 'DRAFT', "updatedAt" = NOW()
      WHERE id = ANY($1::text[]) AND status = 'APPROVED';
    `, [ids]);
    console.log(`Auto-archived (status→DRAFT): ${r.rowCount} questions`);
  }

  // Health report (daily)
  const today = new Date().toISOString().slice(0, 10);
  const total = questions.length;
  const approved = questions.filter(q => q.status === "APPROVED").length;
  const draft = questions.filter(q => q.status === "DRAFT").length;
  const archived = questions.filter(q => q.status === "ARCHIVED").length;
  const openIssue = stats.questionsWithIssues;
  const weight = stats.issuesBySeverity.CRITICAL * 10 + stats.issuesBySeverity.HIGH * 5
               + stats.issuesBySeverity.MEDIUM * 2 + stats.issuesBySeverity.LOW * 1;
  const score = Math.max(0, Math.min(100, Math.round(100 - (weight / total) * 100)));

  if (!DRY_RUN) {
    await client.query(`
      INSERT INTO "QualityHealthReport"
        ("periodType","period","totalQuestions","approvedCount","draftCount","archivedCount","openIssueCount","healthScore","summary")
      VALUES ('daily',$1,$2,$3,$4,$5,$6,$7,$8::jsonb)
      ON CONFLICT ("periodType","period") DO UPDATE SET
        "totalQuestions"=EXCLUDED."totalQuestions",
        "approvedCount"=EXCLUDED."approvedCount",
        "draftCount"=EXCLUDED."draftCount",
        "archivedCount"=EXCLUDED."archivedCount",
        "openIssueCount"=EXCLUDED."openIssueCount",
        "healthScore"=EXCLUDED."healthScore",
        "summary"=EXCLUDED."summary",
        "createdAt"=NOW();
    `, [today, total, approved, draft, archived, openIssue, score, JSON.stringify({
      byRule: stats.issuesByRule,
      bySeverity: stats.issuesBySeverity,
      questionsWithIssues: stats.questionsWithIssues,
    })]);
    console.log(`Health report saved: score ${score}/100`);
  }

  // Save JSON for audit
  fs.writeFileSync("scripts/last-quality-scan.json", JSON.stringify({
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    stats: {
      ...stats,
      criticalQuestions: Array.from(stats.criticalQuestions),
    },
    healthScore: score,
  }, null, 2));
  console.log(`\nFull JSON: scripts/last-quality-scan.json`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
