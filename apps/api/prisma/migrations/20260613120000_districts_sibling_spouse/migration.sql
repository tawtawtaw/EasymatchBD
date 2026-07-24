-- AlterTable
ALTER TABLE "DropdownOption" ADD COLUMN "parentValue" TEXT;

-- AlterTable
ALTER TABLE "Sibling" ADD COLUMN "spouseName" TEXT,
ADD COLUMN "spouseEducation" TEXT,
ADD COLUMN "spouseProfession" TEXT;
