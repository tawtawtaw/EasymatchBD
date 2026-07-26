-- Public tables created after 20260805120000_enable_rls_post_baseline_tables.
-- Prisma uses the postgres role, which bypasses RLS as table owner.

ALTER TABLE "UserPushToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "UserPushToken" FROM anon, authenticated;

ALTER TABLE "StaffNotification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StaffNotification" FROM anon, authenticated;

ALTER TABLE "StaffNotificationRead" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StaffNotificationRead" FROM anon, authenticated;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
