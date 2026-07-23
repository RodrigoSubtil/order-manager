-- Etapa 19: active tenant context, membership lifecycle and defense-in-depth RLS.
-- This migration contains no production data migration and is first exercised
-- against the disposable local PostgreSQL database.

CREATE SCHEMA IF NOT EXISTS "app_security";
REVOKE ALL ON SCHEMA "app_security" FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'order_manager_api') THEN
    CREATE ROLE "order_manager_api" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;

ALTER TABLE "tenant_memberships" DROP CONSTRAINT "tenant_memberships_pkey";
ALTER TABLE "tenant_memberships"
  ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false,
  ADD CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("id"),
  ADD CONSTRAINT "tenant_memberships_tenant_id_user_id_key" UNIQUE ("tenant_id", "user_id"),
  ADD CONSTRAINT "tenant_memberships_revocation_consistent" CHECK (
    ("status" = 'REVOKED' AND "revoked_at" IS NOT NULL AND "revoked_by" IS NOT NULL)
    OR ("status" <> 'REVOKED' AND "revoked_at" IS NULL AND "revoked_by" IS NULL)
  );

CREATE UNIQUE INDEX "tenant_memberships_one_default_per_user_key"
  ON "tenant_memberships" ("user_id")
  WHERE "is_default" = true AND "status" = 'ACTIVE';

CREATE OR REPLACE FUNCTION "app_security"."current_user_id"()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('app.current_user_id', true), '')
  )::uuid
$$;

