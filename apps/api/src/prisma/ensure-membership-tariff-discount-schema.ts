import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const STATEMENTS = [
  `ALTER TABLE "MembershipTariff" ADD COLUMN IF NOT EXISTS "discountPriceBdt" DECIMAL(10,2)`,
  `ALTER TABLE "MembershipTariff" ADD COLUMN IF NOT EXISTS "discountStartsAt" TIMESTAMP(3)`,
  `ALTER TABLE "MembershipTariff" ADD COLUMN IF NOT EXISTS "discountEndsAt" TIMESTAMP(3)`,
  `ALTER TABLE "MembershipTariff" ADD COLUMN IF NOT EXISTS "discountLabelEn" TEXT`,
  `ALTER TABLE "MembershipTariff" ADD COLUMN IF NOT EXISTS "discountLabelBn" TEXT`,
] as const;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function applyStatements(client: PrismaClient, label: string, logger: Logger) {
  for (const sql of STATEMENTS) {
    await client.$executeRawUnsafe(sql);
  }
  logger.log(`Membership tariff discount columns are in place (${label})`);
}

/**
 * Production safety net: paid checkout and plan cards read discountPriceBdt.
 * If prisma migrate deploy did not run, those queries 500.
 */
export async function ensureMembershipTariffDiscountSchema(
  client: PrismaClient,
  logger: Logger,
): Promise<void> {
  try {
    await applyStatements(client, 'DATABASE_URL', logger);
    return;
  } catch (error) {
    logger.warn(`Tariff discount schema ensure via DATABASE_URL failed: ${errorMessage(error)}`);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  const directUrl = process.env.DIRECT_URL?.trim();
  if (!directUrl || directUrl === databaseUrl) {
    logger.error(
      'MembershipTariff discount columns are missing and could not be added. Run prisma migrate deploy against DIRECT_URL.',
    );
    return;
  }

  const admin = new PrismaClient({
    datasources: { db: { url: directUrl } },
  });
  try {
    await admin.$connect();
    await applyStatements(admin, 'DIRECT_URL', logger);
  } catch (error) {
    logger.error(`Tariff discount schema ensure via DIRECT_URL failed: ${errorMessage(error)}`);
  } finally {
    await admin.$disconnect();
  }
}
