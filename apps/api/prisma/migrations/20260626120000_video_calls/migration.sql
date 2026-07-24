-- CreateEnum
CREATE TYPE "VideoCallStatus" AS ENUM ('scheduled', 'ringing', 'active', 'completed', 'cancelled', 'declined', 'missed');

-- CreateEnum
CREATE TYPE "VideoCallSignalType" AS ENUM ('offer', 'answer', 'ice');

-- CreateTable
CREATE TABLE "VideoCall" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "initiatorId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "status" "VideoCallStatus" NOT NULL DEFAULT 'ringing',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoCallSignal" (
    "id" TEXT NOT NULL,
    "videoCallId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "VideoCallSignalType" NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoCallSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoCall_connectionId_status_idx" ON "VideoCall"("connectionId", "status");

-- CreateIndex
CREATE INDEX "VideoCall_initiatorId_idx" ON "VideoCall"("initiatorId");

-- CreateIndex
CREATE INDEX "VideoCall_scheduledAt_idx" ON "VideoCall"("scheduledAt");

-- CreateIndex
CREATE INDEX "VideoCallSignal_videoCallId_createdAt_idx" ON "VideoCallSignal"("videoCallId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoCallSignal_senderId_idx" ON "VideoCallSignal"("senderId");

-- AddForeignKey
ALTER TABLE "VideoCall" ADD CONSTRAINT "VideoCall_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "Connection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCall" ADD CONSTRAINT "VideoCall_initiatorId_fkey" FOREIGN KEY ("initiatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallSignal" ADD CONSTRAINT "VideoCallSignal_videoCallId_fkey" FOREIGN KEY ("videoCallId") REFERENCES "VideoCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoCallSignal" ADD CONSTRAINT "VideoCallSignal_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