CREATE OR REPLACE FUNCTION "app_security"."current_tenant_id"()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION "app_security"."has_active_membership"(
  target_tenant UUID,
  allowed_roles "MembershipRole"[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships membership
    JOIN public.tenants tenant ON tenant.id = membership.tenant_id
    JOIN public.users profile ON profile.id = membership.user_id
    WHERE membership.tenant_id = target_tenant
      AND membership.user_id = app_security.current_user_id()
      AND membership.status = 'ACTIVE'
      AND tenant.status = 'ACTIVE'
      AND profile.status = 'ACTIVE'
      AND (allowed_roles IS NULL OR membership.role = ANY(allowed_roles))
  )
$$;

CREATE OR REPLACE FUNCTION "app_security"."can_access_tenant"(
  target_tenant UUID,
  allowed_roles "MembershipRole"[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT app_security.current_tenant_id() = target_tenant
    AND app_security.has_active_membership(target_tenant, allowed_roles)
$$;

CREATE OR REPLACE FUNCTION "app_security"."is_tenant_creator"(target_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants tenant
    WHERE tenant.id = target_tenant
      AND tenant.created_by = app_security.current_user_id()
  )
$$;

GRANT USAGE ON SCHEMA "app_security" TO "order_manager_api";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA "app_security" TO "order_manager_api";
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "app_security" FROM PUBLIC;

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
  IF current_user <> 'order_manager_api' THEN
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

CREATE TRIGGER "tenant_memberships_enforce_change"
BEFORE INSERT OR UPDATE ON "tenant_memberships"
FOR EACH ROW EXECUTE FUNCTION public."enforce_membership_change"();

CREATE OR REPLACE FUNCTION public."sync_auth_user_profile"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.users SET status = 'DISABLED', updated_at = now() WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.users (id, display_name, email, status, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''), NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1), 'Utilizador'),
    NEW.email,
    'ACTIVE',
    COALESCE(NEW.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    status = 'ACTIVE',
    updated_at = now();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public."upsert_invited_user_profile"(
  target_user UUID,
  target_email TEXT,
  target_display_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT app_security.can_access_tenant(
    app_security.current_tenant_id(),
    ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]
  ) THEN
    RAISE EXCEPTION 'inviting users requires OWNER or ADMIN' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.users (id, display_name, email, status, created_at, updated_at)
  VALUES (target_user, target_display_name, target_email, 'ACTIVE', now(), now())
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    status = 'ACTIVE',
    updated_at = now();
END
$$;

REVOKE ALL ON FUNCTION public."upsert_invited_user_profile"(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public."upsert_invited_user_profile"(UUID, TEXT, TEXT) TO "order_manager_api";

CREATE OR REPLACE FUNCTION public."reserve_order_number"(target_tenant UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  reserved_number BIGINT;
BEGIN
  IF NOT app_security.can_access_tenant(target_tenant) THEN
    RAISE EXCEPTION 'active tenant membership required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.tenants
  SET next_order_number = next_order_number + 1,
      updated_at = now(),
      updated_by = app_security.current_user_id()
  WHERE id = target_tenant
  RETURNING next_order_number - 1 INTO reserved_number;

  IF reserved_number IS NULL THEN
    RAISE EXCEPTION 'tenant not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN reserved_number;
END
$$;

REVOKE ALL ON FUNCTION public."reserve_order_number"(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public."reserve_order_number"(UUID) TO "order_manager_api";

DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS "order_manager_sync_auth_user_upsert" ON auth.users;
    DROP TRIGGER IF EXISTS "order_manager_sync_auth_user_delete" ON auth.users;
    CREATE TRIGGER "order_manager_sync_auth_user_upsert"
      AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public."sync_auth_user_profile"();
    CREATE TRIGGER "order_manager_sync_auth_user_delete"
      AFTER DELETE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public."sync_auth_user_profile"();
  END IF;
END
$$;

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_memberships" FORCE ROW LEVEL SECURITY;
ALTER TABLE "tenant_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_settings" FORCE ROW LEVEL SECURITY;
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orders" FORCE ROW LEVEL SECURITY;
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_items" FORCE ROW LEVEL SECURITY;
ALTER TABLE "catalog_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "catalog_products" FORCE ROW LEVEL SECURITY;
ALTER TABLE "responsibles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "responsibles" FORCE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;

CREATE POLICY "users_select_self" ON "users" FOR SELECT TO "order_manager_api"
  USING (id = app_security.current_user_id());
CREATE POLICY "users_insert_self" ON "users" FOR INSERT TO "order_manager_api"
  WITH CHECK (id = app_security.current_user_id());
CREATE POLICY "users_update_self" ON "users" FOR UPDATE TO "order_manager_api"
  USING (id = app_security.current_user_id())
  WITH CHECK (id = app_security.current_user_id());

CREATE POLICY "tenants_select_membership" ON "tenants" FOR SELECT TO "order_manager_api"
  USING (EXISTS (
    SELECT 1 FROM public.tenant_memberships membership
    WHERE membership.tenant_id = id
      AND membership.user_id = app_security.current_user_id()
      AND membership.status IN ('ACTIVE', 'INVITED', 'SUSPENDED')
  ));
CREATE POLICY "tenants_insert_self" ON "tenants" FOR INSERT TO "order_manager_api"
  WITH CHECK (created_by = app_security.current_user_id());
CREATE POLICY "tenants_update_admin" ON "tenants" FOR UPDATE TO "order_manager_api"
  USING (app_security.can_access_tenant(id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]))
  WITH CHECK (app_security.can_access_tenant(id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]));

CREATE POLICY "memberships_select_self_or_admin" ON "tenant_memberships" FOR SELECT TO "order_manager_api"
  USING (
    user_id = app_security.current_user_id()
    OR app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[])
  );
CREATE POLICY "memberships_insert_owner_or_admin" ON "tenant_memberships" FOR INSERT TO "order_manager_api"
  WITH CHECK (
    (
      user_id = app_security.current_user_id()
      AND role = 'OWNER'
      AND status = 'ACTIVE'
      AND app_security.is_tenant_creator(tenant_id)
    )
    OR app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[])
  );
CREATE POLICY "memberships_update_self_or_admin" ON "tenant_memberships" FOR UPDATE TO "order_manager_api"
  USING (
    user_id = app_security.current_user_id()
    OR app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[])
  )
  WITH CHECK (
    user_id = app_security.current_user_id()
    OR app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[])
  );

