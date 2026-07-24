-- CreateEnum
CREATE TYPE "VerificationAlertType" AS ENUM (
  'biodata_approved',
  'biodata_rejected',
  'nid_approved',
  'nid_rejected',
  'photo_approved_primary',
  'photo_approved_gallery',
  'photo_rejected_primary',
  'photo_rejected_gallery',
  'profile_fully_verified'
);

-- CreateTable
CREATE TABLE "VerificationAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertType" "VerificationAlertType" NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationAlert_userId_readAt_idx" ON "VerificationAlert"("userId", "readAt");

-- CreateIndex
CREATE INDEX "VerificationAlert_userId_createdAt_idx" ON "VerificationAlert"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "VerificationAlert" ADD CONSTRAINT "VerificationAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
