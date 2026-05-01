-- Phase 19: Claude manual question audit (replaces NIM auto-audit while running)
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "ClaudeAuditSession" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "label"           TEXT NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'ACTIVE',
  "targetTotal"     INTEGER NOT NULL DEFAULT 0,
  "processedCount"  INTEGER NOT NULL DEFAULT 0,
  "changedCount"    INTEGER NOT NULL DEFAULT 0,
  "unchangedCount"  INTEGER NOT NULL DEFAULT 0,
  "flaggedCount"    INTEGER NOT NULL DEFAULT 0,
  "startedAt"       TIMESTAMP(3) NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  "finishedAt"      TIMESTAMP(3),
  "notes"           TEXT
);

CREATE INDEX IF NOT EXISTS "ClaudeAuditSession_status_startedAt_idx"
  ON "ClaudeAuditSession" ("status", "startedAt" DESC);

CREATE TABLE IF NOT EXISTS "ClaudeAuditDecision" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sessionId"       TEXT NOT NULL,
  "questionId"      TEXT NOT NULL,
  "decision"        TEXT NOT NULL,
  "changeSummary"   JSONB,
  "beforeSnapshot"  JSONB,
  "afterSnapshot"   JSONB,
  "reasoning"       TEXT,
  "confidence"      INTEGER NOT NULL DEFAULT 0,
  "rolledBack"      BOOLEAN NOT NULL DEFAULT FALSE,
  "rolledBackAt"    TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  CONSTRAINT "ClaudeAuditDecision_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ClaudeAuditSession"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ClaudeAuditDecision_sessionId_createdAt_idx"
  ON "ClaudeAuditDecision" ("sessionId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ClaudeAuditDecision_questionId_idx"
  ON "ClaudeAuditDecision" ("questionId");

CREATE INDEX IF NOT EXISTS "ClaudeAuditDecision_decision_idx"
  ON "ClaudeAuditDecision" ("decision");

-- Unique constraint added 2026-05-01 after a sub-agent accidentally
-- ran batch-commit twice and produced 3x duplicates. With this in place
-- a re-run errors at insert time instead of corrupting counters.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ClaudeAuditDecision_session_question_unique'
  ) THEN
    ALTER TABLE "ClaudeAuditDecision"
      ADD CONSTRAINT "ClaudeAuditDecision_session_question_unique"
      UNIQUE ("sessionId", "questionId");
  END IF;
END $$;
