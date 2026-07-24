-- CreateTable
CREATE TABLE "TermsSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "version" TEXT NOT NULL,
    "effectiveDateEn" TEXT NOT NULL,
    "effectiveDateBn" TEXT NOT NULL,
    "sectionsEn" JSONB NOT NULL,
    "sectionsBn" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "draftVersion" TEXT,
    "draftEffectiveDateEn" TEXT,
    "draftEffectiveDateBn" TEXT,
    "draftSectionsEn" JSONB,
    "draftSectionsBn" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermsSettings_pkey" PRIMARY KEY ("id")
);
