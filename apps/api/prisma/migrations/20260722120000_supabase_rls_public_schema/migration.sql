-- Supabase exposes the public schema through PostgREST (anon / authenticated roles).
-- EasymatchBD uses Prisma via the postgres role only, so enable RLS on all public
-- tables and revoke PostgREST access. The postgres role bypasses RLS as table owner.

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
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
