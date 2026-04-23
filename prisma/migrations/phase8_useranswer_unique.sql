-- Phase 14: Add unique constraint on UserAnswer(sessionId, questionId)
-- Prevents duplicate answer submissions for the same question within a session.

-- Remove any pre-existing duplicates, keeping the earliest answer per (session, question).
DELETE FROM "UserAnswer"
WHERE id NOT IN (
  SELECT DISTINCT ON ("sessionId", "questionId") id
  FROM "UserAnswer"
  ORDER BY "sessionId", "questionId", "answeredAt" ASC
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAnswer_sessionId_questionId_key"
  ON "UserAnswer"("sessionId", "questionId");
