import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "AndroidAppRelease" (
    "id" TEXT NOT NULL,
    "versionCode" INTEGER NOT NULL,
    "versionName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AndroidAppRelease_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AndroidAppRelease_versionCode_key" ON "AndroidAppRelease"("versionCode")`,
  `CREATE INDEX IF NOT EXISTS "AndroidAppRelease_isCurrent_idx" ON "AndroidAppRelease"("isCurrent")`,
] as const;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function applyStatements(client: PrismaClient, label: string, logger: Logger) {
  for (const sql of STATEMENTS) {
    await client.$executeRawUnsafe(sql);
  }
  logger.log(`Android app release table is in place (${label})`);
}

export async function ensureAndroidAppReleaseSchema(
  client: PrismaClient,
  logger: Logger,
): Promise<void> {
  try {
    await applyStatements(client, 'DATABASE_URL', logger);
    return;
  } catch (error) {
    logger.warn(
      `Android app release schema ensure via DATABASE_URL failed: ${errorMessage(error)}`,
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  const directUrl = process.env.DIRECT_URL?.trim();
  if (!directUrl || directUrl === databaseUrl) {
    logger.error(
      'AndroidAppRelease table is missing and could not be added. Run prisma migrate deploy against DIRECT_URL.',
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
    logger.error(
      `Android app release schema ensure via DIRECT_URL failed: ${errorMessage(error)}`,
    );
  } finally {
    await admin.$disconnect();
  }
}
