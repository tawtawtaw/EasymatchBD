-- AlterTable: preferred profession supports multiple selections
ALTER TABLE "PartnerPreference"
  ALTER COLUMN "preferredProfession" TYPE TEXT[]
  USING CASE
    WHEN "preferredProfession" IS NULL THEN ARRAY[]::TEXT[]
    ELSE ARRAY["preferredProfession"]::TEXT[]
  END;

ALTER TABLE "PartnerPreference"
  ALTER COLUMN "preferredProfession" SET DEFAULT ARRAY[]::TEXT[];
