-- Critical fixes from question quality scan (2026-04-27)
-- Run with: psql "$DATABASE_URL" -f scripts/fix-critical-questions.sql

\echo '=== Before ==='
SELECT id, status, "correctAnswer", "correctAnswers"
FROM "Question"
WHERE id IN (
  '035f3b6c-035d-48b9-ba96-bf9f2f1bc29a',
  '156a1f8c-40fa-4922-966a-fc75c95dd520'
);

BEGIN;

-- ── Q-R1: archive the adverb-polluted/garbled question ─────────────────────
-- 035f3b6c — "大量傷患早期出院" — 4 reports, 22% correct rate, irreparable noise
UPDATE "Question"
SET status = 'ARCHIVED',
    "updatedAt" = NOW()
WHERE id = '035f3b6c-035d-48b9-ba96-bf9f2f1bc29a';

-- Resolve all related reports
UPDATE "QuestionReport"
SET status = 'resolved',
    "updatedAt" = NOW()
WHERE "questionId" = '035f3b6c-035d-48b9-ba96-bf9f2f1bc29a'
  AND status IN ('pending', 'reviewed');

-- ── Q-R2: fix wrong correctAnswer (A → B, implied consent doctrine) ────────
-- 156a1f8c — explanation supports B but DB had A; users correctly reported "答案有誤"
UPDATE "Question"
SET "correctAnswer"  = 'B',
    "correctAnswers" = ARRAY['B'],
    "updatedAt"      = NOW()
WHERE id = '156a1f8c-40fa-4922-966a-fc75c95dd520';

-- Resolve related reports (the user was right; mark as resolved with credit)
UPDATE "QuestionReport"
SET status = 'resolved',
    "updatedAt" = NOW()
WHERE "questionId" = '156a1f8c-40fa-4922-966a-fc75c95dd520'
  AND status IN ('pending', 'reviewed');

\echo '=== After ==='
SELECT id, status, "correctAnswer", "correctAnswers"
FROM "Question"
WHERE id IN (
  '035f3b6c-035d-48b9-ba96-bf9f2f1bc29a',
  '156a1f8c-40fa-4922-966a-fc75c95dd520'
);

\echo '=== Reports cleared ==='
SELECT "questionId", status, COUNT(*) AS cnt
FROM "QuestionReport"
WHERE "questionId" IN (
  '035f3b6c-035d-48b9-ba96-bf9f2f1bc29a',
  '156a1f8c-40fa-4922-966a-fc75c95dd520'
)
GROUP BY "questionId", status;

-- Uncomment to commit:
-- COMMIT;
ROLLBACK;  -- safe default; review the output then change to COMMIT and rerun
