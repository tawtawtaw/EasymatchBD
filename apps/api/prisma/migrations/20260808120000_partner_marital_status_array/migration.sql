-- AlterTable: partner marital status preference supports multiple selections
ALTER TABLE "PartnerPreference"
  ALTER COLUMN "maritalStatusPref" TYPE TEXT[]
  USING CASE
    WHEN "maritalStatusPref" IS NULL OR "maritalStatusPref" = '' THEN ARRAY[]::TEXT[]
    ELSE ARRAY["maritalStatusPref"]::TEXT[]
  END;

ALTER TABLE "PartnerPreference"
  ALTER COLUMN "maritalStatusPref" SET DEFAULT ARRAY[]::TEXT[];
