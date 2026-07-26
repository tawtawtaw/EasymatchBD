-- Supabase lint 0023 (sensitive_columns_exposed) requires RLS on public tables with
-- columns like "token". UserPushToken was covered in 20260811120000; this migration
-- adds an event trigger so future Prisma tables get RLS + PostgREST revokes automatically.

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS EVENT_TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name IS NOT NULL
      AND cmd.schema_name = 'public'
      AND cmd.schema_name NOT IN ('pg_catalog', 'information_schema')
      AND cmd.schema_name NOT LIKE 'pg_toast%'
      AND cmd.schema_name NOT LIKE 'pg_temp%'
    THEN
      BEGIN
        EXECUTE format(
          'ALTER TABLE IF EXISTS %s ENABLE ROW LEVEL SECURITY',
          cmd.object_identity
        );
        EXECUTE format(
          'REVOKE ALL ON TABLE %s FROM anon, authenticated',
          cmd.object_identity
        );
        RAISE LOG 'rls_auto_enable: enabled RLS and revoked PostgREST roles on %',
          cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed on % (%).', cmd.object_identity, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION public.rls_auto_enable();

-- Idempotent hardening for backend-only tables with sensitive columns.
ALTER TABLE "UserPushToken" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "UserPushToken" FROM anon, authenticated, PUBLIC;

ALTER TABLE "StaffNotification" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StaffNotification" FROM anon, authenticated, PUBLIC;

ALTER TABLE "StaffNotificationRead" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "StaffNotificationRead" FROM anon, authenticated, PUBLIC;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, PUBLIC;
