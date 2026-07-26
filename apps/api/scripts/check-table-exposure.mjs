import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const table = process.argv[2] ?? 'UserPushToken';

const [meta] = await prisma.$queryRaw`
  SELECT
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS rls_forced
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ${table}
`;

const grants = await prisma.$queryRaw`
  SELECT grantee, privilege_type
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = ${table}
  ORDER BY grantee, privilege_type
`;

const policies = await prisma.$queryRaw`
  SELECT policyname, roles, cmd, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = ${table}
`;

console.log(JSON.stringify({ meta, grants, policies }, null, 2));

await prisma.$disconnect();
