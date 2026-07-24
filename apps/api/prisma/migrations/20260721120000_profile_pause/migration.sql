-- Member-initiated profile pause (reversible; distinct from admin account deactivation).
ALTER TABLE "Profile" ADD COLUMN "isPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profile" ADD COLUMN "pausedAt" TIMESTAMP(3);

CREATE INDEX "Profile_isPaused_isVerified_idx" ON "Profile"("isPaused", "isVerified");
