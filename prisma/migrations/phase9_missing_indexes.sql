-- Phase 9: Add missing indexes on QuestionReport, Feedback, BetaSubscriber

CREATE INDEX IF NOT EXISTS "QuestionReport_userId_idx" ON "QuestionReport"("userId");
CREATE INDEX IF NOT EXISTS "QuestionReport_status_idx" ON "QuestionReport"("status");

CREATE INDEX IF NOT EXISTS "Feedback_userId_idx"       ON "Feedback"("userId");

CREATE INDEX IF NOT EXISTS "BetaSubscriber_userId_idx" ON "BetaSubscriber"("userId");
