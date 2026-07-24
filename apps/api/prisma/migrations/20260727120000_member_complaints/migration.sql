-- CreateEnum
CREATE TYPE "MemberComplaintCategory" AS ENUM ('misrepresentation', 'harassment', 'fraud', 'inappropriate_behavior', 'other');

-- CreateEnum
CREATE TYPE "MemberComplaintStatus" AS ENUM ('submitted', 'assigned', 'in_progress', 'resolved', 'dismissed', 'cancelled');

-- CreateTable
CREATE TABLE "MemberComplaint" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetProfileId" TEXT NOT NULL,
    "category" "MemberComplaintCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "MemberComplaintStatus" NOT NULL DEFAULT 'submitted',
    "assignedConsultantId" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "MemberComplaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberComplaintMessage" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberComplaintMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberComplaintDiaryEntry" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberComplaintDiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberComplaint_reporterId_createdAt_idx" ON "MemberComplaint"("reporterId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "MemberComplaint_targetProfileId_idx" ON "MemberComplaint"("targetProfileId");

-- CreateIndex
CREATE INDEX "MemberComplaint_status_idx" ON "MemberComplaint"("status");

-- CreateIndex
CREATE INDEX "MemberComplaint_assignedConsultantId_idx" ON "MemberComplaint"("assignedConsultantId");

-- CreateIndex
CREATE INDEX "MemberComplaintMessage_complaintId_createdAt_idx" ON "MemberComplaintMessage"("complaintId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "MemberComplaintDiaryEntry_complaintId_createdAt_idx" ON "MemberComplaintDiaryEntry"("complaintId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "MemberComplaint" ADD CONSTRAINT "MemberComplaint_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberComplaint" ADD CONSTRAINT "MemberComplaint_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberComplaint" ADD CONSTRAINT "MemberComplaint_assignedConsultantId_fkey" FOREIGN KEY ("assignedConsultantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberComplaintMessage" ADD CONSTRAINT "MemberComplaintMessage_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "MemberComplaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberComplaintMessage" ADD CONSTRAINT "MemberComplaintMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberComplaintDiaryEntry" ADD CONSTRAINT "MemberComplaintDiaryEntry_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "MemberComplaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberComplaintDiaryEntry" ADD CONSTRAINT "MemberComplaintDiaryEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
