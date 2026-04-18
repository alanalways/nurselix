-- Phase 11: AI Question Generation background jobs

CREATE TABLE IF NOT EXISTS "GenerationJob" (
  "id"          TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "status"      TEXT        NOT NULL,
  "target"      INTEGER     NOT NULL,
  "model"       TEXT        NOT NULL,
  "domain"      TEXT        NOT NULL,
  "batchCount"  INTEGER     NOT NULL DEFAULT 0,
  "inserted"    INTEGER     NOT NULL DEFAULT 0,
  "rejected"    INTEGER     NOT NULL DEFAULT 0,
  "duplicates"  INTEGER     NOT NULL DEFAULT 0,
  "errors"      INTEGER     NOT NULL DEFAULT 0,
  "lastMessage" TEXT,
  "createdBy"   TEXT,
  "startedAt"   TIMESTAMP   NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "GenerationJob_status_startedAt_idx"
  ON "GenerationJob" ("status", "startedAt" DESC);
