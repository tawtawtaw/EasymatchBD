import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tables = await prisma.$queryRaw`
  SELECT c.relname AS name, c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY c.relname
`;

const views = await prisma.$queryRaw`
  SELECT c.relname AS name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'v'
  ORDER BY c.relname
`;

const noRls = tables.filter((row) => !row.rls_enabled);
const rlsNoPolicy = await prisma.$queryRaw`
  SELECT c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = c.relname
    )
  ORDER BY c.relname
`;

const tablesAfterBaseline = [
  'VideoCallGuest',
  'MembershipTariff',
  'MembershipPayment',
  'ConsultantTariff',
  'ConsultantPayment',
  'ConsultantEngagement',
  'ConsultantMeeting',
  'ConsultantCaseMessage',
  'ConsultantCaseDiaryEntry',
  'MemberComplaint',
  'MemberComplaintMessage',
  'MemberComplaintDiaryEntry',
  'StaffActivityLog',
  'UserPushToken',
  'StaffNotification',
  'StaffNotificationRead',
];

console.log(`Public tables: ${tables.length}, RLS off: ${noRls.length}`);
console.log(`Public views: ${views.length}`);
console.log(`RLS on but zero policies: ${rlsNoPolicy.length}`);

if (noRls.length) {
  console.log('\nTables without RLS:');
  noRls.forEach((t) => console.log(` - ${t.name}`));
}

if (rlsNoPolicy.length) {
  console.log('\nTables with RLS but no policies:');
  rlsNoPolicy.forEach((t) => console.log(` - ${t.table_name}`));
}

console.log('\nPost-baseline tables (created after RLS sweep):');
for (const name of tablesAfterBaseline) {
  const row = tables.find((t) => t.name === name);
  console.log(` - ${name}: RLS=${row?.rls_enabled ?? 'missing'}`);
}

await prisma.$disconnect();
