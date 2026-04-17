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

-- App-wide key/value settings (used for test account toggle etc.)
CREATE TABLE IF NOT EXISTS "AppSetting" (
  "key"       TEXT        NOT NULL PRIMARY KEY,
  "value"     TEXT        NOT NULL,
  "updatedAt" TIMESTAMP   NOT NULL DEFAULT NOW()
);
