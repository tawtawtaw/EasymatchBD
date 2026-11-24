-- AlterEnum
ALTER TYPE "ProfileCreationMode" ADD VALUE 'staff_assisted';

-- AlterTable
ALTER TABLE "Profile"
ADD COLUMN "createdByStaffId" TEXT,
ADD COLUMN "consentNote" TEXT,
ADD COLUMN "consentedAt" TIMESTAMP(3),
ADD COLUMN "staffInviteSmsSentAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Profile"
ADD CONSTRAINT "Profile_createdByStaffId_fkey"
FOREIGN KEY ("createdByStaffId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Profile_creationMode_idx" ON "Profile"("creationMode");
CREATE INDEX "Profile_createdByStaffId_idx" ON "Profile"("createdByStaffId");
