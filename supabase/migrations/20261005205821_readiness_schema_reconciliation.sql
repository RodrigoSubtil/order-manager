-- Canonical application schema: no tenant/user/password/seed/order/cron is created.
-- Tested on restored copies of both projects and an empty database. No row or table is deleted.
-- Only individually matched foreign keys are replaced; equivalent constraints are renamed.
SET lock_timeout='5s'; SET statement_timeout='120s'; SET check_function_bodies=false;
SET search_path=public,extensions,auth,app_security; CREATE SCHEMA IF NOT EXISTS app_security;
REVOKE ALL ON SCHEMA app_security FROM PUBLIC,anon,authenticated;
DO $om_role$ BEGIN CREATE ROLE order_manager_api NOLOGIN NOBYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $om_role$;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC,anon,authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon,authenticated;
DO $om_type$ BEGIN CREATE TYPE "public"."web_membership_context" AS ("tenant_id" uuid,"tenant_name" text,"tenant_slug" text,"user_id" uuid,"display_name" text,"username" text,"role" "MembershipRole"); EXCEPTION WHEN duplicate_object THEN NULL; END $om_type$;
CREATE OR REPLACE FUNCTION public.web_normalize_label(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$ select lower(regexp_replace(btrim(p_value), '[[:space:]]+', ' ', 'g')) $function$
;
REVOKE ALL ON FUNCTION public.web_normalize_label(text) FROM PUBLIC,anon,authenticated;
CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "actor_user_id" uuid,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "request_id" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."catalog_products" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "category" "ProductCategory" NOT NULL,
  "name" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_by" uuid
);
CREATE TABLE IF NOT EXISTS "public"."customers" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "name" text NOT NULL,
  "phone" text NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "normalized_name" text GENERATED ALWAYS AS (web_normalize_label(name)) STORED,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS "public"."order_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "catalog_product_id" uuid,
  "category" "ProductCategory" NOT NULL,
  "product_name" text NOT NULL,
  "quantity_value" numeric(12,3) NOT NULL,
  "quantity_unit" "QuantityUnit" NOT NULL,
  "notes" text,
  "position" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_by" uuid
);
CREATE TABLE IF NOT EXISTS "public"."order_save_receipts" (
  "tenant_id" uuid NOT NULL,
  "request_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "order_version" integer NOT NULL,
  "payload_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."orders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "order_number" bigint NOT NULL,
  "client_name" text NOT NULL,
  "phone" text NOT NULL,
  "responsible_id" uuid NOT NULL,
  "delivery_date" date NOT NULL,
  "delivery_time" time without time zone NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_by" uuid,
  "completed_at" timestamp with time zone,
  "completed_by" uuid,
  "customer_id" uuid
);
CREATE TABLE IF NOT EXISTS "public"."responsibles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "name" text NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "created_by" uuid,
  "updated_by" uuid,
  "deleted_by" uuid
);
CREATE TABLE IF NOT EXISTS "public"."tenant_management_credentials" (
  "tenant_id" uuid NOT NULL,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS "public"."tenant_management_sessions" (
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "session_id" text NOT NULL,
  "unlocked_until" timestamp with time zone,
  "failed_attempts" integer DEFAULT 0 NOT NULL,
  "locked_until" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."tenant_memberships" (
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" "MembershipRole" NOT NULL,
  "status" "MembershipStatus" DEFAULT 'INVITED'::"MembershipStatus" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid,
  "revoked_at" timestamp with time zone,
  "revoked_by" uuid,
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL
);
CREATE TABLE IF NOT EXISTS "public"."tenant_settings" (
  "tenant_id" uuid NOT NULL,
  "timezone" text NOT NULL,
  "locale" text NOT NULL,
  "order_retention_days" integer,
  "print_preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS "public"."tenants" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "status" "TenantStatus" DEFAULT 'ACTIVE'::"TenantStatus" NOT NULL,
  "next_order_number" bigint DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_by" uuid
);
CREATE TABLE IF NOT EXISTS "public"."users" (
  "id" uuid NOT NULL,
  "display_name" text NOT NULL,
  "status" "UserStatus" DEFAULT 'ACTIVE'::"UserStatus" NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "username" text NOT NULL
);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS catalog_product_id uuid;
DROP TRIGGER IF EXISTS orders_delivery_not_past ON public.orders;

DO $om_reconcile$ DECLARE target jsonb; existing_name text; existing_definition text; matching_index text; target_table regclass; BEGIN
 FOR target IN SELECT value FROM jsonb_array_elements('[{"table":"audit_logs","name":"audit_logs_pkey","type":"p","definition":"PRIMARY KEY (id)"},{"table":"catalog_products","name":"catalog_products_name_check","type":"c","definition":"CHECK (length(btrim(name)) > 0)"},{"table":"catalog_products","name":"catalog_products_pkey","type":"p","definition":"PRIMARY KEY (id)"},{"table":"catalog_products","name":"catalog_products_position_check","type":"c","definition":"CHECK (\"position\" >= 0)"},{"table":"catalog_products","name":"catalog_products_tenant_id_id_unique","type":"u","definition":"UNIQUE (tenant_id, id)"},{"table":"catalog_products","name":"catalog_products_version_check","type":"c","definition":"CHECK (version > 0)"},{"table":"customers","name":"customers_name_check","type":"c","definition":"CHECK (length(btrim(name)) >= 2 AND length(btrim(name)) <= 160)"},{"table":"customers","name":"customers_phone_check","type":"c","definition":"CHECK (phone ~ ''^[0-9]{9,15}$''::text)"},{"table":"customers","name":"customers_pkey","type":"p","definition":"PRIMARY KEY (id)"},{"table":"customers","name":"customers_tenant_id_id_unique","type":"u","definition":"UNIQUE (tenant_id, id)"},{"table":"customers","name":"customers_tenant_identity_unique","type":"u","definition":"UNIQUE (tenant_id, normalized_name, phone)"},{"table":"customers","name":"customers_version_check","type":"c","definition":"CHECK (version > 0)"},{"table":"order_items","name":"order_items_pkey","type":"p","definition":"PRIMARY KEY (id)"},{"table":"order_items","name":"order_items_position_check","type":"c","definition":"CHECK (\"position\" >= 0)"},{"table":"order_items","name":"order_items_product_name_check","type":"c","definition":"CHECK (length(btrim(product_name)) > 0)"},{"table":"order_items","name":"order_items_quantity_value_check","type":"c","definition":"CHECK (quantity_value > 0::numeric)"},{"table":"order_items","name":"order_items_tenant_id_id_unique","type":"u","definition":"UNIQUE (tenant_id, id)"},{"table":"order_save_receipts","name":"order_save_receipts_pkey","type":"p","definition":"PRIMARY KEY (tenant_id, request_id)"},{"table":"orders","name":"orders_client_name_check","type":"c","definition":"CHECK (length(btrim(client_name)) >= 2)"},{"table":"orders","name":"orders_order_number_check","type":"c","definition":"CHECK (order_number > 0)"},{"table":"orders","name":"orders_phone_required_format","type":"c","definition":"CHECK (phone ~ ''^[0-9]{9,15}$''::text)"},{"table":"orders","name":"orders_pkey","type":"p","definition":"PRIMARY KEY (id)"},{"table":"orders","name":"orders_tenant_id_id_unique","type":"u","definition":"UNIQUE (tenant_id, id)"},{"table":"orders","name":"orders_tenant_order_number_unique","type":"u","definition":"UNIQUE (tenant_id, order_number)"},{"table":"orders","name":"orders_version_check","type":"c","definition":"CHECK (version > 0)"},{"table":"responsibles","name":"responsibles_name_check","type":"c","definition":"CHECK (length(btrim(name)) > 0)"},{"table":"responsibles","name":"responsibles_pkey","type":"p","definition":"PRIMARY KEY (id)"},{"table":"responsibles","name":"responsibles_position_check","type":"c","definition":"CHECK (\"position\" >= 0)"},{"table":"responsibles","name":"responsibles_tenant_id_id_unique","type":"u","definition":"UNIQUE (tenant_id, id)"},{"table":"responsibles","name":"responsibles_version_check","type":"c","definition":"CHECK (version > 0)"},{"table":"tenant_management_credentials","name":"tenant_management_credentials_password_hash_check","type":"c","definition":"CHECK (length(password_hash) >= 40)"},{"table":"tenant_management_credentials","name":"tenant_management_credentials_pkey","type":"p","definition":"PRIMARY KEY (tenant_id)"},{"table":"tenant_management_sessions","name":"tenant_management_sessions_failed_attempts_check","type":"c","definition":"CHECK (failed_attempts >= 0)"},{"table":"tenant_management_sessions","name":"tenant_management_sessions_pkey","type":"p","definition":"PRIMARY KEY (tenant_id, user_id, session_id)"},{"table":"tenant_memberships","name":"tenant_memberships_pkey","type":"p","definition":"PRIMARY KEY (id)"},{"table":"tenant_memberships","name":"tenant_memberships_revocation_consistent","type":"c","definition":"CHECK (status = ''REVOKED''::\"MembershipStatus\" AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL OR status <> ''REVOKED''::\"MembershipStatus\" AND revoked_at IS NULL AND revoked_by IS NULL)"},{"table":"tenant_memberships","name":"tenant_memberships_role_owner_or_operator","type":"c","definition":"CHECK (role::text = ANY (ARRAY[''OWNER''::text, ''OPERATOR''::text]))"},{"table":"tenant_memberships","name":"tenant_memberships_tenant_user_unique","type":"u","definition":"UNIQUE (tenant_id, user_id)"},{"table":"tenant_settings","name":"tenant_settings_pkey","type":"p","definition":"PRIMARY KEY (tenant_id)"},{"table":"tenant_settings","name":"tenant_settings_retention_positive","type":"c","definition":"CHECK (order_retention_days IS NULL OR order_retention_days > 0)"},{"table":"tenant_settings","name":"tenant_settings_version_positive","type":"c","definition":"CHECK (version > 0)"},{"table":"tenants","name":"tenants_next_order_number_check","type":"c","definition":"CHECK (next_order_number > 0)"},{"table":"tenants","name":"tenants_pkey","type":"p","definition":"PRIMARY KEY (id)"},{"table":"tenants","name":"tenants_slug_key","type":"u","definition":"UNIQUE (slug)"},{"table":"users","name":"users_pkey","type":"p","definition":"PRIMARY KEY (id)"},{"table":"users","name":"users_username_format","type":"c","definition":"CHECK (username = lower(username) AND username ~ ''^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$''::text)"},{"table":"audit_logs","name":"audit_logs_actor_user_id_fkey","type":"f","definition":"FOREIGN KEY (actor_user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL"},{"table":"audit_logs","name":"audit_logs_tenant_id_fkey","type":"f","definition":"FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON UPDATE CASCADE ON DELETE RESTRICT"},{"table":"catalog_products","name":"catalog_products_tenant_id_fkey","type":"f","definition":"FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT"},{"table":"customers","name":"customers_created_by_fkey","type":"f","definition":"FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL"},{"table":"customers","name":"customers_tenant_id_fkey","type":"f","definition":"FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT"},{"table":"customers","name":"customers_updated_by_fkey","type":"f","definition":"FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL"},{"table":"order_items","name":"order_items_order_tenant_fk","type":"f","definition":"FOREIGN KEY (tenant_id, order_id) REFERENCES orders(tenant_id, id) ON DELETE RESTRICT"},{"table":"order_items","name":"order_items_tenant_id_catalog_product_id_fkey","type":"f","definition":"FOREIGN KEY (tenant_id, catalog_product_id) REFERENCES catalog_products(tenant_id, id) ON UPDATE CASCADE ON DELETE RESTRICT"},{"table":"order_save_receipts","name":"order_save_receipts_tenant_id_fkey","type":"f","definition":"FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT"},{"table":"orders","name":"orders_completed_by_fkey","type":"f","definition":"FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL"},{"table":"orders","name":"orders_customer_tenant_fk","type":"f","definition":"FOREIGN KEY (tenant_id, customer_id) REFERENCES customers(tenant_id, id) ON DELETE RESTRICT"},{"table":"orders","name":"orders_responsible_tenant_fk","type":"f","definition":"FOREIGN KEY (tenant_id, responsible_id) REFERENCES responsibles(tenant_id, id) ON DELETE RESTRICT"},{"table":"orders","name":"orders_tenant_id_fkey","type":"f","definition":"FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT"},{"table":"responsibles","name":"responsibles_tenant_id_fkey","type":"f","definition":"FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT"},{"table":"tenant_management_credentials","name":"tenant_management_credentials_tenant_id_fkey","type":"f","definition":"FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT"},{"table":"tenant_management_credentials","name":"tenant_management_credentials_updated_by_fkey","type":"f","definition":"FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL"},{"table":"tenant_management_sessions","name":"tenant_management_sessions_tenant_id_fkey","type":"f","definition":"FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE"},{"table":"tenant_management_sessions","name":"tenant_management_sessions_user_id_fkey","type":"f","definition":"FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"},{"table":"tenant_memberships","name":"tenant_memberships_tenant_id_fkey","type":"f","definition":"FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT"},{"table":"tenant_memberships","name":"tenant_memberships_user_id_fkey","type":"f","definition":"FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT"},{"table":"tenant_settings","name":"tenant_settings_tenant_id_fkey","type":"f","definition":"FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON UPDATE CASCADE ON DELETE CASCADE"},{"table":"users","name":"users_id_fkey","type":"f","definition":"FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE"}]'::jsonb) LOOP
 target_table:=('public.'||(target->>'table'))::regclass;
 SELECT conname,pg_get_constraintdef(oid,true) INTO existing_name,existing_definition FROM pg_constraint WHERE conrelid=target_table AND conname=target->>'name';
 IF existing_name IS NOT NULL AND existing_definition=target->>'definition' THEN CONTINUE; END IF;
 IF existing_name IS NOT NULL AND (target->>'type'<>'f' OR regexp_replace(existing_definition,' ON UPDATE CASCADE','','g')<>target->>'definition') THEN RAISE EXCEPTION 'Unexpected constraint definition: %.%',target->>'table',existing_name; END IF;
 IF existing_name IS NULL THEN
   SELECT conname,pg_get_constraintdef(oid,true) INTO existing_name,existing_definition FROM pg_constraint WHERE conrelid=target_table AND contype::text=target->>'type' AND (pg_get_constraintdef(oid,true)=target->>'definition' OR (contype='f' AND regexp_replace(pg_get_constraintdef(oid,true),' ON UPDATE CASCADE','','g')=target->>'definition')) ORDER BY conname LIMIT 1;
 END IF;
 IF existing_name IS NOT NULL THEN
   IF existing_definition=target->>'definition' THEN
     EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I',target_table,existing_name,target->>'name');
     CONTINUE;
   END IF;
   -- Exact known FK only, kept inside the same transaction as its replacement.
   EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',target_table,existing_name);
 END IF;
 matching_index:=NULL;
 IF target->>'type'='u' THEN
   SELECT ci.relname INTO matching_index FROM pg_index i JOIN pg_class ci ON ci.oid=i.indexrelid WHERE i.indrelid=target_table AND i.indisunique AND NOT i.indisprimary AND i.indpred IS NULL AND i.indexprs IS NULL AND NOT EXISTS(SELECT 1 FROM pg_constraint c WHERE c.conindid=i.indexrelid AND c.contype IN ('p','u','x')) AND pg_get_indexdef(i.indexrelid) LIKE '% '||substring(target->>'definition' from 8) ORDER BY ci.relname LIMIT 1;
 END IF;
 IF matching_index IS NOT NULL THEN EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I UNIQUE USING INDEX %I',target_table,target->>'name',matching_index);
 ELSE EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s',target_table,target->>'name',target->>'definition'); END IF;
 END LOOP;
END $om_reconcile$;
ALTER TABLE "public"."audit_logs" ALTER COLUMN "occurred_at" TYPE timestamp with time zone;
ALTER TABLE "public"."audit_logs" ALTER COLUMN "occurred_at" SET DEFAULT now();
ALTER TABLE "public"."catalog_products" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."catalog_products" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."catalog_products" ALTER COLUMN "updated_at" TYPE timestamp with time zone;
ALTER TABLE "public"."catalog_products" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "public"."catalog_products" ALTER COLUMN "deleted_at" TYPE timestamp with time zone;
ALTER TABLE "public"."customers" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."customers" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."customers" ALTER COLUMN "updated_at" TYPE timestamp with time zone;
ALTER TABLE "public"."customers" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "public"."order_items" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."order_items" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."order_items" ALTER COLUMN "updated_at" TYPE timestamp with time zone;
ALTER TABLE "public"."order_items" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "public"."order_items" ALTER COLUMN "deleted_at" TYPE timestamp with time zone;
ALTER TABLE "public"."order_save_receipts" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."order_save_receipts" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."orders" ALTER COLUMN "delivery_time" TYPE time without time zone;
ALTER TABLE "public"."orders" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."orders" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."orders" ALTER COLUMN "updated_at" TYPE timestamp with time zone;
ALTER TABLE "public"."orders" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "public"."orders" ALTER COLUMN "deleted_at" TYPE timestamp with time zone;
ALTER TABLE "public"."orders" ALTER COLUMN "completed_at" TYPE timestamp with time zone;
ALTER TABLE "public"."responsibles" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."responsibles" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."responsibles" ALTER COLUMN "updated_at" TYPE timestamp with time zone;
ALTER TABLE "public"."responsibles" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "public"."responsibles" ALTER COLUMN "deleted_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenant_management_credentials" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenant_management_credentials" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."tenant_management_credentials" ALTER COLUMN "updated_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenant_management_credentials" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "public"."tenant_management_sessions" ALTER COLUMN "unlocked_until" TYPE timestamp with time zone;
ALTER TABLE "public"."tenant_management_sessions" ALTER COLUMN "locked_until" TYPE timestamp with time zone;
ALTER TABLE "public"."tenant_management_sessions" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenant_management_sessions" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."tenant_management_sessions" ALTER COLUMN "updated_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenant_management_sessions" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "public"."tenant_memberships" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenant_memberships" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."tenant_memberships" ALTER COLUMN "updated_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenant_memberships" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "public"."tenant_memberships" ALTER COLUMN "revoked_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenant_settings" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenant_settings" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."tenant_settings" ALTER COLUMN "updated_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenants" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenants" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."tenants" ALTER COLUMN "updated_at" TYPE timestamp with time zone;
ALTER TABLE "public"."tenants" ALTER COLUMN "updated_at" SET DEFAULT now();
ALTER TABLE "public"."users" ALTER COLUMN "created_at" TYPE timestamp with time zone;
ALTER TABLE "public"."users" ALTER COLUMN "created_at" SET DEFAULT now();
ALTER TABLE "public"."users" ALTER COLUMN "updated_at" TYPE timestamp with time zone;
ALTER TABLE "public"."users" ALTER COLUMN "updated_at" SET DEFAULT now();
CREATE OR REPLACE FUNCTION app_security.can_access_tenant(target_tenant uuid, allowed_roles "MembershipRole"[] DEFAULT NULL::"MembershipRole"[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
  SELECT app_security.current_tenant_id() = target_tenant
    AND app_security.has_active_membership(target_tenant, allowed_roles)
$function$
;
CREATE OR REPLACE FUNCTION app_security.current_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
$function$
;
CREATE OR REPLACE FUNCTION app_security.current_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('app.current_user_id', true), '')
  )::uuid
$function$
;
CREATE OR REPLACE FUNCTION app_security.has_active_membership(target_tenant uuid, allowed_roles "MembershipRole"[] DEFAULT NULL::"MembershipRole"[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION app_security.has_visible_membership(target_tenant uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_memberships membership
    WHERE membership.tenant_id = target_tenant
      AND membership.user_id = app_security.current_user_id()
      AND membership.status IN ('ACTIVE', 'INVITED', 'SUSPENDED')
  )
$function$
;
CREATE OR REPLACE FUNCTION app_security.is_tenant_creator(target_tenant uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants tenant
    WHERE tenant.id = target_tenant
      AND tenant.created_by = app_security.current_user_id()
  )
$function$
;
CREATE OR REPLACE FUNCTION public.enforce_membership_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.reserve_order_number(target_tenant uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.sync_auth_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  normalized_username text;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  normalized_username := btrim(
    lower(
      regexp_replace(
        coalesce(
          nullif(new.raw_user_meta_data ->> 'username', ''),
          split_part(new.email, '@', 1),
          'user-' || left(new.id::text, 8)
        ),
        '[^a-zA-Z0-9._-]+',
        '-',
        'g'
      )
    ),
    '._-'
  );

  if length(normalized_username) not between 3 and 32
    or normalized_username !~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$'
  then
    normalized_username := 'user-' || left(new.id::text, 8);
  end if;

  insert into public.users (id, display_name, username, status, created_at, updated_at)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      normalized_username,
      'Utilizador'
    ),
    normalized_username,
    'ACTIVE',
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    username = excluded.username,
    status = 'ACTIVE',
    updated_at = now();
  return new;
end
$function$
;
CREATE OR REPLACE FUNCTION public.upsert_invited_user_profile(target_user uuid, target_email text, target_display_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.validate_order_delivery_not_past()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
declare local_now timestamp := timezone('Europe/Lisbon', clock_timestamp());
begin
  -- Editing the non-schedule fields of a legacy order is allowed.
  if tg_op = 'UPDATE' then
    if new.delivery_date is not distinct from old.delivery_date
      and new.delivery_time is not distinct from old.delivery_time then
      return new;
    end if;
  end if;
  if new.delivery_time < time '08:00' or new.delivery_time > time '21:00'
    or extract(second from new.delivery_time) <> 0 then
    raise exception 'A entrega deve ser agendada entre 08:00 e 21:00, em minutos inteiros.'
      using errcode = '23514';
  end if;
  if new.delivery_date < local_now::date
    or (new.delivery_date = local_now::date
      and new.delivery_time < date_trunc('minute', local_now)::time) then
    raise exception 'A data e a hora de entrega não podem ser anteriores ao momento atual.'
      using errcode = '23514';
  end if;
  return new;
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_active_membership()
 RETURNS SETOF web_membership_context
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
  select
    membership.tenant_id,
    tenant.name,
    tenant.slug,
    membership.user_id,
    profile.display_name,
    profile.username,
    membership.role
  from public.tenant_memberships membership
  join public.tenants tenant on tenant.id = membership.tenant_id
  join public.users profile on profile.id = membership.user_id
  where membership.user_id = auth.uid()
    and membership.status = 'ACTIVE'
    and membership.is_default = true
    and tenant.status = 'ACTIVE'
    and profile.status = 'ACTIVE'
  limit 1
$function$
;
CREATE OR REPLACE FUNCTION public.web_complete_order(p_order_id uuid, p_version integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$ begin perform public.web_remove_order(p_order_id, p_version); end $function$
;
CREATE OR REPLACE FUNCTION public.web_current_session_id()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  current_session_id text;
begin
  current_session_id := nullif(auth.jwt() ->> 'session_id', '');
  if current_session_id is null then
    raise exception 'valid authenticated session required' using errcode = '42501';
  end if;
  return current_session_id;
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_delete_catalog_product(p_product_id uuid, p_version integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare membership public.web_membership_context;
begin
  membership := public.web_require_management_access();
  update public.catalog_products
  set
    deleted_at = now(),
    deleted_by = membership.user_id,
    updated_at = now(),
    updated_by = membership.user_id,
    version = version + 1
  where id = p_product_id
    and tenant_id = membership.tenant_id
    and deleted_at is null
    and version = p_version;
  if not found then
    raise exception 'catalog product was not found or changed' using errcode = '40001';
  end if;
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_delete_order(p_order_id uuid, p_version integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$ begin perform public.web_remove_order(p_order_id, p_version); end $function$
;
CREATE OR REPLACE FUNCTION public.web_delete_responsible(p_responsible_id uuid, p_version integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare membership public.web_membership_context;
begin
  membership := public.web_require_management_access();
  update public.responsibles
  set
    deleted_at = now(),
    deleted_by = membership.user_id,
    updated_at = now(),
    updated_by = membership.user_id,
    version = version + 1
  where id = p_responsible_id
    and tenant_id = membership.tenant_id
    and deleted_at is null
    and version = p_version;
  if not found then
    raise exception 'responsible was not found or changed' using errcode = '40001';
  end if;
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_initialize_management_password(p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  membership public.web_membership_context;
  current_session_id text;
  inserted_count integer;
begin
  membership := public.web_require_owner();
  current_session_id := public.web_current_session_id();

  if length(coalesce(p_password, '')) < 12 or length(p_password) > 128 then
    return jsonb_build_object(
      'configured', false,
      'unlocked', false,
      'unlockedUntil', null,
      'error', 'A senha de gerenciamento deve ter entre 12 e 128 caracteres.'
    );
  end if;

  insert into public.tenant_management_credentials (
    tenant_id,
    password_hash,
    created_at,
    updated_at,
    updated_by
  )
  values (
    membership.tenant_id,
    extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
    now(),
    now(),
    membership.user_id
  )
  on conflict (tenant_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count <> 1 then
    return jsonb_build_object(
      'configured', true,
      'unlocked', false,
      'unlockedUntil', null,
      'error', 'A senha gerencial já foi configurada.'
    );
  end if;

  insert into public.tenant_management_sessions (
    tenant_id,
    user_id,
    session_id,
    unlocked_until,
    failed_attempts,
    locked_until,
    created_at,
    updated_at
  )
  values (
    membership.tenant_id,
    membership.user_id,
    current_session_id,
    now() + interval '15 minutes',
    0,
    null,
    now(),
    now()
  )
  on conflict (tenant_id, user_id, session_id) do update set
    unlocked_until = excluded.unlocked_until,
    failed_attempts = 0,
    locked_until = null,
    updated_at = now();

  return public.web_management_status();
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_list_catalog_products()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
  with membership as (select * from public.web_require_membership())
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', product.id,
        'category', product.category::text,
        'name', product.name,
        'version', product.version
      ) order by product.category, product.position, product.name
    ),
    '[]'::jsonb
  )
  from public.catalog_products product, membership
  where product.tenant_id = membership.tenant_id
    and product.deleted_at is null
    and product.is_active = true
$function$
;
CREATE OR REPLACE FUNCTION public.web_list_orders(p_from date DEFAULT NULL::date, p_until date DEFAULT NULL::date, p_category text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_page integer DEFAULT 1, p_page_size integer DEFAULT 25)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
  with
  membership as (
    select * from public.web_require_membership()
  ),
  search_terms as (
    select lower(term) as term
    from regexp_split_to_table(trim(coalesce(p_search, '')), '\s+') as term
    where term <> ''
  ),
  filtered as materialized (
    select order_row.*
    from public.orders order_row
    cross join membership
    where order_row.tenant_id = membership.tenant_id
      and order_row.deleted_at is null
      and order_row.completed_at is null
      and (p_from is null or order_row.delivery_date >= p_from)
      and (p_until is null or order_row.delivery_date <= p_until)
      and (
        not exists (select 1 from search_terms)
        or not exists (
          select 1
          from search_terms search_term
          where not (
            lower(order_row.client_name) like '%' || search_term.term || '%'
            or lower(coalesce(order_row.phone, '')) like '%' || search_term.term || '%'
            or exists (
              select 1
              from public.responsibles responsible
              where responsible.id = order_row.responsible_id
                and responsible.tenant_id = membership.tenant_id
                and responsible.deleted_at is null
                and lower(responsible.name) like '%' || search_term.term || '%'
            )
            or exists (
              select 1
              from public.order_items item
              where item.order_id = order_row.id
                and item.tenant_id = membership.tenant_id
                and item.deleted_at is null
                and (
                  lower(item.product_name) like '%' || search_term.term || '%'
                  or lower(coalesce(item.notes, '')) like '%' || search_term.term || '%'
                  or lower(item.category::text) like '%' || search_term.term || '%'
                )
            )
          )
        )
      )
      and (
        p_category is null
        or exists (
          select 1
          from public.order_items item
          where item.order_id = order_row.id
            and item.tenant_id = membership.tenant_id
            and item.deleted_at is null
            and item.category::text = upper(p_category)
        )
      )
  ),
  paged as (
    select *
    from filtered
    order by delivery_date, delivery_time, order_number
    offset (greatest(coalesce(p_page, 1), 1) - 1)
      * least(greatest(coalesce(p_page_size, 25), 1), 100)
    limit least(greatest(coalesce(p_page_size, 25), 1), 100)
  )
  select jsonb_build_object(
    'items',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', order_row.id,
          'orderNumber', order_row.order_number,
          'clientName', order_row.client_name,
          'customerId', order_row.customer_id,
          'customerVersion', (select customer.version from public.customers customer
            where customer.tenant_id = order_row.tenant_id and customer.id = order_row.customer_id),
          'phone', order_row.phone,
          'responsibleId', order_row.responsible_id,
          'responsibleName', (
            select responsible.name
            from public.responsibles responsible
            where responsible.id = order_row.responsible_id
              and responsible.tenant_id = membership.tenant_id
          ),
          'deliveryDate', order_row.delivery_date,
          'deliveryTime', order_row.delivery_time,
          'version', order_row.version,
          'createdAt', order_row.created_at,
          'items',
          coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', item.id,
                'category', item.category::text,
                'productName', item.product_name,
                'quantityValue', item.quantity_value,
                'quantityUnit', item.quantity_unit::text,
                'notes', item.notes,
                'position', item.position
              )
              order by item.position
            )
            from public.order_items item
            where item.tenant_id = membership.tenant_id
              and item.order_id = order_row.id
              and item.deleted_at is null
          ), '[]'::jsonb)
        )
        order by order_row.delivery_date, order_row.delivery_time, order_row.order_number
      )
      from paged order_row
      cross join membership
    ), '[]'::jsonb),
    'page', greatest(coalesce(p_page, 1), 1),
    'pageSize', least(greatest(coalesce(p_page_size, 25), 1), 100),
    'total', (select count(*) from filtered)
  )
