-- Soft-end a mutual connection without deleting chat, calls, or consultant history.
ALTER TABLE "Connection" ADD COLUMN "endedAt" TIMESTAMP(3);
ALTER TABLE "Connection" ADD COLUMN "endedById" TEXT;

CREATE INDEX "Connection_endedAt_idx" ON "Connection"("endedAt");

ALTER TYPE "InterestStatus" ADD VALUE IF NOT EXISTS 'ended';
