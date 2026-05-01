#!/usr/bin/env node
/**
 * Pull a specific OFFSET..LIMIT slice of unaudited NCLEX questions.
 * Used when 3 sub-agents work in parallel and we don't want them
 * stepping on each other.
 *
 * Usage:
 *   node scripts/claude-audit/pull-range.mjs <offset> <limit>
 */
import { makeClient, getOrCreateActiveSession } from "./common.mjs";

const offset = Math.max(0, parseInt(process.argv[2] || "0", 10));
const limit = Math.max(1, Math.min(150, parseInt(process.argv[3] || "80", 10)));

const c = await makeClient();
try {
  const s = await getOrCreateActiveSession(c);
  const r = await c.query(
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
     OFFSET $2 LIMIT $3`,
    [s.id, offset, limit]
  );
  process.stdout.write(JSON.stringify({
    sessionId: s.id,
    offset,
    limit,
    count: r.rows.length,
    questions: r.rows,
  }, null, 2));
} finally {
  await c.end();
}
