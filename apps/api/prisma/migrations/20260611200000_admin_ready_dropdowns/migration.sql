-- AlterTable
ALTER TABLE "DropdownOption" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Existing seed rows are treated as system defaults (admin can relabel, not delete value)
UPDATE "DropdownOption" SET "isSystem" = true;
