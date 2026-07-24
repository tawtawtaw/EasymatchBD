-- CreateEnum
CREATE TYPE "HeightUnit" AS ENUM ('cm', 'ft_in');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "heightUnit" "HeightUnit" NOT NULL DEFAULT 'cm';

-- AlterTable
ALTER TABLE "PartnerPreference" ADD COLUMN "heightUnit" "HeightUnit" NOT NULL DEFAULT 'cm';
