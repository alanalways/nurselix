#!/usr/bin/env node
/**
 * Nurslix question quality scanner
 * Usage: node scan-questions.mjs
 * Requires: DATABASE_URL env var (or edit the connection string below)
 */

import pg from "pg";
import fs from "fs";

const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://root:4clS795GNmrC3jqB1R2U8npy0xDHah6V@172.233.94.193:31815/zeabur";

const client = new pg.Client({ connectionString: DATABASE_URL });

async function main() {
  console.log("Connecting to database…");
  await client.connect();
  console.log("Connected.\n");

  // ── 1. Summary counts ────────────────────────────────────────────────────
  const { rows: counts } = await client.query(`
    SELECT
      COUNT(*)                                              AS total,
      COUNT(*) FILTER (WHERE status = 'APPROVED')         AS approved,
      COUNT(*) FILTER (WHERE status = 'DRAFT')            AS draft,
      COUNT(*) FILTER (WHERE status = 'ARCHIVED')         AS archived,
      COUNT(*) FILTER (WHERE module = 'NCLEX')            AS nclex,
      COUNT(*) FILTER (WHERE module = 'TOEIC')            AS toeic,
      COUNT(*) FILTER (WHERE "hasAudio" = true)           AS has_audio,
      COUNT(*) FILTER (WHERE "explanationZh" = '' OR "explanationZh" = '暫無解析') AS missing_exp,
      COUNT(*) FILTER (WHERE "stemZh" IS NULL OR "stemZh" = '')                   AS missing_stemzh,
      COUNT(*) FILTER (WHERE length("explanationZh") < 100 AND "explanationZh" != '') AS short_exp
    FROM "Question"
  `);
  const c = counts[0];
  console.log("═══ 題庫總覽 ═══");
  console.log(`總題數:       ${c.total}`);
  console.log(`APPROVED:     ${c.approved}`);
  console.log(`DRAFT:        ${c.draft}`);
  console.log(`ARCHIVED:     ${c.archived}`);
  console.log(`NCLEX:        ${c.nclex}`);
  console.log(`TOEIC:        ${c.toeic}`);
  console.log(`有音檔:       ${c.has_audio}`);
  console.log(`缺解析:       ${c.missing_exp}`);
  console.log(`缺中文題幹:   ${c.missing_stemzh}`);
  console.log(`解析過短<100: ${c.short_exp}`);
  console.log();

  // ── 2. Domain distribution ───────────────────────────────────────────────
  const { rows: domains } = await client.query(`
    SELECT domain, COUNT(*) AS cnt
    FROM "Question"
    WHERE status = 'APPROVED'
    GROUP BY domain
    ORDER BY cnt DESC
    LIMIT 20
  `);
  console.log("═══ Domain 分佈（APPROVED）═══");
  domains.forEach((r) => console.log(`  ${String(r.domain ?? "未分類").padEnd(40)} ${r.cnt}`));
  console.log();

  // ── 3. Pending reports ───────────────────────────────────────────────────
  const { rows: reports } = await client.query(`
    SELECT
      r."questionId",
      r.reason,
      COUNT(*) AS report_count,
      q.stem,
      q."correctAnswer",
      q."optionA", q."optionB", q."optionC", q."optionD",
      q."explanationZh"
    FROM "QuestionReport" r
    JOIN "Question" q ON q.id = r."questionId"
    WHERE r.status IN ('pending', 'reviewed')
    GROUP BY r."questionId", r.reason, q.stem, q."correctAnswer",
             q."optionA", q."optionB", q."optionC", q."optionD", q."explanationZh"
    ORDER BY report_count DESC
  `);

  console.log("═══ 待審回報題目 ═══");
  if (reports.length === 0) {
    console.log("  （無待審回報）");
  } else {
    reports.forEach((r, i) => {
      console.log(`\n[${i + 1}] 題目 ID: ${r.questionId} | 回報原因: ${r.reason} × ${r.report_count} 次`);
      console.log(`    題幹: ${r.stem?.slice(0, 120)}…`);
      console.log(`    正確答案: ${r.correctAnswer}`);
      console.log(`    A. ${r.optionA}`);
      console.log(`    B. ${r.optionB}`);
      console.log(`    C. ${r.optionC}`);
      console.log(`    D. ${r.optionD}`);
      console.log(`    解析: ${(r.explanationzh || "（無）").slice(0, 200)}…`);
    });
  }
  console.log();

  // ── 4. Full dump of reported questions as JSON ───────────────────────────
  if (reports.length > 0) {
    const ids = [...new Set(reports.map((r) => r.questionId))];
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    const { rows: fullQ } = await client.query(`
      SELECT
        id, stem, "stemZh", domain, difficulty, module, status,
        "optionA", "optionB", "optionC", "optionD", "optionE", "optionF",
        "correctAnswer", "correctAnswers",
        "explanationZh", "explanationEn",
        "attemptCount", "correctCount", "errorRate",
        "hasAudio", "audioScript"
      FROM "Question"
      WHERE id IN (${placeholders})
    `, ids);

    const outFile = "reported_questions.json";
    fs.writeFileSync(outFile, JSON.stringify(fullQ, null, 2), "utf8");
    console.log(`✅ 完整題目資料已匯出到 ${outFile}`);
  }

  // ── 5. High error-rate questions (≥60% wrong) ────────────────────────────
  const { rows: hardQ } = await client.query(`
    SELECT id, stem, domain, "correctAnswer", "attemptCount", "correctCount",
           ROUND((1 - "correctCount"::numeric / NULLIF("attemptCount", 0)) * 100) AS error_rate
    FROM "Question"
    WHERE status = 'APPROVED'
      AND "attemptCount" >= 20
      AND ("correctCount"::numeric / NULLIF("attemptCount", 0)) < 0.4
    ORDER BY error_rate DESC
    LIMIT 20
  `);
  console.log("═══ 錯誤率 ≥ 60%（答題次數 ≥ 20）═══");
  if (hardQ.length === 0) {
    console.log("  （無）");
  } else {
    hardQ.forEach((r) => {
      console.log(`  ${r.id.substring(0, 8)} | 錯誤率 ${r.error_rate}% | ${r.attemptcount} 次 | ${r.stem?.slice(0, 80)}…`);
    });
  }

  await client.end();
  console.log("\n掃描完成。");
}

main().catch((err) => {
  console.error("錯誤:", err.message);
  process.exit(1);
});
