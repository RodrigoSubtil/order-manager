-- Corrections found by adversarial integration tests against local PostgreSQL.

CREATE OR REPLACE FUNCTION "app_security"."has_visible_membership"(target_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships membership
    WHERE membership.tenant_id = target_tenant
      AND membership.user_id = app_security.current_user_id()
      AND membership.status IN ('ACTIVE', 'INVITED', 'SUSPENDED')
  )
$$;

REVOKE ALL ON FUNCTION "app_security"."has_visible_membership"(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "app_security"."has_visible_membership"(UUID) TO "order_manager_api";

DROP POLICY "tenants_select_membership" ON "tenants";
CREATE POLICY "tenants_select_membership" ON "tenants" FOR SELECT TO "order_manager_api"
  USING (
    created_by = app_security.current_user_id()
    OR app_security.has_visible_membership(id)
  );

CREATE OR REPLACE FUNCTION public."enforce_membership_change"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor UUID := app_security.current_user_id();
  actor_role "MembershipRole";
  active_owner_count INTEGER;
BEGIN
  -- Migrations/seeds run without request context. API and direct authenticated
  -- requests always have a verified subject and must pass all checks below.
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (NEW.tenant_id <> OLD.tenant_id OR NEW.user_id <> OLD.user_id) THEN
    RAISE EXCEPTION 'membership identity is immutable' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.user_id = actor
     AND OLD.status = 'INVITED'
     AND NEW.status = 'ACTIVE'
     AND NEW.role = OLD.role THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT'
     AND NEW.user_id = actor
     AND NEW.role = 'OWNER'
     AND NEW.status = 'ACTIVE'
     AND app_security.is_tenant_creator(NEW.tenant_id) THEN
    RETURN NEW;
  END IF;

  SELECT membership.role INTO actor_role
  FROM public.tenant_memberships membership
  WHERE membership.tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
    AND membership.user_id = actor
    AND membership.status = 'ACTIVE';

  IF actor_role IS NULL OR actor_role = 'OPERATOR' THEN
    RAISE EXCEPTION 'membership management requires OWNER or ADMIN' USING ERRCODE = '42501';
  END IF;

  IF actor_role = 'ADMIN'
     AND (COALESCE(OLD.role, NEW.role) = 'OWNER' OR NEW.role = 'OWNER') THEN
    RAISE EXCEPTION 'ADMIN cannot manage OWNER memberships' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.role = 'OWNER'
     AND OLD.status = 'ACTIVE'
     AND (NEW.role <> 'OWNER' OR NEW.status <> 'ACTIVE') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(OLD.tenant_id::text, 0));
    SELECT count(*) INTO active_owner_count
    FROM public.tenant_memberships membership
    WHERE membership.tenant_id = OLD.tenant_id
      AND membership.role = 'OWNER'
      AND membership.status = 'ACTIVE';

    IF active_owner_count <= 1 THEN
      RAISE EXCEPTION 'the last active OWNER cannot be removed' USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END
$$;
