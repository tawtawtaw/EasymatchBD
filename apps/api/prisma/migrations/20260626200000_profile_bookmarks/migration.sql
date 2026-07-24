-- CreateTable
CREATE TABLE "ProfileBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProfileBookmark_userId_profileId_key" ON "ProfileBookmark"("userId", "profileId");

-- CreateIndex
CREATE INDEX "ProfileBookmark_userId_createdAt_idx" ON "ProfileBookmark"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProfileBookmark_profileId_idx" ON "ProfileBookmark"("profileId");

-- AddForeignKey
ALTER TABLE "ProfileBookmark" ADD CONSTRAINT "ProfileBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileBookmark" ADD CONSTRAINT "ProfileBookmark_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
