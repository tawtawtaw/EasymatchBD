-- CreateEnum
CREATE TYPE "ConsultantMeetingStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

-- AlterTable
ALTER TABLE "VideoCall" ADD COLUMN "consultantEngagementId" TEXT;

-- CreateTable
CREATE TABLE "ConsultantMeeting" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "agenda" TEXT,
    "videoCallId" TEXT,
    "createdById" TEXT NOT NULL,
    "status" "ConsultantMeetingStatus" NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantCaseMessage" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultantCaseMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantCaseDiaryEntry" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantCaseDiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoCall_consultantEngagementId_key" ON "VideoCall"("consultantEngagementId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantMeeting_videoCallId_key" ON "ConsultantMeeting"("videoCallId");

-- CreateIndex
CREATE INDEX "ConsultantMeeting_engagementId_scheduledAt_idx" ON "ConsultantMeeting"("engagementId", "scheduledAt" DESC);

-- CreateIndex
CREATE INDEX "ConsultantMeeting_status_idx" ON "ConsultantMeeting"("status");

-- CreateIndex
CREATE INDEX "ConsultantCaseMessage_engagementId_createdAt_idx" ON "ConsultantCaseMessage"("engagementId", "createdAt" ASC);

-- CreateIndex
CREATE INDEX "ConsultantCaseDiaryEntry_engagementId_createdAt_idx" ON "ConsultantCaseDiaryEntry"("engagementId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "VideoCall" ADD CONSTRAINT "VideoCall_consultantEngagementId_fkey" FOREIGN KEY ("consultantEngagementId") REFERENCES "ConsultantEngagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantMeeting" ADD CONSTRAINT "ConsultantMeeting_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "ConsultantEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantMeeting" ADD CONSTRAINT "ConsultantMeeting_videoCallId_fkey" FOREIGN KEY ("videoCallId") REFERENCES "VideoCall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantMeeting" ADD CONSTRAINT "ConsultantMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantCaseMessage" ADD CONSTRAINT "ConsultantCaseMessage_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "ConsultantEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantCaseMessage" ADD CONSTRAINT "ConsultantCaseMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantCaseDiaryEntry" ADD CONSTRAINT "ConsultantCaseDiaryEntry_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "ConsultantEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantCaseDiaryEntry" ADD CONSTRAINT "ConsultantCaseDiaryEntry_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
