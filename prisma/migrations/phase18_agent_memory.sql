-- Phase 18: agent self-learning memory + admin evaluation
-- Idempotent: safe to re-run. Driven by /api/admin/migrate which loops
-- over every .sql in this folder.

CREATE TABLE IF NOT EXISTS "AgentMemory" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agentType"      TEXT NOT NULL,
  "taskKey"        TEXT,
  "inputSummary"   TEXT NOT NULL,
  "outputSummary"  TEXT NOT NULL,
  "rawOutput"      JSONB,
  "modelUsed"      TEXT,
  "durationMs"     INTEGER NOT NULL DEFAULT 0,
  "ok"             BOOLEAN NOT NULL DEFAULT TRUE,
  "error"          TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

CREATE INDEX IF NOT EXISTS "AgentMemory_agentType_createdAt_idx"
  ON "AgentMemory" ("agentType", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AgentMemory_taskKey_idx"
  ON "AgentMemory" ("taskKey");

CREATE TABLE IF NOT EXISTS "AgentEvaluation" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "memoryId"    TEXT NOT NULL,
  "rating"      INTEGER NOT NULL,
  "note"        TEXT,
  "ratedBy"     TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  CONSTRAINT "AgentEvaluation_memoryId_fkey"
    FOREIGN KEY ("memoryId") REFERENCES "AgentMemory"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AgentEvaluation_memoryId_idx"
  ON "AgentEvaluation" ("memoryId");

CREATE INDEX IF NOT EXISTS "AgentEvaluation_rating_createdAt_idx"
  ON "AgentEvaluation" ("rating", "createdAt" DESC);
