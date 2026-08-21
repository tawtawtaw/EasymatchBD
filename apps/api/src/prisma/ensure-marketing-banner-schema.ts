import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "MarketingBanner" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "messageEn" TEXT NOT NULL DEFAULT '',
    "messageBn" TEXT,
    "labelEn" TEXT,
    "labelBn" TEXT,
    "href" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketingBanner_pkey" PRIMARY KEY ("id")
  )`,
  `INSERT INTO "MarketingBanner" ("id", "enabled", "messageEn", "updatedAt")
   VALUES ('singleton', false, '', CURRENT_TIMESTAMP)
   ON CONFLICT ("id") DO NOTHING`,
] as const;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function applyStatements(client: PrismaClient, label: string, logger: Logger) {
  for (const sql of STATEMENTS) {
    await client.$executeRawUnsafe(sql);
  }
  logger.log(`Marketing banner table is in place (${label})`);
}

/**
 * Production safety net: homepage layout reads MarketingBanner.
 * If prisma migrate deploy did not run, those queries 500.
 */
export async function ensureMarketingBannerSchema(
  client: PrismaClient,
  logger: Logger,
): Promise<void> {
  try {
    await applyStatements(client, 'DATABASE_URL', logger);
    return;
  } catch (error) {
    logger.warn(`Marketing banner schema ensure via DATABASE_URL failed: ${errorMessage(error)}`);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  const directUrl = process.env.DIRECT_URL?.trim();
  if (!directUrl || directUrl === databaseUrl) {
    logger.error(
      'MarketingBanner table is missing and could not be added. Run prisma migrate deploy against DIRECT_URL.',
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
    logger.error(`Marketing banner schema ensure via DIRECT_URL failed: ${errorMessage(error)}`);
  } finally {
    await admin.$disconnect();
  }
}
