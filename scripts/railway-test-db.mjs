/**
 * Run on Railway API shell to test DATABASE_URL:
 *   cd apps/api && node ../../scripts/railway-test-db.mjs
 */
import { PrismaClient } from "@prisma/client";

function maskUrl(raw) {
  if (!raw) return "(unset)";
  try {
    const normalized = raw.replace(/^postgres(ql)?:\/\//, "http://");
    const parsed = new URL(normalized);
    parsed.password = parsed.password ? "***" : "";
    return `${parsed.protocol}//${parsed.username}${parsed.password ? ":***" : ""}@${parsed.host}${parsed.pathname}${parsed.search}`;
  } catch {
    return "(unparseable)";
  }
}

const url = process.env.DATABASE_URL?.trim();
console.log("DATABASE_URL:", maskUrl(url));

if (!url) {
  console.error("FAIL: DATABASE_URL is not set on this service.");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1 AS ok`;
  console.log("OK: Database connection works.");
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("FAIL:", message);
  if (/db\.[a-z0-9]+\.supabase\.co/i.test(url)) {
    console.error(
      "\nTip: Use Supabase Connect → Transaction pooler (aws-0-*.pooler.supabase.com:6543).\n" +
        "That hostname is IPv4 on every plan. The IPv4 add-on only fixes db.*.supabase.co direct host.",
    );
  }
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
