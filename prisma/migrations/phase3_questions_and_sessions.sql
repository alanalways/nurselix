-- Phase 3 schema migration
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS everywhere.

-- ===== Question: new columns =====
ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "stemZh"              TEXT,
  ADD COLUMN IF NOT EXISTS "scenarioEn"          TEXT,
  ADD COLUMN IF NOT EXISTS "scenarioZh"          TEXT,
  ADD COLUMN IF NOT EXISTS "optionE"             TEXT,
  ADD COLUMN IF NOT EXISTS "optionF"             TEXT,
  ADD COLUMN IF NOT EXISTS "correctAnswers"      TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "optionRationales"    JSONB,
  ADD COLUMN IF NOT EXISTS "cjmmStep"            TEXT,
  ADD COLUMN IF NOT EXISTS "bloomsLevel"         TEXT,
  ADD COLUMN IF NOT EXISTS "caseStudySetId"      TEXT,
  ADD COLUMN IF NOT EXISTS "caseStudyPosition"   INTEGER;

CREATE INDEX IF NOT EXISTS "Question_module_status_idx"  ON "Question" ("module", "status");
CREATE INDEX IF NOT EXISTS "Question_domain_idx"         ON "Question" ("domain");
CREATE INDEX IF NOT EXISTS "Question_difficulty_idx"     ON "Question" ("difficulty");
CREATE INDEX IF NOT EXISTS "Question_case_study_set_idx" ON "Question" ("caseStudySetId");

-- ===== UserSession: new columns =====
ALTER TABLE "UserSession"
  ADD COLUMN IF NOT EXISTS "targetCount"      INTEGER,
  ADD COLUMN IF NOT EXISTS "timeLimitSec"     INTEGER,
  ADD COLUMN IF NOT EXISTS "domainFilter"     TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "difficultyFilter" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "stopReason"       TEXT;

CREATE INDEX IF NOT EXISTS "UserSession_user_mode_idx"    ON "UserSession" ("userId", "mode");
CREATE INDEX IF NOT EXISTS "UserSession_user_ended_idx"   ON "UserSession" ("userId", "endedAt");

-- ===== UserAnswer: new columns =====
ALTER TABLE "UserAnswer"
  ADD COLUMN IF NOT EXISTS "seAfter" DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS "UserAnswer_session_answered_idx" ON "UserAnswer" ("sessionId", "answeredAt");
CREATE INDEX IF NOT EXISTS "UserAnswer_user_answered_idx"    ON "UserAnswer" ("userId", "answeredAt");

-- ===== DailyChallengeAttempt: new table =====
CREATE TABLE IF NOT EXISTS "DailyChallengeAttempt" (
  "id"             TEXT NOT NULL,
  "challengeId"    TEXT NOT NULL,
  "userId"         TEXT NOT NULL,
  "selectedAnswer" TEXT NOT NULL,
  "isCorrect"      BOOLEAN NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyChallengeAttempt_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DailyChallengeAttempt_challengeId_fkey'
  ) THEN
    ALTER TABLE "DailyChallengeAttempt"
      ADD CONSTRAINT "DailyChallengeAttempt_challengeId_fkey"
      FOREIGN KEY ("challengeId")
      REFERENCES "DailyChallenge"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "DailyChallengeAttempt_challenge_user_key"
  ON "DailyChallengeAttempt" ("challengeId", "userId");
CREATE INDEX IF NOT EXISTS "DailyChallengeAttempt_user_idx"
  ON "DailyChallengeAttempt" ("userId");
