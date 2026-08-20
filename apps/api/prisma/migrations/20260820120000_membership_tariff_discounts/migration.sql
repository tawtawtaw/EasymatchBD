-- Optional time-boxed sale price on each paid membership plan.
-- IF NOT EXISTS keeps this safe if runtime schema-ensure already added the columns.
ALTER TABLE "MembershipTariff" ADD COLUMN IF NOT EXISTS "discountPriceBdt" DECIMAL(10,2);
ALTER TABLE "MembershipTariff" ADD COLUMN IF NOT EXISTS "discountStartsAt" TIMESTAMP(3);
ALTER TABLE "MembershipTariff" ADD COLUMN IF NOT EXISTS "discountEndsAt" TIMESTAMP(3);
ALTER TABLE "MembershipTariff" ADD COLUMN IF NOT EXISTS "discountLabelEn" TEXT;
ALTER TABLE "MembershipTariff" ADD COLUMN IF NOT EXISTS "discountLabelBn" TEXT;
