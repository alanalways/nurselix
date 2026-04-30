# Claude manual NCLEX audit — Operator playbook

This directory contains the helpers Claude uses when auditing the bank
by hand (no NIM, no Claude API — Claude Code session reads + decides).

## Workflow per batch

1. `node scripts/claude-audit/pull.mjs 5`
   → prints { sessionId, questions: [...] } for the next 5 unaudited
     NCLEX questions, in id order.

2. Claude reads each question, may use:
   - sub-agents to cross-check NCLEX correctness via web search
   - direct DB queries (errorRate, attemptCount) to spot statistical outliers
   - the doctrine doc (`docs/nurslix-doctrine.md`) for editorial rules

3. For each question, Claude pipes a decision JSON into decide.mjs:

   ```bash
   echo '{
     "sessionId": "<from pull.mjs>",
     "questionId": "<id>",
     "type": "EDITED" | "UNCHANGED" | "FLAGGED_FOR_REVIEW",
     "changes": { "explanationZh": "...", "optionRationales": {...} },
     "reasoning": "≤500 chars why",
     "confidence": 0-100
   }' | node scripts/claude-audit/decide.mjs
   ```

4. Re-pull and continue until session.processedCount == targetTotal.

## Decision-type guardrails

- **UNCHANGED** — question already meets quality bar. No write to Question.
  Still records a row in ClaudeAuditDecision so we don't re-review.
- **EDITED** — direct write to Question. Whitelisted fields only:
    stem, stemZh, optionA-F, explanationZh, explanationEn, optionRationales
  Always logs a QuestionVersion + ClaudeAuditDecision (with before/after
  snapshots for rollback).
- **FLAGGED_FOR_REVIEW** — sets Question.status='DRAFT' so it disappears
  from live practice. Used when:
    a) suspect correctAnswer needs human call
    b) the question is unsalvageable and admin should decide archive vs rewrite

  We NEVER edit correctAnswer / correctAnswers directly. Rationale: a
  wrong answer guess pushed straight into production hurts every user
  practising. FLAG instead, admin decides.

## Recover / abort

- `POST /api/admin/audit-sessions/<id>/rollback` reverts every EDITED row
  in a session. Idempotent.
- DB schema in `prisma/migrations/phase19_claude_audit.sql`.
