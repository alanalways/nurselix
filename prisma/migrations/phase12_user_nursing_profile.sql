-- Phase 12: Collect nursing profile at registration (specialty / status / experience)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nursingStatus"     TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "specialty"         TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "yearsOfExperience" INTEGER;
