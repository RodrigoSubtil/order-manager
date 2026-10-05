-- Order Manager: remove the discontinued browser JSON backup export.
--
-- Historical migration 006 created this RPC. Keeping this as a new migration
-- preserves the migration history while ensuring fresh and existing projects
-- reach the same final schema.

begin;

drop function if exists public.web_export_tenant_backup();

commit;
