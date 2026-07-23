-- Order Manager base schema for a new Supabase project.
-- Apply this file first in the Supabase SQL Editor. It creates no business data.

begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public."TenantStatus" as enum ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public."UserStatus" as enum ('ACTIVE', 'DISABLED');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public."MembershipRole" as enum ('OWNER', 'OPERATOR');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public."MembershipStatus" as enum ('ACTIVE', 'INVITED', 'SUSPENDED', 'REVOKED');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public."ProductCategory" as enum ('PASTELARIA', 'PADARIA', 'SALGADOS');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public."QuantityUnit" as enum ('UN', 'KG', 'G');
exception when duplicate_object then null;
end $$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status public."TenantStatus" not null default 'ACTIVE',
  next_order_number bigint not null default 1 check (next_order_number > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  email text,
  status public."UserStatus" not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null references public.users (id) on delete restrict,
  role public."MembershipRole" not null,
  status public."MembershipStatus" not null default 'INVITED',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,
  constraint tenant_memberships_tenant_user_unique unique (tenant_id, user_id),
  constraint tenant_memberships_revocation_consistent check (
    (status = 'REVOKED' and revoked_at is not null and revoked_by is not null)
    or (status <> 'REVOKED' and revoked_at is null and revoked_by is null)
  )
);

create table if not exists public.responsibles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  name text not null check (length(btrim(name)) > 0),
  is_active boolean not null default true,
  position integer not null default 0 check (position >= 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  constraint responsibles_tenant_id_id_unique unique (tenant_id, id)
);

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  category public."ProductCategory" not null,
  name text not null check (length(btrim(name)) > 0),
  default_unit public."QuantityUnit" not null default 'UN',
  is_active boolean not null default true,
  position integer not null default 0 check (position >= 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  constraint catalog_products_tenant_id_id_unique unique (tenant_id, id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  order_number bigint not null check (order_number > 0),
  client_name text not null check (length(btrim(client_name)) >= 2),
  phone text,
  responsible_id uuid,
  delivery_date date not null,
  delivery_time time,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  constraint orders_tenant_id_id_unique unique (tenant_id, id),
  constraint orders_tenant_order_number_unique unique (tenant_id, order_number),
  constraint orders_responsible_tenant_fk foreign key (tenant_id, responsible_id)
    references public.responsibles (tenant_id, id) on delete restrict
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  order_id uuid not null,
  category public."ProductCategory" not null,
  product_name text not null check (length(btrim(product_name)) > 0),
  quantity_value numeric(12, 3) not null check (quantity_value > 0),
  quantity_unit public."QuantityUnit" not null,
  notes text,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid,
  deleted_by uuid,
  constraint order_items_order_tenant_fk foreign key (tenant_id, order_id)
    references public.orders (tenant_id, id) on delete restrict,
  constraint order_items_tenant_id_id_unique unique (tenant_id, id)
);

-- Existing target tables created by an earlier version did not generate UUIDs
-- automatically. These defaults make the migration safe for both a fresh
-- project and that previously prepared staging schema.
alter table public.tenants alter column id set default gen_random_uuid();
alter table public.tenant_memberships alter column id set default gen_random_uuid();
alter table public.responsibles alter column id set default gen_random_uuid();
alter table public.catalog_products alter column id set default gen_random_uuid();
alter table public.orders alter column id set default gen_random_uuid();
alter table public.order_items alter column id set default gen_random_uuid();

alter table public.tenants alter column updated_at set default now();
alter table public.users alter column updated_at set default now();
alter table public.tenant_memberships alter column updated_at set default now();
alter table public.responsibles alter column updated_at set default now();
alter table public.catalog_products alter column updated_at set default now();
alter table public.orders alter column updated_at set default now();
alter table public.order_items alter column updated_at set default now();

create unique index if not exists tenant_memberships_one_default_per_user
  on public.tenant_memberships (user_id)
  where is_default and status = 'ACTIVE';
create index if not exists tenant_memberships_user_status_idx
  on public.tenant_memberships (user_id, status);
create index if not exists responsibles_tenant_position_name_idx
  on public.responsibles (tenant_id, position, name);
create index if not exists catalog_products_tenant_category_name_idx
  on public.catalog_products (tenant_id, category, position, name);
create index if not exists orders_tenant_delivery_idx
  on public.orders (tenant_id, delivery_date, delivery_time);
create index if not exists order_items_tenant_order_position_idx
  on public.order_items (tenant_id, order_id, position);

-- The profile is created/updated automatically whenever Supabase Auth changes.
create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.users (id, display_name, email, status, created_at, updated_at)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1),
      'Utilizador'
    ),
    new.email,
    'ACTIVE',
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    email = excluded.email,
    status = 'ACTIVE',
    updated_at = now();
  return new;
end
$$;

drop trigger if exists order_manager_sync_auth_user on auth.users;
create trigger order_manager_sync_auth_user
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_auth_user_profile();

-- Ensure users created before this migration also have a matching profile.
insert into public.users (id, display_name, email, status, created_at, updated_at)
select
  auth_user.id,
  coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'display_name', ''),
    nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
    split_part(auth_user.email, '@', 1),
    'Utilizador'
  ),
  auth_user.email,
  'ACTIVE',
  coalesce(auth_user.created_at, now()),
  now()
from auth.users auth_user
on conflict (id) do update set
  display_name = excluded.display_name,
  email = excluded.email,
  status = 'ACTIVE',
  updated_at = now();

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.catalog_products enable row level security;
alter table public.responsibles enable row level security;

revoke all on table public.tenants, public.users, public.tenant_memberships,
  public.orders, public.order_items, public.catalog_products, public.responsibles
from anon, authenticated;

commit;
