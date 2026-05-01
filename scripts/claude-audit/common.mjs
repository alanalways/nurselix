/**
 * Shared helpers for Claude's manual NCLEX question audit.
 *
 * These scripts are invoked by Claude during the audit loop. They wrap
 * Postgres + the new ClaudeAuditSession / ClaudeAuditDecision tables.
 *
 * Conventions:
 *   - All timestamps written as `(NOW() AT TIME ZONE 'UTC')` to stay UTC.
 *   - Allowed-to-edit Question fields whitelist enforced here so a buggy
 *     decide.mjs can't accidentally write to forbidden columns.
 *   - We NEVER touch correctAnswer / correctAnswers in EDITED decisions.
 *     If Claude thinks the answer is wrong, the decision must be
 *     FLAGGED_FOR_REVIEW (and the question goes to status='DRAFT').
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import pg from "pg";

export const ALLOWED_EDIT_FIELDS = new Set([
  "stem", "stemZh",
  "optionA", "optionB", "optionC", "optionD", "optionE", "optionF",
  "explanationZh", "explanationEn",
  "optionRationales",
]);
// fields we may set ONLY via FLAGGED_FOR_REVIEW path:
export const FLAG_ONLY_FIELDS = new Set(["status", "correctAnswer", "correctAnswers"]);

export function loadDatabaseUrl() {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL=(.*)$/);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  throw new Error("DATABASE_URL not found in .env.local");
}

export async function makeClient() {
  const c = new pg.Client({ connectionString: loadDatabaseUrl() });
  await c.connect();
  return c;
}

/** Get or create the ACTIVE Claude audit session. */
export async function getOrCreateActiveSession(client, opts = {}) {
  const label = opts.label || `manual-${new Date().toISOString().slice(0, 10)}`;

  const existing = await client.query(
    `SELECT * FROM "ClaudeAuditSession" WHERE status='ACTIVE' ORDER BY "startedAt" DESC LIMIT 1`
  );
  if (existing.rows.length > 0) return existing.rows[0];

  // Count NCLEX universe so we know our denominator
  const total = await client.query(
    `SELECT COUNT(*)::int AS n FROM "Question" WHERE module='NCLEX'`
  );
  const targetTotal = total.rows[0].n;

  const created = await client.query(
    `INSERT INTO "ClaudeAuditSession" (id, label, status, "targetTotal", notes)
     VALUES ($1, $2, 'ACTIVE', $3, $4)
     RETURNING *`,
    [randomUUID(), label, targetTotal, opts.notes || null]
  );
  return created.rows[0];
}

/** Pull the next batch of unaudited NCLEX questions. */
export async function pullNextBatch(client, sessionId, limit = 5) {
  // Skip questions already decided in this session
  const rows = await client.query(
    `SELECT q.id, q.module, q."questionType", q.difficulty, q.status, q.domain,
            q.stem, q."stemZh", q."optionA", q."optionB", q."optionC",
            q."optionD", q."optionE", q."optionF",
            q."correctAnswer", q."correctAnswers",
            q."explanationZh", q."explanationEn", q."optionRationales",
            q."attemptCount", q."correctCount", q."errorRate"
     FROM "Question" q
     WHERE q.module='NCLEX'
       AND NOT EXISTS (
         SELECT 1 FROM "ClaudeAuditDecision" d
         WHERE d."sessionId" = $1 AND d."questionId" = q.id
       )
     ORDER BY q.id ASC
     LIMIT $2`,
    [sessionId, limit]
  );
  return rows.rows;
}

