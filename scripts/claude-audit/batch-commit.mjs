#!/usr/bin/env node
/**
 * Batch-commit a JSON array of audit decisions in one go.
 * Reads JSON array from stdin, calls commitDecision once per item.
 *
 * Each item:
 *   { questionId, type, changes?, reasoning, confidence, flagReason? }
 *
 * sessionId is auto-detected (the active session).
 */
import { makeClient, getOrCreateActiveSession, commitDecision } from "./common.mjs";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let arr;
try { arr = JSON.parse(raw); } catch { console.error("batch-commit.mjs: stdin must be JSON array"); process.exit(2); }
if (!Array.isArray(arr)) { console.error("batch-commit.mjs: must be array"); process.exit(2); }

const c = await makeClient();
try {
  const session = await getOrCreateActiveSession(c);
  const results = [];
  for (const dec of arr) {
    try {
      const id = await commitDecision(c, session.id, dec);
      results.push({ questionId: dec.questionId, ok: true, decisionId: id });
    } catch (e) {
      results.push({ questionId: dec.questionId, ok: false, error: e.message.slice(0, 200) });
    }
  }
  process.stdout.write(JSON.stringify({ ok: true, sessionId: session.id, results }, null, 2) + "\n");
} finally {
  await c.end();
}
