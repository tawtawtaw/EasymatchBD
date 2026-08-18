import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const STATEMENTS = [
  `ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP(3)`,
  `ALTER TABLE "Connection" ADD COLUMN IF NOT EXISTS "endedById" TEXT`,
  `CREATE INDEX IF NOT EXISTS "Connection_endedAt_idx" ON "Connection"("endedAt")`,
  `ALTER TYPE "InterestStatus" ADD VALUE IF NOT EXISTS 'ended'`,
] as const;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function applyStatements(client: PrismaClient, label: string, logger: Logger) {
  for (const sql of STATEMENTS) {
    await client.$executeRawUnsafe(sql);
  }
  logger.log(`Connection ended schema is in place (${label})`);
}

/**
 * Production safety net: authenticated discovery/home query Connection.endedAt.
 * If prisma migrate deploy did not run (or failed on the pooler), those
 * requests 500 with Nest's "Internal server error".
 */
export async function ensureConnectionEndedSchema(
  client: PrismaClient,
  logger: Logger,
): Promise<void> {
  try {
    await applyStatements(client, 'DATABASE_URL', logger);
    return;
  } catch (error) {
    logger.warn(`Schema ensure via DATABASE_URL failed: ${errorMessage(error)}`);
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  const directUrl = process.env.DIRECT_URL?.trim();
  if (!directUrl || directUrl === databaseUrl) {
    logger.error(
      'Connection.endedAt is missing and could not be added. Run prisma migrate deploy against DIRECT_URL.',
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
    logger.error(`Schema ensure via DIRECT_URL failed: ${errorMessage(error)}`);
  } finally {
    await admin.$disconnect();
  }
}
