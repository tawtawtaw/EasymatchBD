-- Add current and permanent address columns
ALTER TABLE "Profile" ADD COLUMN "currentCountry" TEXT NOT NULL DEFAULT 'Bangladesh';
ALTER TABLE "Profile" ADD COLUMN "currentDivision" TEXT;
ALTER TABLE "Profile" ADD COLUMN "currentDistrict" TEXT;
ALTER TABLE "Profile" ADD COLUMN "currentUpazila" TEXT;
ALTER TABLE "Profile" ADD COLUMN "currentAddressLine" TEXT;

ALTER TABLE "Profile" ADD COLUMN "permanentCountry" TEXT;
ALTER TABLE "Profile" ADD COLUMN "permanentDivision" TEXT;
ALTER TABLE "Profile" ADD COLUMN "permanentDistrict" TEXT;
ALTER TABLE "Profile" ADD COLUMN "permanentUpazila" TEXT;
ALTER TABLE "Profile" ADD COLUMN "permanentAddressLine" TEXT;
ALTER TABLE "Profile" ADD COLUMN "permanentSameAsCurrent" BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing single address into current address
UPDATE "Profile"
SET
  "currentCountry" = COALESCE("country", 'Bangladesh'),
  "currentDivision" = "division",
  "currentDistrict" = "district",
  "currentUpazila" = "upazila";

-- Drop legacy columns
ALTER TABLE "Profile" DROP COLUMN "country";
ALTER TABLE "Profile" DROP COLUMN "division";
ALTER TABLE "Profile" DROP COLUMN "district";
ALTER TABLE "Profile" DROP COLUMN "upazila";
