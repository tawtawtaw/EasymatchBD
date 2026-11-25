-- AlterEnum
ALTER TYPE "ProfileCreationMode" ADD VALUE IF NOT EXISTS 'staff_assisted';

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "createdByStaffId" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "consentNote" TEXT;
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "consentedAt" TIMESTAMP(3);
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "staffInviteSmsSentAt" TIMESTAMP(3);

-- AddForeignKey
DO $migration$ BEGIN
  ALTER TABLE "Profile"
    ADD CONSTRAINT "Profile_createdByStaffId_fkey"
    FOREIGN KEY ("createdByStaffId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $migration$;

CREATE INDEX IF NOT EXISTS "Profile_creationMode_idx" ON "Profile"("creationMode");
CREATE INDEX IF NOT EXISTS "Profile_createdByStaffId_idx" ON "Profile"("createdByStaffId");
