-- CreateEnum
CREATE TYPE "TermsAuditAction" AS ENUM ('published', 'scheduled', 'schedule_cancelled');

-- AlterTable
ALTER TABLE "TermsSettings" ADD COLUMN "scheduledPublishAt" TIMESTAMP(3),
ADD COLUMN "scheduledByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "TermsSettings" ADD CONSTRAINT "TermsSettings_scheduledByUserId_fkey" FOREIGN KEY ("scheduledByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "TermsAuditLog" (
    "id" TEXT NOT NULL,
    "action" "TermsAuditAction" NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveDateEn" TEXT,
    "effectiveDateBn" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "performedById" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TermsAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TermsAuditLog_performedAt_idx" ON "TermsAuditLog"("performedAt" DESC);

-- AddForeignKey
ALTER TABLE "TermsAuditLog" ADD CONSTRAINT "TermsAuditLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
