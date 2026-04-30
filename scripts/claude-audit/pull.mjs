#!/usr/bin/env node
/**
 * Pull the next N unaudited NCLEX questions for Claude to review.
 *
 * Usage:
 *   node scripts/claude-audit/pull.mjs [limit]
 *
 * Output: JSON array printed to stdout. Always finds (or creates) the
 * single ACTIVE ClaudeAuditSession.
 */
import { makeClient, getOrCreateActiveSession, pullNextBatch } from "./common.mjs";

const limit = Math.max(1, Math.min(20, parseInt(process.argv[2] || "5", 10)));
const c = await makeClient();
try {
  const session = await getOrCreateActiveSession(c);
  const batch = await pullNextBatch(c, session.id, limit);
  const out = {
    sessionId: session.id,
    sessionLabel: session.label,
    targetTotal: session.targetTotal,
    processedCount: session.processedCount,
    questions: batch,
  };
  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
} finally {
  await c.end();
}
