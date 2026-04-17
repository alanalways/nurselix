-- Phase 7: Payments — add subscriptionEndsAt to User, Order table + indexes

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMP;

CREATE TABLE IF NOT EXISTS "Order" (
  "id"         TEXT        NOT NULL PRIMARY KEY,
  "userId"     TEXT        NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "plan"       TEXT        NOT NULL,
  "billing"    TEXT        NOT NULL,
  "amount"     INTEGER     NOT NULL,
  "currency"   TEXT        NOT NULL DEFAULT 'TWD',
  "status"     TEXT        NOT NULL DEFAULT 'pending',
  "paymentRef" TEXT,
  "createdAt"  TIMESTAMP   NOT NULL DEFAULT NOW(),
  "paidAt"     TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Order_userId_idx"  ON "Order"("userId");
CREATE INDEX IF NOT EXISTS "Order_status_idx"  ON "Order"("status");
