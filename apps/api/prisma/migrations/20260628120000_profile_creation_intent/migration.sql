-- CreateEnum
CREATE TYPE "ProfileCreationMode" AS ENUM ('self', 'on_behalf');

-- CreateEnum
CREATE TYPE "OnBehalfRelation" AS ENUM ('my_son', 'my_daughter', 'my_relative', 'someone_else');

-- CreateEnum
CREATE TYPE "NidDocumentSubject" AS ENUM ('member', 'creator');

-- AlterTable
ALTER TABLE "Profile"
ADD COLUMN "verifiedOnBehalf" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "creationMode" "ProfileCreationMode",
ADD COLUMN "onBehalfRelation" "OnBehalfRelation",
ADD COLUMN "creatorNidVerifiedAt" TIMESTAMP(3);

UPDATE "Profile" SET "creationMode" = 'self' WHERE "creationMode" IS NULL;

-- AlterTable
ALTER TABLE "NidDocument" ADD COLUMN "subject" "NidDocumentSubject" NOT NULL DEFAULT 'member';

-- DropIndex
DROP INDEX "NidDocument_profileId_side_key";

-- CreateIndex
CREATE UNIQUE INDEX "NidDocument_profileId_side_subject_key" ON "NidDocument"("profileId", "side", "subject");
