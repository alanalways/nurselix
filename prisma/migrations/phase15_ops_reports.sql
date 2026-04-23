-- Ops Agent Reports table
CREATE TABLE "OpsReport" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "period"      TEXT NOT NULL,
  "periodType"  TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'pending',
  "model"       TEXT NOT NULL,
  "ctoReport"   JSONB,
  "pmReport"    JSONB,
  "opsReport"   JSONB,
  "summaryZh"   TEXT,
  "durationMs"  INTEGER NOT NULL DEFAULT 0,
  "error"       TEXT,
  "triggeredBy" TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id")
);

CREATE INDEX "OpsReport_periodType_createdAt_idx"
  ON "OpsReport" ("periodType", "createdAt" DESC);
