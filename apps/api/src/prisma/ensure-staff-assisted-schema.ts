import { Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Idempotent DDL for staff-assisted profiles. Prisma migrate deploy can fail on
 * the pooler (especially ALTER TYPE ADD VALUE), leaving Profile findMany/findFirst
 * 500ing while count(*) still works.
 */
const STATEMENTS = [
  `ALTER TYPE "ProfileCreationMode" ADD VALUE IF NOT EXISTS 'staff_assisted'`,
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "createdByStaffId" TEXT`,
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "consentNote" TEXT`,
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "consentedAt" TIMESTAMP(3)`,
  `ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "staffInviteSmsSentAt" TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS "Profile_creationMode_idx" ON "Profile"("creationMode")`,
  `CREATE INDEX IF NOT EXISTS "Profile_createdByStaffId_idx" ON "Profile"("createdByStaffId")`,
  `DO $ensure$ BEGIN
     ALTER TABLE "Profile"
       ADD CONSTRAINT "Profile_createdByStaffId_fkey"
       FOREIGN KEY ("createdByStaffId") REFERENCES "User"("id")
       ON DELETE SET NULL ON UPDATE CASCADE;
   EXCEPTION
     WHEN duplicate_object THEN NULL;
   END $ensure$`,
] as const;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function applyStatements(
  client: PrismaClient,
  label: string,
  logger: Logger,
) {
  for (const sql of STATEMENTS) {
    await client.$executeRawUnsafe(sql);
  }
  logger.log(`Staff-assisted profile schema is in place (${label})`);
}

export async function ensureStaffAssistedSchema(
  client: PrismaClient,
  logger: Logger,
): Promise<void> {
  try {
    await applyStatements(client, 'DATABASE_URL', logger);
    return;
  } catch (error) {
    logger.warn(
      `Staff-assisted schema ensure via DATABASE_URL failed: ${errorMessage(error)}`,
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  const directUrl = process.env.DIRECT_URL?.trim();
  if (!directUrl || directUrl === databaseUrl) {
    logger.error(
      'Staff-assisted Profile columns are missing and could not be added. Run prisma migrate deploy against DIRECT_URL.',
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
      `Staff-assisted schema ensure via DIRECT_URL failed: ${errorMessage(error)}`,
    );
  } finally {
    await admin.$disconnect();
  }
}
