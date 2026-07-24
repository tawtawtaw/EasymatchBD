-- CreateEnum
CREATE TYPE "ConsultantServiceType" AS ENUM (
  'profile_assessment',
  'compatibility_guidance',
  'family_mediation',
  'meeting_coordination',
  'marriage_planning'
);

-- CreateTable
CREATE TABLE "ConsultantTariff" (
    "id" TEXT NOT NULL,
    "serviceType" "ConsultantServiceType" NOT NULL,
    "labelEn" TEXT NOT NULL,
    "labelBn" TEXT,
    "priceBdt" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "descriptionEn" TEXT,
    "descriptionBn" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantTariff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantTariff_serviceType_key" ON "ConsultantTariff"("serviceType");

-- Seed default consultant service tariffs
INSERT INTO "ConsultantTariff" (
    "id",
    "serviceType",
    "labelEn",
    "labelBn",
    "priceBdt",
    "currency",
    "isActive",
    "sortOrder",
    "descriptionEn",
    "descriptionBn",
    "updatedAt"
) VALUES
(
    'consult_tariff_profile_assessment',
    'profile_assessment',
    'Profile assessment',
    'প্রোফাইল মূল্যায়ন',
    999.00,
    'BDT',
    true,
    1,
    'Consultant review of both profiles with written feedback for the connection.',
    'সংযোগের উভয় প্রোফাইল পরামর্শদাতার পর্যালোচনা ও লিখিত মতামত।',
    CURRENT_TIMESTAMP
),
(
    'consult_tariff_compatibility_guidance',
    'compatibility_guidance',
    'Compatibility guidance',
    'সামঞ্জস্যতা নির্দেশনা',
    1499.00,
    'BDT',
    true,
    2,
    'Expert interpretation of the comparison matrix and partner expectations.',
    'তুলনা ম্যাট্রিক্স ও পার্টনার প্রত্যাশার বিশেষজ্ঞ ব্যাখ্যা।',
    CURRENT_TIMESTAMP
),
(
    'consult_tariff_family_mediation',
    'family_mediation',
    'Family mediation',
    'পারিবারিক মধ্যস্থতা',
    2499.00,
    'BDT',
    true,
    3,
    'Facilitated discussion when families or expectations need alignment.',
    'পরিবার বা প্রত্যাশা সামঞ্জস্য করতে সহায়তা করা আলোচনা।',
    CURRENT_TIMESTAMP
),
(
    'consult_tariff_meeting_coordination',
    'meeting_coordination',
    'Meeting coordination',
    'মিটিং সমন্বয়',
    799.00,
    'BDT',
    true,
    4,
    'Schedule and coordinate consultant or facilitated member meetings.',
    'পরামর্শদাতা বা সদস্য মিটিং নির্ধারণ ও সমন্বয়।',
    CURRENT_TIMESTAMP
),
(
    'consult_tariff_marriage_planning',
    'marriage_planning',
    'Marriage planning assistance',
    'বিবাহ পরিকল্পনা সহায়তা',
    1999.00,
    'BDT',
    true,
    5,
    'Checklist and timeline support for nikah and family introduction steps.',
    'নিকাহ ও পারিবারিক পরিচয়ের জন্য চেকলিস্ট ও সময়রেখা সহায়তা।',
    CURRENT_TIMESTAMP
);
