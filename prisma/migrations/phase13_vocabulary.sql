-- Phase 13: Vocabulary (NCLEX-RN) — word bank + SM-2 per-user progress + session history

CREATE TABLE IF NOT EXISTS "VocabularyWord" (
  "id"           TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "word"         TEXT        NOT NULL UNIQUE,
  "partOfSpeech" TEXT,
  "definitionEn" TEXT        NOT NULL,
  "definitionZh" TEXT        NOT NULL,
  "category"     TEXT        NOT NULL,
  "tier"         INTEGER     NOT NULL DEFAULT 1,
  "difficulty"   TEXT        NOT NULL DEFAULT 'MEDIUM',
  "exampleEn"    TEXT,
  "exampleZh"    TEXT,
  "synonyms"     TEXT[]      NOT NULL DEFAULT '{}',
  "memoryHook"   TEXT,
  "tags"         TEXT[]      NOT NULL DEFAULT '{}',
  "status"       TEXT        NOT NULL DEFAULT 'APPROVED',
  "createdBy"    TEXT        NOT NULL DEFAULT 'claude',
  "createdAt"    TIMESTAMP   NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "VocabularyWord_category_idx" ON "VocabularyWord"("category");
CREATE INDEX IF NOT EXISTS "VocabularyWord_tier_idx"     ON "VocabularyWord"("tier");
CREATE INDEX IF NOT EXISTS "VocabularyWord_status_idx"   ON "VocabularyWord"("status");

CREATE TABLE IF NOT EXISTS "UserVocabProgress" (
  "id"           TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"       TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "wordId"       TEXT        NOT NULL REFERENCES "VocabularyWord"("id") ON DELETE CASCADE,
  "repetition"   INTEGER     NOT NULL DEFAULT 0,
  "easiness"     FLOAT       NOT NULL DEFAULT 2.5,
  "interval"     INTEGER     NOT NULL DEFAULT 1,
  "nextReview"   TIMESTAMP   NOT NULL DEFAULT NOW(),
  "lastResult"   TEXT,
  "seenCount"    INTEGER     NOT NULL DEFAULT 0,
  "correctCount" INTEGER     NOT NULL DEFAULT 0,
  "mastered"     BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"    TIMESTAMP   NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE("userId", "wordId")
);

CREATE INDEX IF NOT EXISTS "UserVocabProgress_userId_nextReview_idx" ON "UserVocabProgress"("userId", "nextReview");
CREATE INDEX IF NOT EXISTS "UserVocabProgress_userId_mastered_idx"   ON "UserVocabProgress"("userId", "mastered");

CREATE TABLE IF NOT EXISTS "VocabSession" (
  "id"           TEXT        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"       TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "mode"         TEXT        NOT NULL,
  "tier"         INTEGER,
  "category"     TEXT,
  "wordIds"      TEXT[]      NOT NULL DEFAULT '{}',
  "totalWords"   INTEGER     NOT NULL DEFAULT 0,
  "correctCount" INTEGER     NOT NULL DEFAULT 0,
  "timeSpentSec" INTEGER     NOT NULL DEFAULT 0,
  "startedAt"    TIMESTAMP   NOT NULL DEFAULT NOW(),
  "endedAt"      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "VocabSession_userId_startedAt_idx" ON "VocabSession"("userId", "startedAt" DESC);