$function$
;
CREATE OR REPLACE FUNCTION public.web_list_responsibles()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
  with membership as (select * from public.web_require_membership())
  select coalesce(
    jsonb_agg(
      jsonb_build_object('id', responsible.id, 'name', responsible.name, 'version', responsible.version)
      order by responsible.position, responsible.name
    ),
    '[]'::jsonb
  )
  from public.responsibles responsible, membership
  where responsible.tenant_id = membership.tenant_id
    and responsible.deleted_at is null
    and responsible.is_active = true
$function$
;
CREATE OR REPLACE FUNCTION public.web_lock_management()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  membership public.web_membership_context;
  current_session_id text;
begin
  membership := public.web_require_membership();
  current_session_id := public.web_current_session_id();

  delete from public.tenant_management_sessions
  where tenant_id = membership.tenant_id
    and user_id = membership.user_id
    and session_id = current_session_id;
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_management_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  membership public.web_membership_context;
  current_session_id text;
  is_configured boolean;
  access_until timestamptz;
begin
  membership := public.web_require_membership();
  current_session_id := public.web_current_session_id();

  select exists (
    select 1
    from public.tenant_management_credentials credential
    where credential.tenant_id = membership.tenant_id
  ) into is_configured;

  select management_session.unlocked_until
  into access_until
  from public.tenant_management_sessions management_session
  where management_session.tenant_id = membership.tenant_id
    and management_session.user_id = membership.user_id
    and management_session.session_id = current_session_id
    and management_session.unlocked_until > now();

  return jsonb_build_object(
    'configured', is_configured,
    'unlocked', access_until is not null,
    'unlockedUntil', access_until
  );
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_normalize_label(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$ select lower(regexp_replace(btrim(p_value), '[[:space:]]+', ' ', 'g')) $function$
;
CREATE OR REPLACE FUNCTION public.web_normalize_phone(p_value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE STRICT
 SET search_path TO 'pg_catalog', 'pg_temp'
AS $function$
  select case when length(digits.value) = 9 then '351' || digits.value else digits.value end
  from (select regexp_replace(p_value, '[^0-9]', '', 'g') as value) digits
$function$
;
CREATE OR REPLACE FUNCTION public.web_remove_order(p_order_id uuid, p_version integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
declare membership public.web_membership_context;
begin
  membership := public.web_require_membership();
  perform 1 from public.orders
    where id = p_order_id and tenant_id = membership.tenant_id
      and version = p_version and deleted_at is null and completed_at is null
    for update;
  if not found then
    raise exception 'A encomenda não foi encontrada ou foi alterada por outro utilizador.' using errcode = '40001';
  end if;
  delete from public.order_items where tenant_id = membership.tenant_id and order_id = p_order_id;
  delete from public.orders where tenant_id = membership.tenant_id and id = p_order_id and version = p_version;
  if not found then
    raise exception 'A encomenda foi alterada por outro utilizador.' using errcode = '40001';
  end if;
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_require_management_access()
 RETURNS web_membership_context
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  membership public.web_membership_context;
  current_session_id text;
begin
  membership := public.web_require_owner();
  current_session_id := public.web_current_session_id();

  if not exists (
    select 1
    from public.tenant_management_sessions management_session
    where management_session.tenant_id = membership.tenant_id
      and management_session.user_id = membership.user_id
      and management_session.session_id = current_session_id
      and management_session.unlocked_until > now()
  ) then
    raise exception 'management password required' using errcode = '42501';
  end if;

  return membership;
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_require_membership()
 RETURNS web_membership_context
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  membership public.web_membership_context;
begin
  select * into membership from public.web_active_membership();
  if membership.tenant_id is null then
    raise exception 'active company membership required' using errcode = '42501';
  end if;
  return membership;
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_require_owner()
 RETURNS web_membership_context
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  membership public.web_membership_context;
begin
  membership := public.web_require_membership();
  if membership.role <> 'OWNER' then
    raise exception 'OWNER role required' using errcode = '42501';
  end if;
  return membership;
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_save_catalog_product(p_product jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  membership public.web_membership_context;
  item public.catalog_products;
  requested_id uuid := nullif(p_product->>'id', '')::uuid;
begin
  membership := public.web_require_management_access();

  if length(trim(coalesce(p_product->>'name', ''))) = 0 then
    raise exception 'catalog product name is required' using errcode = '23514';
  end if;

  if requested_id is null then
    insert into public.catalog_products (
      tenant_id,
      category,
      name,
      position,
      version,
      created_at,
      updated_at,
      created_by,
      updated_by
    )
    values (
      membership.tenant_id,
      upper(p_product->>'category')::public."ProductCategory",
      trim(p_product->>'name'),
      0,
      1,
      now(),
      now(),
      membership.user_id,
      membership.user_id
    )
    returning * into item;
  else
    update public.catalog_products
    set
      category = upper(p_product->>'category')::public."ProductCategory",
      name = trim(p_product->>'name'),
      version = version + 1,
      updated_at = now(),
      updated_by = membership.user_id
    where id = requested_id
      and tenant_id = membership.tenant_id
      and deleted_at is null
      and version = (p_product->>'version')::integer
    returning * into item;

    if item.id is null then
      raise exception 'catalog product was not found or changed' using errcode = '40001';
    end if;
  end if;

  return jsonb_build_object(
    'id', item.id,
    'category', item.category::text,
    'name', item.name,
    'version', item.version
  );
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_save_order(p_order jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
declare
  membership public.web_membership_context;
  saved_order public.orders;
  chosen_customer public.customers;
  catalog_row public.catalog_products;
  item jsonb;
  item_position integer := 0;
  requested_id uuid := nullif(p_order->>'id', '')::uuid;
  requested_version integer := nullif(p_order->>'version', '')::integer;
  requested_customer_id uuid := nullif(p_order->>'customerId', '')::uuid;
  requested_customer_version integer := nullif(p_order->>'customerVersion', '')::integer;
  -- The deployed frontend predates requestId. Keep its saves working until the
  -- matching frontend is published; new clients provide a stable retry key.
  requested_request_id uuid := coalesce(nullif(p_order->>'requestId', '')::uuid, gen_random_uuid());
  request_hash text := md5(p_order::text);
  previous_receipt public.order_save_receipts;
  clean_name text := regexp_replace(btrim(coalesce(p_order->>'clientName', '')), '[[:space:]]+', ' ', 'g');
  clean_phone text := public.web_normalize_phone(coalesce(p_order->>'phone', ''));
  requested_delivery_date date := nullif(p_order->>'deliveryDate', '')::date;
  requested_delivery_time time := nullif(p_order->>'deliveryTime', '')::time;
  requested_responsible_id uuid := nullif(p_order->>'responsibleId', '')::uuid;
  item_category public."ProductCategory";
  item_name text;
  item_quantity numeric;
  item_unit public."QuantityUnit";
  original_order_name text;
  original_order_phone text;
  original_order_customer_id uuid;
begin
  membership := public.web_require_membership();
  -- Serialize requests sharing a retry key before any data or number changes.
  perform pg_advisory_xact_lock(hashtextextended(membership.tenant_id::text || ':' || requested_request_id::text, 0));
  select * into previous_receipt from public.order_save_receipts receipt
    where receipt.tenant_id = membership.tenant_id and receipt.request_id = requested_request_id;
  if found then
    if previous_receipt.payload_hash <> request_hash then
      raise exception 'Esta tentativa de gravação foi alterada. Reabra a encomenda.' using errcode = '40001';
    end if;
    if not exists (select 1 from public.orders
      where tenant_id = membership.tenant_id and id = previous_receipt.order_id
        and version = previous_receipt.order_version and deleted_at is null and completed_at is null) then
      raise exception 'A encomenda mudou depois desta gravação. Recarregue os dados.' using errcode = '40001';
    end if;
    return jsonb_build_object('id', previous_receipt.order_id, 'version', previous_receipt.order_version);
  end if;
  if length(clean_name) not between 2 and 160 or clean_phone !~ '^[0-9]{9,15}$' then
    raise exception 'Indique nome e telefone válidos para o cliente.' using errcode = '23514';
  end if;
  if requested_delivery_date is null or requested_delivery_time is null then
    raise exception 'Indique a data e a hora de entrega.' using errcode = '23514';
  end if;
  if coalesce(p_order->>'deliveryDate', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or coalesce(p_order->>'deliveryTime', '') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'Use data AAAA-MM-DD e hora HH:mm para a entrega.' using errcode = '23514';
  end if;
  if requested_responsible_id is null or not exists (
    select 1 from public.responsibles where tenant_id = membership.tenant_id
      and id = requested_responsible_id and is_active and deleted_at is null
  ) then
    raise exception 'Escolha um responsável ativo da sua empresa.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_order->'items') is distinct from 'array' then
    raise exception 'Adicione entre 1 e 100 produtos.' using errcode = '23514';
  end if;
  if jsonb_array_length(p_order->'items') not between 1 and 100 then
    raise exception 'Adicione entre 1 e 100 produtos.' using errcode = '23514';
  end if;

  if requested_id is null then
    update public.tenants set next_order_number = next_order_number + 1,
      updated_at = now(), updated_by = membership.user_id
    where id = membership.tenant_id
    returning next_order_number - 1 into saved_order.order_number;
    insert into public.orders (
      tenant_id, order_number, client_name, phone, responsible_id, delivery_date,
      delivery_time, version, created_by, updated_by
    ) values (
      membership.tenant_id, saved_order.order_number, clean_name, clean_phone,
      requested_responsible_id, requested_delivery_date, requested_delivery_time,
      1, membership.user_id, membership.user_id
    ) returning * into saved_order;
  else
    select client_name, phone, customer_id
      into original_order_name, original_order_phone, original_order_customer_id
      from public.orders where id = requested_id and tenant_id = membership.tenant_id
        and deleted_at is null and completed_at is null and version = requested_version
      for update;
    if not found then
      raise exception 'A encomenda foi alterada ou concluída por outro utilizador.' using errcode = '40001';
    end if;
    update public.orders set
      client_name = clean_name, phone = clean_phone,
      responsible_id = requested_responsible_id,
      delivery_date = requested_delivery_date, delivery_time = requested_delivery_time,
      version = version + 1, updated_at = now(), updated_by = membership.user_id
    where id = requested_id and tenant_id = membership.tenant_id
      and deleted_at is null and completed_at is null and version = requested_version
    returning * into saved_order;
    if saved_order.id is null then
      raise exception 'A encomenda foi alterada ou concluída por outro utilizador.' using errcode = '40001';
    end if;
    -- No hidden item history remains after an edit.
    delete from public.order_items where tenant_id = membership.tenant_id and order_id = saved_order.id;
  end if;

  if requested_customer_id is not null then
    select * into chosen_customer from public.customers
      where tenant_id = membership.tenant_id and id = requested_customer_id for update;
    if chosen_customer.id is null then
      raise exception 'O cliente selecionado não pertence a esta empresa.' using errcode = '23514';
    end if;
    if coalesce((p_order->>'updateCustomer')::boolean, false) then
      if chosen_customer.version is distinct from requested_customer_version then
        raise exception 'Este cliente foi alterado por outro utilizador. Reabra a encomenda.'
          using errcode = '40001';
      end if;
      if exists (select 1 from public.customers
        where tenant_id = membership.tenant_id and id <> requested_customer_id
          and normalized_name = public.web_normalize_label(clean_name) and phone = clean_phone) then
        raise exception 'Já existe outro cliente com este nome e telefone. Selecione-o ou use Trocar cliente.'
          using errcode = '23505';
      end if;
      begin
        update public.customers set name = clean_name, phone = clean_phone,
          version = version + 1, updated_at = now(), updated_by = membership.user_id
        where tenant_id = membership.tenant_id and id = requested_customer_id
        returning * into chosen_customer;
      exception when unique_violation then
        raise exception 'Já existe outro cliente com este nome e telefone. Selecione-o ou use Trocar cliente.'
          using errcode = '23505';
      end;
    elsif (public.web_normalize_label(chosen_customer.name) <> public.web_normalize_label(clean_name)
      or chosen_customer.phone <> clean_phone)
      and not (requested_id is not null
        and coalesce(original_order_customer_id = requested_customer_id, false)
        and public.web_normalize_label(original_order_name) = public.web_normalize_label(clean_name)
        and original_order_phone = clean_phone) then
      raise exception 'Os dados deste cliente mudaram. Selecione-o novamente antes de guardar.'
        using errcode = '40001';
    end if;
  else
    insert into public.customers (tenant_id, name, phone, created_by, updated_by)
    values (membership.tenant_id, clean_name, clean_phone, membership.user_id, membership.user_id)
    on conflict (tenant_id, normalized_name, phone) do nothing
    returning * into chosen_customer;
    if chosen_customer.id is null then
      select * into chosen_customer from public.customers
      where tenant_id = membership.tenant_id
        and normalized_name = public.web_normalize_label(clean_name) and phone = clean_phone;
    end if;
  end if;
  update public.orders set customer_id = chosen_customer.id
    where tenant_id = membership.tenant_id and id = saved_order.id;

  for item in select * from jsonb_array_elements(p_order->'items') loop
    item_name := regexp_replace(btrim(coalesce(item->>'productName', '')), '[[:space:]]+', ' ', 'g');
    if length(item_name) not between 1 and 160 then
      raise exception 'Indique um nome de produto com até 160 caracteres.' using errcode = '23514';
    end if;
    item_category := upper(item->>'category')::public."ProductCategory";
    item_quantity := (item->>'quantityValue')::numeric;
    item_unit := upper(item->>'quantityUnit')::public."QuantityUnit";
    if item_quantity is null or item_quantity < 1 or item_quantity > 1000
      or length(coalesce(item->>'notes', '')) > 1000 then
      raise exception 'Quantidade ou observação inválida.' using errcode = '23514';
    end if;
    insert into public.catalog_products (
      tenant_id, category, name, created_by, updated_by
    ) values (membership.tenant_id, item_category, item_name, membership.user_id, membership.user_id)
    on conflict do nothing returning * into catalog_row;
    if catalog_row.id is null then
      select * into catalog_row from public.catalog_products
      where tenant_id = membership.tenant_id and category = item_category
        and public.web_normalize_label(name) = public.web_normalize_label(item_name);
      if catalog_row.id is null or not catalog_row.is_active or catalog_row.deleted_at is not null then
        raise exception 'O produto "%" está desativado no catálogo. Contacte o gestor.', item_name
          using errcode = '23514';
      end if;
    end if;
    catalog_row := null;
    insert into public.order_items (
      tenant_id, order_id, category, product_name, quantity_value, quantity_unit,
      notes, position, created_by, updated_by
    ) values (
      membership.tenant_id, saved_order.id, item_category, item_name,
      item_quantity, item_unit, nullif(item->>'notes', ''), item_position,
      membership.user_id, membership.user_id
    );
    item_position := item_position + 1;
  end loop;

  insert into public.order_save_receipts (tenant_id, request_id, order_id, order_version, payload_hash)
  values (membership.tenant_id, requested_request_id, saved_order.id, saved_order.version, request_hash);
  return jsonb_build_object('id', saved_order.id, 'version', saved_order.version);
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_save_order_with_responsible(p_order jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
declare
  membership public.web_membership_context;
  requested_responsible_id uuid := nullif(p_order->>'responsibleId', '')::uuid;
  clean_responsible_name text;
  chosen_responsible public.responsibles;
begin
  membership := public.web_require_membership();

  if requested_responsible_id is null then
    clean_responsible_name := initcap(lower(regexp_replace(
      btrim(coalesce(p_order->>'responsibleName', '')), '[[:space:]]+', ' ', 'g'
    )));
    if length(clean_responsible_name) not between 2 and 160
      or clean_responsible_name ~ '[[:cntrl:]]' then
      raise exception 'Indique um nome válido para o responsável.' using errcode = '23514';
    end if;

    insert into public.responsibles (
      tenant_id, name, position, created_by, updated_by
    ) values (
      membership.tenant_id, clean_responsible_name, 0,
      membership.user_id, membership.user_id
    )
    on conflict do nothing
    returning * into chosen_responsible;

    if chosen_responsible.id is null then
      select * into chosen_responsible from public.responsibles
      where tenant_id = membership.tenant_id
        and public.web_normalize_label(name) = public.web_normalize_label(clean_responsible_name)
        and deleted_at is null;
    end if;
    if chosen_responsible.id is null or not chosen_responsible.is_active then
      raise exception 'Este responsável está desativado. Ative-o em Gerenciar antes de guardar.'
        using errcode = '23514';
    end if;
    requested_responsible_id := chosen_responsible.id;
  end if;

  return public.web_save_order(
    p_order || jsonb_build_object('responsibleId', requested_responsible_id)
  );
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_save_responsible(p_responsible jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  membership public.web_membership_context;
  item public.responsibles;
  requested_id uuid := nullif(p_responsible->>'id', '')::uuid;
begin
  membership := public.web_require_management_access();
  if length(trim(coalesce(p_responsible->>'name', ''))) = 0 then
    raise exception 'responsible name is required' using errcode = '23514';
  end if;
  if requested_id is null then
    insert into public.responsibles (
      tenant_id, name, position, version, created_at, updated_at, created_by, updated_by
    )
    values (
      membership.tenant_id,
      trim(p_responsible->>'name'),
      0,
      1,
      now(),
      now(),
      membership.user_id,
      membership.user_id
    )
    returning * into item;
  else
    update public.responsibles
    set
      name = trim(p_responsible->>'name'),
      version = version + 1,
      updated_at = now(),
      updated_by = membership.user_id
    where id = requested_id
      and tenant_id = membership.tenant_id
      and deleted_at is null
      and version = (p_responsible->>'version')::integer
    returning * into item;
    if item.id is null then
      raise exception 'responsible was not found or changed' using errcode = '40001';
    end if;
  end if;
  return jsonb_build_object(
    'id', item.id,
    'name', item.name,
    'version', item.version
  );
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_search_customers(p_query text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
  with membership as (select * from public.web_require_membership()),
  term as (select public.web_normalize_label(coalesce(p_query, '')) as value)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', found.id, 'name', found.name, 'phone', found.phone, 'version', found.version
  ) order by found.name, found.phone), '[]'::jsonb)
  from (
    select customer.id, customer.name, customer.phone, customer.version
    from public.customers customer, membership, term
    where customer.tenant_id = membership.tenant_id
      and length(term.value) between 1 and 160
      and term.value !~ '[%_]'
      and customer.normalized_name like term.value || '%'
    order by customer.normalized_name, customer.phone
    limit 10
  ) found
$function$
;
CREATE OR REPLACE FUNCTION public.web_session_context()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  membership public.web_membership_context;
begin
  if auth.uid() is null then
    return null;
  end if;
  select * into membership from public.web_active_membership();
  if membership.tenant_id is null then
    return null;
  end if;
  return jsonb_build_object(
    'user', jsonb_build_object(
      'id', membership.user_id,
      'username', membership.username,
      'displayName', membership.display_name
    ),
    'tenant', jsonb_build_object(
      'id', membership.tenant_id,
      'name', membership.tenant_name,
      'slug', membership.tenant_slug
    ),
    'role', membership.role::text
  );
end
$function$
;
CREATE OR REPLACE FUNCTION public.web_unlock_management(p_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'app_security', 'public', 'auth', 'extensions'
AS $function$
declare
  membership public.web_membership_context;
  current_session_id text;
  stored_hash text;
  attempts integer;
  blocked_until timestamptz;
  next_attempts integer;
begin
  membership := public.web_require_owner();
  current_session_id := public.web_current_session_id();

  select credential.password_hash
  into stored_hash
  from public.tenant_management_credentials credential
  where credential.tenant_id = membership.tenant_id;

  if stored_hash is null then
    return jsonb_build_object(
      'configured', false,
      'unlocked', false,
      'unlockedUntil', null,
      'error', 'O acesso gerencial ainda não foi configurado.'
    );
  end if;

  insert into public.tenant_management_sessions (
    tenant_id,
    user_id,
    session_id,
    failed_attempts,
    created_at,
    updated_at
  )
  values (
    membership.tenant_id,
    membership.user_id,
    current_session_id,
    0,
    now(),
    now()
  )
  on conflict (tenant_id, user_id, session_id) do nothing;

  select management_session.failed_attempts, management_session.locked_until
  into attempts, blocked_until
  from public.tenant_management_sessions management_session
  where management_session.tenant_id = membership.tenant_id
    and management_session.user_id = membership.user_id
    and management_session.session_id = current_session_id
  for update;

  if blocked_until is not null and blocked_until > now() then
    return jsonb_build_object(
      'configured', true,
      'unlocked', false,
      'unlockedUntil', null,
      'error', 'Muitas tentativas incorretas. Aguarde 15 minutos e tente novamente.'
    );
  end if;

  if extensions.crypt(coalesce(p_password, ''), stored_hash) <> stored_hash then
    next_attempts := case when blocked_until is not null then 1 else attempts + 1 end;

    update public.tenant_management_sessions
    set
      failed_attempts = case when next_attempts >= 5 then 0 else next_attempts end,
      locked_until = case when next_attempts >= 5 then now() + interval '15 minutes' else null end,
      unlocked_until = null,
      updated_at = now()
    where tenant_id = membership.tenant_id
      and user_id = membership.user_id
      and session_id = current_session_id;

    return jsonb_build_object(
      'configured', true,
      'unlocked', false,
      'unlockedUntil', null,
      'error', case
        when next_attempts >= 5
          then 'Muitas tentativas incorretas. Aguarde 15 minutos e tente novamente.'
        else 'Senha de gerenciamento incorreta.'
      end
    );
  end if;

  update public.tenant_management_sessions
  set
    unlocked_until = now() + interval '15 minutes',
    failed_attempts = 0,
    locked_until = null,
    updated_at = now()
  where tenant_id = membership.tenant_id
    and user_id = membership.user_id
    and session_id = current_session_id;

  return public.web_management_status();
end
$function$
;
CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_occurred_at_idx ON public.audit_logs USING btree (actor_user_id, occurred_at);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_entity_type_entity_id_occurred_at_idx ON public.audit_logs USING btree (tenant_id, entity_type, entity_id, occurred_at);
CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_occurred_at_idx ON public.audit_logs USING btree (tenant_id, occurred_at);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_products_tenant_active_name_unique ON public.catalog_products USING btree (tenant_id, category, lower(name)) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS catalog_products_tenant_category_name_idx ON public.catalog_products USING btree (tenant_id, category, "position", name);
CREATE UNIQUE INDEX IF NOT EXISTS catalog_products_tenant_category_normalized_name_uq ON public.catalog_products USING btree (tenant_id, category, web_normalize_label(name));
CREATE INDEX IF NOT EXISTS catalog_products_tenant_id_category_position_name_idx ON public.catalog_products USING btree (tenant_id, category, "position", name);
CREATE INDEX IF NOT EXISTS customers_tenant_name_prefix_idx ON public.customers USING btree (tenant_id, normalized_name text_pattern_ops);
CREATE INDEX IF NOT EXISTS order_items_tenant_order_position_idx ON public.order_items USING btree (tenant_id, order_id, "position");
CREATE INDEX IF NOT EXISTS order_items_tenant_id_order_id_position_idx ON public.order_items USING btree (tenant_id, order_id, "position");
CREATE INDEX IF NOT EXISTS orders_tenant_completed_at_idx ON public.orders USING btree (tenant_id, completed_at) WHERE (completed_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS orders_tenant_delivery_idx ON public.orders USING btree (tenant_id, delivery_date, delivery_time);
CREATE INDEX IF NOT EXISTS orders_tenant_id_created_at_idx ON public.orders USING btree (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS orders_tenant_id_delivery_date_delivery_time_idx ON public.orders USING btree (tenant_id, delivery_date, delivery_time);
CREATE UNIQUE INDEX IF NOT EXISTS responsibles_tenant_active_name_unique ON public.responsibles USING btree (tenant_id, lower(name)) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS responsibles_tenant_normalized_name_uq ON public.responsibles USING btree (tenant_id, web_normalize_label(name)) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS responsibles_tenant_position_name_idx ON public.responsibles USING btree (tenant_id, "position", name);
CREATE INDEX IF NOT EXISTS responsibles_tenant_id_position_name_idx ON public.responsibles USING btree (tenant_id, "position", name);
CREATE INDEX IF NOT EXISTS tenant_management_sessions_expiry_idx ON public.tenant_management_sessions USING btree (unlocked_until);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_memberships_one_default_per_user ON public.tenant_memberships USING btree (user_id) WHERE (is_default AND (status = 'ACTIVE'::"MembershipStatus"));
CREATE INDEX IF NOT EXISTS tenant_memberships_user_status_idx ON public.tenant_memberships USING btree (user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS tenant_memberships_one_default_per_user_key ON public.tenant_memberships USING btree (user_id) WHERE ((is_default = true) AND (status = 'ACTIVE'::"MembershipStatus"));
CREATE INDEX IF NOT EXISTS tenant_memberships_tenant_id_status_role_idx ON public.tenant_memberships USING btree (tenant_id, status, role);
CREATE INDEX IF NOT EXISTS tenant_memberships_user_id_status_idx ON public.tenant_memberships USING btree (user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON public.users USING btree (lower(username));
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."audit_logs" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."audit_logs" TO service_role;
ALTER TABLE "public"."catalog_products" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."catalog_products" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."catalog_products" TO service_role;
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."customers" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."customers" TO service_role;
ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."order_items" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."order_items" TO service_role;
ALTER TABLE "public"."order_save_receipts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."order_save_receipts" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."order_save_receipts" TO service_role;
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."orders" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."orders" TO service_role;
ALTER TABLE "public"."responsibles" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."responsibles" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."responsibles" TO service_role;
ALTER TABLE "public"."tenant_management_credentials" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."tenant_management_credentials" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."tenant_management_credentials" TO service_role;
ALTER TABLE "public"."tenant_management_sessions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."tenant_management_sessions" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."tenant_management_sessions" TO service_role;
ALTER TABLE "public"."tenant_memberships" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."tenant_memberships" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."tenant_memberships" TO service_role;
ALTER TABLE "public"."tenant_settings" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."tenant_settings" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."tenant_settings" TO service_role;
ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."tenants" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."tenants" TO service_role;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "public"."users" FROM PUBLIC,anon,authenticated;
GRANT ALL ON TABLE "public"."users" TO service_role;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='audit_insert_actor') THEN CREATE POLICY "audit_insert_actor" ON "public"."audit_logs" AS PERMISSIVE FOR INSERT TO "order_manager_api" WITH CHECK ((app_security.can_access_tenant(tenant_id) AND (actor_user_id = app_security.current_user_id()))); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='audit_logs' AND policyname='audit_select_admin') THEN CREATE POLICY "audit_select_admin" ON "public"."audit_logs" AS PERMISSIVE FOR SELECT TO "order_manager_api" USING (app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalog_products' AND policyname='catalog_insert_admin') THEN CREATE POLICY "catalog_insert_admin" ON "public"."catalog_products" AS PERMISSIVE FOR INSERT TO "order_manager_api" WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalog_products' AND policyname='catalog_select') THEN CREATE POLICY "catalog_select" ON "public"."catalog_products" AS PERMISSIVE FOR SELECT TO "order_manager_api" USING (app_security.can_access_tenant(tenant_id)); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='catalog_products' AND policyname='catalog_update_admin') THEN CREATE POLICY "catalog_update_admin" ON "public"."catalog_products" AS PERMISSIVE FOR UPDATE TO "order_manager_api" USING (app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])) WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='order_items_insert') THEN CREATE POLICY "order_items_insert" ON "public"."order_items" AS PERMISSIVE FOR INSERT TO "order_manager_api" WITH CHECK (app_security.can_access_tenant(tenant_id)); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='order_items_select') THEN CREATE POLICY "order_items_select" ON "public"."order_items" AS PERMISSIVE FOR SELECT TO "order_manager_api" USING (app_security.can_access_tenant(tenant_id)); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='order_items_update') THEN CREATE POLICY "order_items_update" ON "public"."order_items" AS PERMISSIVE FOR UPDATE TO "order_manager_api" USING (app_security.can_access_tenant(tenant_id)) WITH CHECK (app_security.can_access_tenant(tenant_id)); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='orders_insert') THEN CREATE POLICY "orders_insert" ON "public"."orders" AS PERMISSIVE FOR INSERT TO "order_manager_api" WITH CHECK (app_security.can_access_tenant(tenant_id)); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='orders_select') THEN CREATE POLICY "orders_select" ON "public"."orders" AS PERMISSIVE FOR SELECT TO "order_manager_api" USING (app_security.can_access_tenant(tenant_id)); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='orders_update') THEN CREATE POLICY "orders_update" ON "public"."orders" AS PERMISSIVE FOR UPDATE TO "order_manager_api" USING (app_security.can_access_tenant(tenant_id)) WITH CHECK (app_security.can_access_tenant(tenant_id)); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='responsibles' AND policyname='responsibles_insert_admin') THEN CREATE POLICY "responsibles_insert_admin" ON "public"."responsibles" AS PERMISSIVE FOR INSERT TO "order_manager_api" WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='responsibles' AND policyname='responsibles_select') THEN CREATE POLICY "responsibles_select" ON "public"."responsibles" AS PERMISSIVE FOR SELECT TO "order_manager_api" USING (app_security.can_access_tenant(tenant_id)); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='responsibles' AND policyname='responsibles_update_admin') THEN CREATE POLICY "responsibles_update_admin" ON "public"."responsibles" AS PERMISSIVE FOR UPDATE TO "order_manager_api" USING (app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])) WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenant_memberships' AND policyname='memberships_insert_owner_or_admin') THEN CREATE POLICY "memberships_insert_owner_or_admin" ON "public"."tenant_memberships" AS PERMISSIVE FOR INSERT TO "order_manager_api" WITH CHECK ((((user_id = app_security.current_user_id()) AND (role = 'OWNER'::"MembershipRole") AND (status = 'ACTIVE'::"MembershipStatus") AND app_security.is_tenant_creator(tenant_id)) OR app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"]))); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenant_memberships' AND policyname='memberships_select_self_or_admin') THEN CREATE POLICY "memberships_select_self_or_admin" ON "public"."tenant_memberships" AS PERMISSIVE FOR SELECT TO "order_manager_api" USING (((user_id = app_security.current_user_id()) OR app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"]))); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenant_memberships' AND policyname='memberships_update_self_or_admin') THEN CREATE POLICY "memberships_update_self_or_admin" ON "public"."tenant_memberships" AS PERMISSIVE FOR UPDATE TO "order_manager_api" USING (((user_id = app_security.current_user_id()) OR app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"]))) WITH CHECK (((user_id = app_security.current_user_id()) OR app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"]))); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenant_settings' AND policyname='tenant_settings_insert_admin') THEN CREATE POLICY "tenant_settings_insert_admin" ON "public"."tenant_settings" AS PERMISSIVE FOR INSERT TO "order_manager_api" WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenant_settings' AND policyname='tenant_settings_select') THEN CREATE POLICY "tenant_settings_select" ON "public"."tenant_settings" AS PERMISSIVE FOR SELECT TO "order_manager_api" USING (app_security.can_access_tenant(tenant_id)); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenant_settings' AND policyname='tenant_settings_update_admin') THEN CREATE POLICY "tenant_settings_update_admin" ON "public"."tenant_settings" AS PERMISSIVE FOR UPDATE TO "order_manager_api" USING (app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])) WITH CHECK (app_security.can_access_tenant(tenant_id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_insert_self') THEN CREATE POLICY "tenants_insert_self" ON "public"."tenants" AS PERMISSIVE FOR INSERT TO "order_manager_api" WITH CHECK ((created_by = app_security.current_user_id())); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_select_membership') THEN CREATE POLICY "tenants_select_membership" ON "public"."tenants" AS PERMISSIVE FOR SELECT TO "order_manager_api" USING (((created_by = app_security.current_user_id()) OR app_security.has_visible_membership(id))); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenants_update_admin') THEN CREATE POLICY "tenants_update_admin" ON "public"."tenants" AS PERMISSIVE FOR UPDATE TO "order_manager_api" USING (app_security.can_access_tenant(id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])) WITH CHECK (app_security.can_access_tenant(id, ARRAY['OWNER'::"MembershipRole", 'ADMIN'::"MembershipRole"])); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_insert_self') THEN CREATE POLICY "users_insert_self" ON "public"."users" AS PERMISSIVE FOR INSERT TO "order_manager_api" WITH CHECK ((id = app_security.current_user_id())); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_select_self') THEN CREATE POLICY "users_select_self" ON "public"."users" AS PERMISSIVE FOR SELECT TO "order_manager_api" USING ((id = app_security.current_user_id())); END IF; END $om_policy$;
DO $om_policy$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='users_update_self') THEN CREATE POLICY "users_update_self" ON "public"."users" AS PERMISSIVE FOR UPDATE TO "order_manager_api" USING ((id = app_security.current_user_id())) WITH CHECK ((id = app_security.current_user_id())); END IF; END $om_policy$;
DO $om_trigger$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='auth.users'::regclass AND tgname='order_manager_sync_auth_user') THEN CREATE TRIGGER order_manager_sync_auth_user AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users FOR EACH ROW EXECUTE FUNCTION sync_auth_user_profile(); END IF; END $om_trigger$;
DO $om_trigger$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.orders'::regclass AND tgname='orders_delivery_not_past') THEN CREATE TRIGGER orders_delivery_not_past BEFORE INSERT OR UPDATE OF delivery_date, delivery_time ON orders FOR EACH ROW EXECUTE FUNCTION validate_order_delivery_not_past(); END IF; END $om_trigger$;
DO $om_trigger$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.tenant_memberships'::regclass AND tgname='tenant_memberships_enforce_change') THEN CREATE TRIGGER tenant_memberships_enforce_change BEFORE INSERT OR UPDATE ON tenant_memberships FOR EACH ROW EXECUTE FUNCTION enforce_membership_change(); END IF; END $om_trigger$;
GRANT USAGE ON SCHEMA public,auth,extensions TO authenticated,service_role;
GRANT USAGE ON SCHEMA public,app_security TO order_manager_api;
REVOKE ALL ON FUNCTION app_security.can_access_tenant(uuid,"MembershipRole"[]) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION app_security.can_access_tenant(uuid,"MembershipRole"[]) TO "order_manager_api";
REVOKE ALL ON FUNCTION app_security.current_tenant_id() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION app_security.current_tenant_id() TO "order_manager_api";
REVOKE ALL ON FUNCTION app_security.current_user_id() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION app_security.current_user_id() TO "order_manager_api";
REVOKE ALL ON FUNCTION app_security.has_active_membership(uuid,"MembershipRole"[]) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION app_security.has_active_membership(uuid,"MembershipRole"[]) TO "order_manager_api";
REVOKE ALL ON FUNCTION app_security.has_visible_membership(uuid) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION app_security.has_visible_membership(uuid) TO "order_manager_api";
REVOKE ALL ON FUNCTION app_security.is_tenant_creator(uuid) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION app_security.is_tenant_creator(uuid) TO "order_manager_api";
REVOKE ALL ON FUNCTION public.enforce_membership_change() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.enforce_membership_change() TO "service_role";
REVOKE ALL ON FUNCTION public.reserve_order_number(uuid) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.reserve_order_number(uuid) TO "service_role";
GRANT EXECUTE ON FUNCTION public.reserve_order_number(uuid) TO "order_manager_api";
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO "service_role";
REVOKE ALL ON FUNCTION public.sync_auth_user_profile() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.sync_auth_user_profile() TO "service_role";
REVOKE ALL ON FUNCTION public.upsert_invited_user_profile(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.upsert_invited_user_profile(uuid,text,text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.upsert_invited_user_profile(uuid,text,text) TO "order_manager_api";
REVOKE ALL ON FUNCTION public.validate_order_delivery_not_past() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.validate_order_delivery_not_past() TO "service_role";
REVOKE ALL ON FUNCTION public.web_active_membership() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_active_membership() TO "service_role";
REVOKE ALL ON FUNCTION public.web_complete_order(uuid,integer) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_complete_order(uuid,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_complete_order(uuid,integer) TO "authenticated";
REVOKE ALL ON FUNCTION public.web_current_session_id() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_current_session_id() TO "service_role";
REVOKE ALL ON FUNCTION public.web_delete_catalog_product(uuid,integer) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_delete_catalog_product(uuid,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_delete_catalog_product(uuid,integer) TO "authenticated";
REVOKE ALL ON FUNCTION public.web_delete_order(uuid,integer) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_delete_order(uuid,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_delete_order(uuid,integer) TO "authenticated";
REVOKE ALL ON FUNCTION public.web_delete_responsible(uuid,integer) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_delete_responsible(uuid,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_delete_responsible(uuid,integer) TO "authenticated";
REVOKE ALL ON FUNCTION public.web_initialize_management_password(text) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_initialize_management_password(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_initialize_management_password(text) TO "authenticated";
REVOKE ALL ON FUNCTION public.web_list_catalog_products() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_list_catalog_products() TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_list_catalog_products() TO "authenticated";
REVOKE ALL ON FUNCTION public.web_list_orders(date,date,text,text,integer,integer) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_list_orders(date,date,text,text,integer,integer) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_list_orders(date,date,text,text,integer,integer) TO "authenticated";
REVOKE ALL ON FUNCTION public.web_list_responsibles() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_list_responsibles() TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_list_responsibles() TO "authenticated";
REVOKE ALL ON FUNCTION public.web_lock_management() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_lock_management() TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_lock_management() TO "authenticated";
REVOKE ALL ON FUNCTION public.web_management_status() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_management_status() TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_management_status() TO "authenticated";
REVOKE ALL ON FUNCTION public.web_normalize_label(text) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_normalize_label(text) TO "service_role";
REVOKE ALL ON FUNCTION public.web_normalize_phone(text) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_normalize_phone(text) TO "service_role";
REVOKE ALL ON FUNCTION public.web_remove_order(uuid,integer) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_remove_order(uuid,integer) TO "service_role";
REVOKE ALL ON FUNCTION public.web_require_management_access() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_require_management_access() TO "service_role";
REVOKE ALL ON FUNCTION public.web_require_membership() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_require_membership() TO "service_role";
REVOKE ALL ON FUNCTION public.web_require_owner() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_require_owner() TO "service_role";
REVOKE ALL ON FUNCTION public.web_save_catalog_product(jsonb) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_save_catalog_product(jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_save_catalog_product(jsonb) TO "authenticated";
REVOKE ALL ON FUNCTION public.web_save_order(jsonb) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_save_order(jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_save_order(jsonb) TO "authenticated";
REVOKE ALL ON FUNCTION public.web_save_order_with_responsible(jsonb) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_save_order_with_responsible(jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_save_order_with_responsible(jsonb) TO "authenticated";
REVOKE ALL ON FUNCTION public.web_save_responsible(jsonb) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_save_responsible(jsonb) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_save_responsible(jsonb) TO "authenticated";
REVOKE ALL ON FUNCTION public.web_search_customers(text) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_search_customers(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_search_customers(text) TO "authenticated";
REVOKE ALL ON FUNCTION public.web_session_context() FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_session_context() TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_session_context() TO "authenticated";
REVOKE ALL ON FUNCTION public.web_unlock_management(text) FROM PUBLIC,anon,authenticated,service_role,order_manager_api;
GRANT EXECUTE ON FUNCTION public.web_unlock_management(text) TO "service_role";
GRANT EXECUTE ON FUNCTION public.web_unlock_management(text) TO "authenticated";
GRANT INSERT,SELECT,UPDATE ON TABLE "public"."audit_logs" TO order_manager_api;
GRANT INSERT,SELECT,UPDATE ON TABLE "public"."catalog_products" TO order_manager_api;
GRANT INSERT,SELECT,UPDATE ON TABLE "public"."order_items" TO order_manager_api;
GRANT INSERT,SELECT,UPDATE ON TABLE "public"."orders" TO order_manager_api;
GRANT INSERT,SELECT,UPDATE ON TABLE "public"."responsibles" TO order_manager_api;
GRANT INSERT,SELECT,UPDATE ON TABLE "public"."tenant_memberships" TO order_manager_api;
GRANT INSERT,SELECT,UPDATE ON TABLE "public"."tenant_settings" TO order_manager_api;
GRANT INSERT,SELECT,UPDATE ON TABLE "public"."tenants" TO order_manager_api;
GRANT INSERT,SELECT,UPDATE ON TABLE "public"."users" TO order_manager_api;
DO $om_rls$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_event_trigger WHERE evtname='ensure_rls') THEN CREATE EVENT TRIGGER ensure_rls ON ddl_command_end WHEN TAG IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') EXECUTE FUNCTION public.rls_auto_enable(); END IF; END $om_rls$;
NOTIFY pgrst,'reload schema';
