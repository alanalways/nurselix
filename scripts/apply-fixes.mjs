#!/usr/bin/env node
/**
 * Apply manually-validated fixes to Question rows.
 * Each fix entry has:
 *   id: full question UUID
 *   updates: { columnName: newValue, ... }
 *   resolveIssues: [ruleId, ...] — issues to mark RESOLVED
 *   fixNote: short Traditional Chinese note for audit trail
 */
import pg from "pg";
import fs from "node:fs";

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
const fixesFile = args[0] || "scripts/fixes-batch.json";
const DRY = args.includes("--dry-run");

if (!fs.existsSync(fixesFile)) {
  console.error(`Fixes file not found: ${fixesFile}`);
  process.exit(1);
}

const fixes = JSON.parse(fs.readFileSync(fixesFile, "utf8"));
console.log(`Loaded ${fixes.length} fixes from ${fixesFile}`);
console.log(DRY ? "[DRY RUN — no DB writes]" : "[WRITE MODE]");
console.log("");

const c = new pg.Client({ connectionString: DATABASE_URL });
await c.connect();

let applied = 0, skipped = 0, errored = 0;

for (const fix of fixes) {
  try {
    if (!fix.id || !fix.updates) {
      console.log(`SKIP: missing id or updates`);
      skipped++;
      continue;
    }

    // Confirm question exists
    const exists = await c.query(`SELECT id FROM "Question" WHERE id = $1`, [fix.id]);
    if (exists.rows.length === 0) {
      console.log(`SKIP ${fix.id.slice(0,8)}: question not found`);
      skipped++;
      continue;
    }

    // Build UPDATE clause
    const cols = Object.keys(fix.updates);
    if (cols.length === 0) {
      console.log(`SKIP ${fix.id.slice(0,8)}: no updates`);
      skipped++;
      continue;
    }
    const setClauses = cols.map((col, i) => `"${col}" = $${i + 2}`).join(", ");
    const values = cols.map(col => {
      const v = fix.updates[col];
      // JSON columns need stringify
      if (col === "optionRationales" || col === "snapshot" || col === "meta") {
        return JSON.stringify(v);
      }
      // correctAnswers is text[] — pg accepts JS array directly
      return v;
    });

    if (DRY) {
      console.log(`[DRY] ${fix.id.slice(0,8)} would UPDATE: ${cols.join(", ")}`);
      console.log(`      note: ${fix.fixNote || "(none)"}`);
    } else {
      await c.query(
        `UPDATE "Question" SET ${setClauses}, "updatedAt" = NOW() WHERE id = $1`,
        [fix.id, ...values]
      );

      // Resolve the listed issues
      if (Array.isArray(fix.resolveIssues) && fix.resolveIssues.length > 0) {
        const resolveNote = fix.fixNote || "Manual fix applied by Claude after NIM/Codex agent audit";
        await c.query(
          `UPDATE "QuestionQualityIssue"
           SET status = 'RESOLVED', "resolvedAt" = NOW(), "resolvedBy" = 'claude-manual', resolution = $2
           WHERE "questionId" = $1 AND "ruleId" = ANY($3::text[]) AND status = 'OPEN'`,
          [fix.id, resolveNote, fix.resolveIssues]
        );
      }
      console.log(`OK   ${fix.id.slice(0,8)} updated cols=[${cols.join(",")}] resolved=${(fix.resolveIssues||[]).length}`);
    }
    applied++;
  } catch (e) {
    console.log(`ERR  ${fix.id?.slice(0,8) || "(no id)"}: ${e.message}`);
    errored++;
  }
}

console.log("");
console.log(`=== Done ===`);
console.log(`Applied: ${applied}`);
console.log(`Skipped: ${skipped}`);
console.log(`Errored: ${errored}`);

await c.end();
