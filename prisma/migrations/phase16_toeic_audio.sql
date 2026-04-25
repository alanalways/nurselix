-- Phase 16: TOEIC listening / TTS audio assets

-- Add audio fields to Question
ALTER TABLE "Question"
  ADD COLUMN IF NOT EXISTS "audioScript" TEXT,
  ADD COLUMN IF NOT EXISTS "audioDurationSec" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "hasAudio" BOOLEAN NOT NULL DEFAULT FALSE;

-- AudioAsset table: stores binary WAV bytes related to a Question
CREATE TABLE IF NOT EXISTS "AudioAsset" (
  "id"          TEXT PRIMARY KEY,
  "questionId"  TEXT NOT NULL,
  "data"        BYTEA NOT NULL,
  "mimeType"    TEXT NOT NULL DEFAULT 'audio/wav',
  "durationSec" DOUBLE PRECISION,
  "sampleRate"  INTEGER NOT NULL DEFAULT 24000,
  "voicesUsed"  TEXT[] NOT NULL DEFAULT '{}',
  "scriptHash"  TEXT,
  "modelUsed"   TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AudioAsset_questionId_fkey" FOREIGN KEY ("questionId")
    REFERENCES "Question"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "AudioAsset_questionId_idx" ON "AudioAsset" ("questionId");
