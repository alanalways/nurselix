-- Phase 20: Hermes Tutor (in-app NCLEX AI teacher)
-- CTE-cosine fallback variant: Zeabur PG image (18.3) lacks pgvector,
-- so we store embeddings as JSONB (a 768-element float array) and
-- compute cosine similarity in pure SQL inside Task 4 RAG queries.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS "QuestionEmbedding" (
  "questionId" TEXT PRIMARY KEY,
  "embedding"  JSONB NOT NULL,
  "model"      TEXT NOT NULL DEFAULT 'text-embedding-004',
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  CONSTRAINT "QuestionEmbedding_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "QuestionEmbedding_updatedAt_idx"
  ON "QuestionEmbedding" ("updatedAt" DESC);

CREATE TABLE IF NOT EXISTS "ChatSession" (
  "id"            TEXT PRIMARY KEY,
  "userId"        TEXT NOT NULL,
  "startedAt"     TIMESTAMP(3) NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  CONSTRAINT "ChatSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ChatSession_userId_lastMessageAt_idx"
  ON "ChatSession" ("userId", "lastMessageAt" DESC);

CREATE TABLE IF NOT EXISTS "ChatTurn" (
  "id"          TEXT PRIMARY KEY,
  "sessionId"   TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "questionId"  TEXT,
  "role"        TEXT NOT NULL,
  "content"     TEXT NOT NULL,
  "citedUrls"   JSONB,
  "modelUsed"   TEXT,
  "latencyMs"   INTEGER,
  "rating"      INTEGER,
  "ratingNote"  TEXT,
  "ratedBy"     TEXT,
  "ratedAt"     TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC'),
  CONSTRAINT "ChatTurn_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ChatTurn_sessionId_createdAt_idx"
  ON "ChatTurn" ("sessionId", "createdAt" ASC);
CREATE INDEX IF NOT EXISTS "ChatTurn_userId_createdAt_idx"
  ON "ChatTurn" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ChatTurn_questionId_createdAt_idx"
  ON "ChatTurn" ("questionId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ChatTurn_rating_createdAt_idx"
  ON "ChatTurn" ("rating", "createdAt" DESC) WHERE "rating" IS NOT NULL;
