-- CreateEnum
CREATE TYPE "VideoCallGuestStatus" AS ENUM ('pending_approval', 'approved', 'declined', 'joined', 'left', 'expired');

-- CreateTable
CREATE TABLE "VideoCallGuest" (
    "id" TEXT NOT NULL,
    "videoCallId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "relation" TEXT,
    "token" TEXT NOT NULL,
    "status" "VideoCallGuestStatus" NOT NULL DEFAULT 'pending_approval',
    "approvedByUserLow" BOOLEAN NOT NULL DEFAULT false,
    "approvedByUserHigh" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoCallGuest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoCallGuest_token_key" ON "VideoCallGuest"("token");

-- CreateIndex
CREATE INDEX "VideoCallGuest_videoCallId_status_idx" ON "VideoCallGuest"("videoCallId", "status");

-- CreateIndex
CREATE INDEX "VideoCallGuest_token_idx" ON "VideoCallGuest"("token");

-- AddForeignKey
ALTER TABLE "VideoCallGuest" ADD CONSTRAINT "VideoCallGuest_videoCallId_fkey" FOREIGN KEY ("videoCallId") REFERENCES "VideoCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallGuest" ADD CONSTRAINT "VideoCallGuest_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
