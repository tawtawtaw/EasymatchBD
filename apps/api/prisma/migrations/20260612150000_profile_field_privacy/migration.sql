-- CreateTable
CREATE TABLE "ProfileFieldPrivacy" (
    "fieldKey" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "isShareable" BOOLEAN NOT NULL DEFAULT true,
    "minPrivacyLevel" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileFieldPrivacy_pkey" PRIMARY KEY ("fieldKey")
);

-- CreateIndex
CREATE INDEX "ProfileFieldPrivacy_section_idx" ON "ProfileFieldPrivacy"("section");
