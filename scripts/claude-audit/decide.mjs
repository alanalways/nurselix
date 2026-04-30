#!/usr/bin/env node
/**
 * Commit a single audit decision.
 *
 * Usage (decision JSON over stdin):
 *   echo '{"sessionId":"...","questionId":"...","type":"EDITED",
 *          "changes":{"explanationZh":"..."},
 *          "reasoning":"...","confidence":92}' \
 *     | node scripts/claude-audit/decide.mjs
 *
 * Decision types:
 *   UNCHANGED          — question already good, nothing written
 *   EDITED             — apply changes (whitelist of fields enforced)
 *   FLAGGED_FOR_REVIEW — sets Question.status='DRAFT' + records reason;
 *                        admin reviews via Repairs/Audit tab
 */
import { makeClient, commitDecision } from "./common.mjs";

let raw = "";
for await (const chunk of process.stdin) raw += chunk;
let dec;
try {
  dec = JSON.parse(raw);
} catch (e) {
  console.error("decide.mjs: stdin must be JSON");
  process.exit(2);
}
if (!dec.sessionId || !dec.questionId || !dec.type) {
  console.error("decide.mjs: missing sessionId/questionId/type");
  process.exit(2);
}

const c = await makeClient();
try {
  const id = await commitDecision(c, dec.sessionId, dec);
  process.stdout.write(JSON.stringify({ ok: true, decisionId: id }) + "\n");
} catch (e) {
  process.stderr.write(`decide.mjs ERROR: ${e.message}\n`);
  process.exit(1);
} finally {
  await c.end();
}
