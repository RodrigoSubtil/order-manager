-- Initial local/staging schema. Generated from prisma/schema.prisma and reviewed
-- for tenant-bound foreign keys and database-level integrity checks.
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'OPERATOR');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED');
CREATE TYPE "ProductCategory" AS ENUM ('PASTELARIA', 'PADARIA', 'SALGADOS');
CREATE TYPE "QuantityUnit" AS ENUM ('UN', 'KG', 'G');

CREATE TABLE "tenants" (
  "id" UUID NOT NULL, "slug" TEXT NOT NULL, "name" TEXT NOT NULL,
  "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE', "next_order_number" BIGINT NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_by" UUID, "updated_by" UUID,
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenants_next_order_number_positive" CHECK ("next_order_number" > 0)
);

-- This profile table is intentionally separate from Supabase auth.users. The
-- integration/migration of auth identities remains a future approved step.
CREATE TABLE "users" (
  "id" UUID NOT NULL, "display_name" TEXT NOT NULL, "email" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_memberships" (
  "tenant_id" UUID NOT NULL, "user_id" UUID NOT NULL, "role" "MembershipRole" NOT NULL,
  "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_by" UUID, "updated_by" UUID, "revoked_at" TIMESTAMPTZ(6), "revoked_by" UUID,
  CONSTRAINT "tenant_memberships_pkey" PRIMARY KEY ("tenant_id", "user_id")
);

CREATE TABLE "tenant_settings" (
  "tenant_id" UUID NOT NULL, "timezone" TEXT NOT NULL, "locale" TEXT NOT NULL,
  "order_retention_days" INTEGER, "print_preferences" JSONB NOT NULL DEFAULT '{}', "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "created_by" UUID, "updated_by" UUID,
  CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenant_id"),
  CONSTRAINT "tenant_settings_version_positive" CHECK ("version" > 0),
  CONSTRAINT "tenant_settings_retention_positive" CHECK ("order_retention_days" IS NULL OR "order_retention_days" > 0)
);

CREATE TABLE "responsibles" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true, "position" INTEGER NOT NULL DEFAULT 0, "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6), "created_by" UUID, "updated_by" UUID, "deleted_by" UUID,
  CONSTRAINT "responsibles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "responsibles_position_nonnegative" CHECK ("position" >= 0),
  CONSTRAINT "responsibles_version_positive" CHECK ("version" > 0)
);

CREATE TABLE "catalog_products" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "category" "ProductCategory" NOT NULL, "name" TEXT NOT NULL,
  "default_unit" "QuantityUnit" NOT NULL DEFAULT 'UN', "is_active" BOOLEAN NOT NULL DEFAULT true,
  "position" INTEGER NOT NULL DEFAULT 0, "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  "deleted_at" TIMESTAMPTZ(6), "created_by" UUID, "updated_by" UUID, "deleted_by" UUID,
  CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalog_products_position_nonnegative" CHECK ("position" >= 0),
  CONSTRAINT "catalog_products_version_positive" CHECK ("version" > 0)
);

CREATE TABLE "orders" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "order_number" BIGINT NOT NULL, "client_name" TEXT NOT NULL,
  "phone" TEXT, "responsible_id" UUID, "delivery_date" DATE NOT NULL, "delivery_time" TIME(6),
  "version" INTEGER NOT NULL DEFAULT 1, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL, "deleted_at" TIMESTAMPTZ(6),
  "created_by" UUID, "updated_by" UUID, "deleted_by" UUID,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_order_number_positive" CHECK ("order_number" > 0),
  CONSTRAINT "orders_version_positive" CHECK ("version" > 0)
);

CREATE TABLE "order_items" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "order_id" UUID NOT NULL, "catalog_product_id" UUID,
  "category" "ProductCategory" NOT NULL, "product_name" TEXT NOT NULL,
  "quantity_value" DECIMAL(12,3) NOT NULL, "quantity_unit" "QuantityUnit" NOT NULL,
  "notes" TEXT, "position" INTEGER NOT NULL, "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL, "deleted_at" TIMESTAMPTZ(6),
  "created_by" UUID, "updated_by" UUID, "deleted_by" UUID,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_quantity_positive" CHECK ("quantity_value" > 0),
  CONSTRAINT "order_items_position_nonnegative" CHECK ("position" >= 0)
);

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL, "tenant_id" UUID NOT NULL, "actor_user_id" UUID, "action" TEXT NOT NULL,
  "entity_type" TEXT NOT NULL, "entity_id" UUID NOT NULL, "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "request_id" UUID, "metadata" JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE INDEX "tenant_memberships_user_id_status_idx" ON "tenant_memberships"("user_id", "status");
CREATE INDEX "tenant_memberships_tenant_id_status_role_idx" ON "tenant_memberships"("tenant_id", "status", "role");
CREATE UNIQUE INDEX "responsibles_tenant_id_id_key" ON "responsibles"("tenant_id", "id");
CREATE INDEX "responsibles_tenant_id_position_name_idx" ON "responsibles"("tenant_id", "position", "name");
CREATE UNIQUE INDEX "catalog_products_tenant_id_id_key" ON "catalog_products"("tenant_id", "id");
CREATE INDEX "catalog_products_tenant_id_category_position_name_idx" ON "catalog_products"("tenant_id", "category", "position", "name");
CREATE UNIQUE INDEX "orders_tenant_id_id_key" ON "orders"("tenant_id", "id");
CREATE UNIQUE INDEX "orders_tenant_id_order_number_key" ON "orders"("tenant_id", "order_number");
CREATE INDEX "orders_tenant_id_delivery_date_delivery_time_idx" ON "orders"("tenant_id", "delivery_date", "delivery_time");
CREATE INDEX "orders_tenant_id_created_at_idx" ON "orders"("tenant_id", "created_at");
CREATE UNIQUE INDEX "order_items_tenant_id_id_key" ON "order_items"("tenant_id", "id");
CREATE INDEX "order_items_tenant_id_order_id_position_idx" ON "order_items"("tenant_id", "order_id", "position");
CREATE INDEX "audit_logs_tenant_id_occurred_at_idx" ON "audit_logs"("tenant_id", "occurred_at");
CREATE INDEX "audit_logs_tenant_id_entity_type_entity_id_occurred_at_idx" ON "audit_logs"("tenant_id", "entity_type", "entity_id", "occurred_at");
CREATE INDEX "audit_logs_actor_user_id_occurred_at_idx" ON "audit_logs"("actor_user_id", "occurred_at");

ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_memberships" ADD CONSTRAINT "tenant_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "responsibles" ADD CONSTRAINT "responsibles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_responsible_id_fkey" FOREIGN KEY ("tenant_id", "responsible_id") REFERENCES "responsibles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_order_id_fkey" FOREIGN KEY ("tenant_id", "order_id") REFERENCES "orders"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_tenant_id_catalog_product_id_fkey" FOREIGN KEY ("tenant_id", "catalog_product_id") REFERENCES "catalog_products"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
