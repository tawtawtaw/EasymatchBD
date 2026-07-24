-- CreateEnum
CREATE TYPE "StaffNotificationType" AS ENUM ('verification_submission', 'complaint_submitted', 'consultant_case_queued', 'profile_deletion_request', 'complaint_assigned', 'consultant_case_assigned');

-- CreateTable
CREATE TABLE "StaffNotification" (
    "id" TEXT NOT NULL,
    "type" "StaffNotificationType" NOT NULL,
    "audienceRole" "UserRole" NOT NULL,
    "targetUserId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkPath" TEXT NOT NULL,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffNotificationRead" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffNotification_audienceRole_createdAt_idx" ON "StaffNotification"("audienceRole", "createdAt");

-- CreateIndex
CREATE INDEX "StaffNotification_targetUserId_createdAt_idx" ON "StaffNotification"("targetUserId", "createdAt");

-- CreateIndex
CREATE INDEX "StaffNotification_type_entityId_createdAt_idx" ON "StaffNotification"("type", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffNotificationRead_notificationId_userId_key" ON "StaffNotificationRead"("notificationId", "userId");

-- CreateIndex
CREATE INDEX "StaffNotificationRead_userId_idx" ON "StaffNotificationRead"("userId");

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotificationRead" ADD CONSTRAINT "StaffNotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "StaffNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotificationRead" ADD CONSTRAINT "StaffNotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