/** Apply one decision atomically. */
export async function commitDecision(client, sessionId, decision) {
  const {
    questionId,
    type,            // "UNCHANGED" | "EDITED" | "FLAGGED_FOR_REVIEW"
    changes,         // { fieldName: newValue, ... } — required for EDITED
    reasoning,
    confidence,
    flagReason,      // free-form text used in QuestionVersion when FLAGGED
  } = decision;

  if (!["UNCHANGED", "EDITED", "FLAGGED_FOR_REVIEW"].includes(type)) {
    throw new Error(`bad decision type: ${type}`);
  }

  // Idempotency: if this (session, question) already has a decision, refuse.
  // The DB also enforces this via UNIQUE (sessionId, questionId) but checking
  // here gives a clean "ALREADY_DECIDED" error instead of a constraint
  // violation that aborts the surrounding transaction.
  const existing = await client.query(
    `SELECT id FROM "ClaudeAuditDecision" WHERE "sessionId" = $1 AND "questionId" = $2`,
    [sessionId, questionId]
  );
  if (existing.rows.length > 0) {
    const err = new Error(`ALREADY_DECIDED: question ${questionId} already has decision ${existing.rows[0].id} in this session`);
    err.code = "ALREADY_DECIDED";
    throw err;
  }

  // Pull current question so we can build before/after snapshots
  const cur = await client.query(`SELECT * FROM "Question" WHERE id = $1`, [questionId]);
  if (cur.rows.length === 0) throw new Error(`question ${questionId} not found`);
  const before = cur.rows[0];

  const updates = {};
  if (type === "EDITED") {
    if (!changes || Object.keys(changes).length === 0) throw new Error("EDITED requires changes");
    for (const [k, v] of Object.entries(changes)) {
      if (!ALLOWED_EDIT_FIELDS.has(k)) throw new Error(`field '${k}' not in ALLOWED_EDIT_FIELDS (use FLAGGED_FOR_REVIEW for ${k})`);
      updates[k] = v;
    }
  } else if (type === "FLAGGED_FOR_REVIEW") {
    // Move question to DRAFT so it disappears from live practice while
    // admin reviews. Don't touch correctAnswer here — admin decides.
    updates.status = "DRAFT";
  }

  await client.query("BEGIN");
  try {
    let after = before;

    if (Object.keys(updates).length > 0) {
      const setSql = Object.keys(updates).map((k, i) => `"${k}" = $${i + 2}`).join(", ");
      const vals = Object.values(updates);
      const r = await client.query(
        `UPDATE "Question" SET ${setSql} WHERE id = $1 RETURNING *`,
        [questionId, ...vals]
      );
      after = r.rows[0];

      // Audit trail in QuestionVersion
      await client.query(
        `INSERT INTO "QuestionVersion" (id, "questionId", snapshot, "changedBy", reason, "agentInitiated", "createdAt")
         VALUES ($1, $2, $3::jsonb, 'claude-direct-audit', $4, false, (NOW() AT TIME ZONE 'UTC'))`,
        [
          randomUUID(),
          questionId,
          JSON.stringify({
            sessionId,
            decisionType: type,
            updates,
            confidence,
            flagReason: flagReason || null,
          }),
          reasoning?.slice(0, 500) || null,
        ]
      );
    }

    // Decision row (also for UNCHANGED so we know it was reviewed).
    // NOTE: Postgres `gen_random_uuid()` needs the pgcrypto extension which
    // isn't always installed; passing the UUID from Node side avoids that.
    const decisionId = randomUUID();
    const decRow = await client.query(
      `INSERT INTO "ClaudeAuditDecision"
         (id, "sessionId", "questionId", decision, "changeSummary", "beforeSnapshot",
          "afterSnapshot", reasoning, confidence, "createdAt")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, (NOW() AT TIME ZONE 'UTC'))
       RETURNING id`,
      [
        decisionId,
        sessionId,
        questionId,
        type,
        Object.keys(updates).length > 0 ? JSON.stringify(updates) : null,
        type === "UNCHANGED" ? null : JSON.stringify(before),
        type === "UNCHANGED" ? null : JSON.stringify(after),
        reasoning?.slice(0, 500) || null,
        Math.max(0, Math.min(100, Number(confidence) || 0)),
      ]
    );

    // Bump session counters
    const counterField =
      type === "EDITED" ? "changedCount"
      : type === "FLAGGED_FOR_REVIEW" ? "flaggedCount"
      : "unchangedCount";
    await client.query(
      `UPDATE "ClaudeAuditSession"
       SET "processedCount" = "processedCount" + 1,
           "${counterField}" = "${counterField}" + 1
       WHERE id = $1`,
      [sessionId]
    );

    await client.query("COMMIT");
    return decRow.rows[0].id;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

/** Print pretty progress block — used by claude-audit-progress.mjs and orchestrator. */
export async function printProgress(client, sessionId) {
  const s = await client.query(`SELECT * FROM "ClaudeAuditSession" WHERE id = $1`, [sessionId]);
  if (s.rows.length === 0) {
    console.log(`(no session ${sessionId})`);
    return;
  }
  const row = s.rows[0];
  const remaining = row.targetTotal - row.processedCount;
  const pct = row.targetTotal ? ((row.processedCount / row.targetTotal) * 100).toFixed(2) : "0";
  console.log("\n=== Claude Audit Progress ===");
  console.log(`Session:    ${row.label} (${row.id.slice(0, 8)})`);
  console.log(`Status:     ${row.status}`);
  console.log(`Total:      ${row.targetTotal}`);
  console.log(`Processed:  ${row.processedCount}  (${pct}%)`);
  console.log(`  edited:   ${row.changedCount}`);
  console.log(`  unchanged:${row.unchangedCount}`);
  console.log(`  flagged:  ${row.flaggedCount}`);
  console.log(`Remaining:  ${remaining}`);
  console.log(`Started:    ${row.startedAt.toISOString()}`);
  console.log("=============================\n");
}
