-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "biography" TEXT,
ADD COLUMN     "company" TEXT,
ADD COLUMN     "complexion" TEXT,
ADD COLUMN     "designation" TEXT,
ADD COLUMN     "disabilityInfo" TEXT,
ADD COLUMN     "division" TEXT,
ADD COLUMN     "educationYear" INTEGER,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "hasDisability" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "highestDegree" TEXT,
ADD COLUMN     "hobbies" TEXT[],
ADD COLUMN     "institution" TEXT,
ADD COLUMN     "interests" TEXT,
ADD COLUMN     "monthlyIncomeRange" TEXT,
ADD COLUMN     "nidVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "upazila" TEXT,
ADD COLUMN     "weightKg" INTEGER;

-- CreateTable
CREATE TABLE "FamilyInfo" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "fatherName" TEXT,
    "fatherEducation" TEXT,
    "fatherProfession" TEXT,
    "motherName" TEXT,
    "motherEducation" TEXT,
    "motherProfession" TEXT,
    "familyType" TEXT,
    "familyStatus" TEXT,
    "familyValues" TEXT,
    "familyAssets" TEXT,

    CONSTRAINT "FamilyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sibling" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "relationship" TEXT,
    "education" TEXT,
    "profession" TEXT,
    "maritalStatus" TEXT,

    CONSTRAINT "Sibling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPreference" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "heightMinCm" INTEGER,
    "heightMaxCm" INTEGER,
    "weightMinKg" INTEGER,
    "weightMaxKg" INTEGER,
    "preferredDistricts" TEXT[],
    "minimumEducation" TEXT,
    "preferredProfession" TEXT,
    "preferredReligion" TEXT,
    "maritalStatusPref" TEXT,
    "additionalNotes" TEXT,

    CONSTRAINT "PartnerPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DropdownOption" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DropdownOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyInfo_profileId_key" ON "FamilyInfo"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPreference_profileId_key" ON "PartnerPreference"("profileId");

-- CreateIndex
CREATE INDEX "DropdownOption_category_idx" ON "DropdownOption"("category");

-- CreateIndex
CREATE UNIQUE INDEX "DropdownOption_category_value_key" ON "DropdownOption"("category", "value");

-- AddForeignKey
ALTER TABLE "FamilyInfo" ADD CONSTRAINT "FamilyInfo_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sibling" ADD CONSTRAINT "Sibling_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPreference" ADD CONSTRAINT "PartnerPreference_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
