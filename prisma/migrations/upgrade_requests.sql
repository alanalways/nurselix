-- Upgrade request table for manual payment flow (admin sends bank info via DM)

CREATE TABLE IF NOT EXISTS "UpgradeRequest" (
  "id"        TEXT      NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    TEXT      NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "plan"      TEXT      NOT NULL,
  "billing"   TEXT      NOT NULL,
  "status"    TEXT      NOT NULL DEFAULT 'pending',
  "note"      TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "UpgradeRequest_status_idx" ON "UpgradeRequest"("status");
CREATE INDEX IF NOT EXISTS "UpgradeRequest_userId_idx" ON "UpgradeRequest"("userId");
