-- CreateEnum
CREATE TYPE "StaffActivityCategory" AS ENUM ('admin', 'verification', 'consultant', 'complaints');

-- CreateTable
CREATE TABLE "StaffActivityLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" "UserRole" NOT NULL,
    "category" "StaffActivityCategory" NOT NULL,
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "httpMethod" TEXT,
    "path" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffActivityLog_createdAt_idx" ON "StaffActivityLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "StaffActivityLog_expiresAt_idx" ON "StaffActivityLog"("expiresAt");

-- CreateIndex
CREATE INDEX "StaffActivityLog_actorId_createdAt_idx" ON "StaffActivityLog"("actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "StaffActivityLog_category_createdAt_idx" ON "StaffActivityLog"("category", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "StaffActivityLog" ADD CONSTRAINT "StaffActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
