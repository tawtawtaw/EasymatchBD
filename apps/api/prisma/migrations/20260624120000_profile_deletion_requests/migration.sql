-- CreateEnum
CREATE TYPE "ProfileDeletionRequestStatus" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

-- CreateEnum
CREATE TYPE "ProfileDeletionTargetKind" AS ENUM ('member', 'staff');

-- CreateTable
CREATE TABLE "ProfileDeletionRequest" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetKind" "ProfileDeletionTargetKind" NOT NULL,
    "profileId" TEXT,
    "reason" TEXT,
    "status" "ProfileDeletionRequestStatus" NOT NULL DEFAULT 'pending',
    "requestedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ProfileDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileDeletionRequest_status_requestedAt_idx" ON "ProfileDeletionRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "ProfileDeletionRequest_targetUserId_idx" ON "ProfileDeletionRequest"("targetUserId");

-- CreateIndex
CREATE INDEX "ProfileDeletionRequest_requestedById_idx" ON "ProfileDeletionRequest"("requestedById");

-- AddForeignKey
ALTER TABLE "ProfileDeletionRequest" ADD CONSTRAINT "ProfileDeletionRequest_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileDeletionRequest" ADD CONSTRAINT "ProfileDeletionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileDeletionRequest" ADD CONSTRAINT "ProfileDeletionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
