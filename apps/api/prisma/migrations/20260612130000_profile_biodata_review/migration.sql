-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "profileBiodataReviewStatus" "MediaReviewStatus",
ADD COLUMN "profileBiodataReviewedAt" TIMESTAMP(3);

-- Profiles already in the verification queue should have biodata marked pending
UPDATE "Profile" p
SET "profileBiodataReviewStatus" = 'pending'
WHERE "profileBiodataReviewStatus" IS NULL
  AND (
    EXISTS (
      SELECT 1 FROM "ProfilePhoto" ph
      WHERE ph."profileId" = p.id AND ph.status = 'pending'
    )
    OR EXISTS (
      SELECT 1 FROM "NidDocument" n
      WHERE n."profileId" = p.id AND n.status = 'pending'
    )
  );
