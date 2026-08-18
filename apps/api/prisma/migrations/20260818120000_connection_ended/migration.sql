-- Soft-end a mutual connection without deleting chat, calls, or consultant history.
-- IF NOT EXISTS keeps this safe if runtime schema-ensure already added the columns.
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3);
ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "endedById" TEXT;

CREATE INDEX IF NOT EXISTS "Connection_endedAt_idx" ON "Connection"("endedAt");

ALTER TYPE "InterestStatus" ADD VALUE IF NOT EXISTS 'ended';
