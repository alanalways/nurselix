-- Phase 10: Hermes Agent Layer — LearnerProfile, SessionDiagnosis, HermesJob

CREATE TABLE IF NOT EXISTS "LearnerProfile" (
  "id"               TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"           TEXT        NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "domainMastery"    JSONB       NOT NULL DEFAULT '{}',
  "topWeaknesses"    TEXT[]      NOT NULL DEFAULT '{}',
  "behaviorPatterns" JSONB       NOT NULL DEFAULT '[]',
  "mistakeCounts"    JSONB       NOT NULL DEFAULT '{}',
  "confidenceBand"   TEXT        NOT NULL DEFAULT 'developing',
  "recentTrend"      TEXT        NOT NULL DEFAULT 'stable',
  "insightSummary"   TEXT,
  "thetaHistory"     FLOAT[]     NOT NULL DEFAULT '{}',
  "sessionsAnalysed" INTEGER     NOT NULL DEFAULT 0,
  "updatedAt"        TIMESTAMP   NOT NULL DEFAULT NOW(),
  "createdAt"        TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "SessionDiagnosis" (
  "id"           TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sessionId"    TEXT        NOT NULL UNIQUE REFERENCES "UserSession"("id") ON DELETE CASCADE,
  "userId"       TEXT        NOT NULL,
  "mistakeTypes" TEXT[]      NOT NULL DEFAULT '{}',
  "rootCauses"   TEXT,
  "keyInsight"   TEXT,
  "severity"     INTEGER     NOT NULL DEFAULT 3,
  "weakDomains"  TEXT[]      NOT NULL DEFAULT '{}',
  "analysed"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"    TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "SessionDiagnosis_userId_idx" ON "SessionDiagnosis"("userId");

CREATE TABLE IF NOT EXISTS "HermesJob" (
  "id"        TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT        NOT NULL,
  "sessionId" TEXT        NOT NULL,
  "status"    TEXT        NOT NULL DEFAULT 'pending',
  "attempts"  INTEGER     NOT NULL DEFAULT 0,
  "error"     TEXT,
  "createdAt" TIMESTAMP   NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "HermesJob_status_createdAt_idx" ON "HermesJob"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "HermesJob_userId_idx"            ON "HermesJob"("userId");

-- Phase 10b: nextActions + studyPlan on LearnerProfile
ALTER TABLE "LearnerProfile" ADD COLUMN IF NOT EXISTS "nextActions" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "LearnerProfile" ADD COLUMN IF NOT EXISTS "studyPlan"   JSONB NOT NULL DEFAULT '[]';

-- App-wide key/value settings (used for test account toggle etc.)
CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key"       TEXT        NOT NULL PRIMARY KEY,
  "value"     TEXT        NOT NULL,
  "updatedAt" TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- Phase 10c: Hermes Report History
CREATE TABLE IF NOT EXISTS "HermesReport" (
  "id"             TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"         TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "sessionId"      TEXT,
  "type"           TEXT        NOT NULL DEFAULT 'session',
  "insightSummary" TEXT,
  "nextActions"    JSONB       NOT NULL DEFAULT '[]',
  "studyPlan"      JSONB       NOT NULL DEFAULT '[]',
  "keyInsight"     TEXT,
  "rootCauses"     TEXT,
  "mistakeTypes"   TEXT[]      NOT NULL DEFAULT '{}',
  "weakDomains"    TEXT[]      NOT NULL DEFAULT '{}',
  "confidenceBand" TEXT,
  "recentTrend"    TEXT,
  "createdAt"      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "HermesReport_userId_createdAt_idx" ON "HermesReport"("userId", "createdAt" DESC);

-- Phase 10c: API Usage / Cost Tracking
CREATE TABLE IF NOT EXISTS "ApiUsageLog" (
  "id"               TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"           TEXT,
  "model"            TEXT        NOT NULL,
  "inputTokens"      INTEGER     NOT NULL,
  "outputTokens"     INTEGER     NOT NULL,
  "cacheReadTokens"  INTEGER     NOT NULL DEFAULT 0,
  "cacheWriteTokens" INTEGER     NOT NULL DEFAULT 0,
  "purpose"          TEXT        NOT NULL,
  "costUsd"          FLOAT       NOT NULL,
  "createdAt"        TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "ApiUsageLog_createdAt_idx" ON "ApiUsageLog"("createdAt");
CREATE INDEX IF NOT EXISTS "ApiUsageLog_userId_idx"    ON "ApiUsageLog"("userId");