CREATE POLICY "tenant_settings_select" ON "tenant_settings" FOR SELECT TO "order_manager_api"
  USING (app_security.can_access_tenant(tenant_id));
CREATE POLICY "tenant_settings_insert_admin" ON "tenant_settings" FOR INSERT TO "order_manager_api"
  WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]));
CREATE POLICY "tenant_settings_update_admin" ON "tenant_settings" FOR UPDATE TO "order_manager_api"
  USING (app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]))
  WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]));

CREATE POLICY "orders_select" ON "orders" FOR SELECT TO "order_manager_api"
  USING (app_security.can_access_tenant(tenant_id));
CREATE POLICY "orders_insert" ON "orders" FOR INSERT TO "order_manager_api"
  WITH CHECK (app_security.can_access_tenant(tenant_id));
CREATE POLICY "orders_update" ON "orders" FOR UPDATE TO "order_manager_api"
  USING (app_security.can_access_tenant(tenant_id))
  WITH CHECK (app_security.can_access_tenant(tenant_id));

CREATE POLICY "order_items_select" ON "order_items" FOR SELECT TO "order_manager_api"
  USING (app_security.can_access_tenant(tenant_id));
CREATE POLICY "order_items_insert" ON "order_items" FOR INSERT TO "order_manager_api"
  WITH CHECK (app_security.can_access_tenant(tenant_id));
CREATE POLICY "order_items_update" ON "order_items" FOR UPDATE TO "order_manager_api"
  USING (app_security.can_access_tenant(tenant_id))
  WITH CHECK (app_security.can_access_tenant(tenant_id));

CREATE POLICY "catalog_select" ON "catalog_products" FOR SELECT TO "order_manager_api"
  USING (app_security.can_access_tenant(tenant_id));
CREATE POLICY "catalog_insert_admin" ON "catalog_products" FOR INSERT TO "order_manager_api"
  WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]));
CREATE POLICY "catalog_update_admin" ON "catalog_products" FOR UPDATE TO "order_manager_api"
  USING (app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]))
  WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]));

CREATE POLICY "responsibles_select" ON "responsibles" FOR SELECT TO "order_manager_api"
  USING (app_security.can_access_tenant(tenant_id));
CREATE POLICY "responsibles_insert_admin" ON "responsibles" FOR INSERT TO "order_manager_api"
  WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]));
CREATE POLICY "responsibles_update_admin" ON "responsibles" FOR UPDATE TO "order_manager_api"
  USING (app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]))
  WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]));

CREATE POLICY "audit_select_admin" ON "audit_logs" FOR SELECT TO "order_manager_api"
  USING (app_security.can_access_tenant(tenant_id, ARRAY['OWNER', 'ADMIN']::"MembershipRole"[]));
CREATE POLICY "audit_insert_actor" ON "audit_logs" FOR INSERT TO "order_manager_api"
  WITH CHECK (
    app_security.can_access_tenant(tenant_id)
    AND actor_user_id = app_security.current_user_id()
  );

GRANT USAGE ON SCHEMA public TO "order_manager_api";
GRANT SELECT, INSERT, UPDATE ON TABLE
  "users", "tenants", "tenant_memberships", "tenant_settings", "orders", "order_items",
  "catalog_products", "responsibles", "audit_logs"
TO "order_manager_api";
REVOKE DELETE ON TABLE
  "users", "tenants", "tenant_memberships", "tenant_settings", "orders", "order_items",
  "catalog_products", "responsibles", "audit_logs"
FROM "order_manager_api";

-- The browser must use the API for business data. On Supabase these roles are
-- removed from direct table access in addition to RLS.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON TABLE public.tenants, public.tenant_memberships, public.tenant_settings,
      public.orders, public.order_items, public.catalog_products, public.responsibles,
      public.audit_logs FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON TABLE public.tenants, public.tenant_memberships, public.tenant_settings,
      public.orders, public.order_items, public.catalog_products, public.responsibles,
      public.audit_logs FROM authenticated;
  END IF;
END
$$;
