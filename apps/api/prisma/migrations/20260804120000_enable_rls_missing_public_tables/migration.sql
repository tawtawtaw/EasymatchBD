-- Tables created after 20260722120000_supabase_rls_public_schema were not covered
-- by the one-time RLS sweep. Enable RLS and revoke PostgREST roles on any public
-- table that still lacks it (e.g. StaffActivityLog). Prisma uses the postgres role,
-- which bypasses RLS as table owner.

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      tbl.tablename
    );
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM anon, authenticated',
      tbl.tablename
    );
  END LOOP;
END $$;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
