-- Store complete international phone numbers without changing the existing text columns.
-- Nine-digit historical values were entered in the Portugal-only interface.
begin;

lock table public.customers, public.orders in share row exclusive mode;

do $$
declare collision_count integer;
begin
  select count(*) into collision_count from (
    select 1 from public.customers
    group by tenant_id, normalized_name,
      case when phone ~ '^[0-9]{9}$' then '351' || phone else phone end
    having count(*) > 1
  ) collisions;
  if collision_count > 0 then
    raise exception 'Existem % clientes com a mesma identidade após normalizar +351. Resolva-os antes desta migration.', collision_count
      using errcode = '23505';
  end if;
end
$$;

update public.customers
set phone = '351' || phone, version = version + 1, updated_at = now()
where phone ~ '^[0-9]{9}$';

update public.orders
set phone = '351' || phone, version = version + 1, updated_at = now()
where phone ~ '^[0-9]{9}$';

-- Keep saves from an older frontend compatible with the canonical customer key.
create or replace function public.web_normalize_phone(p_value text)
returns text language sql immutable strict parallel safe
set search_path = pg_catalog, pg_temp
as $$
  select case when length(digits.value) = 9 then '351' || digits.value else digits.value end
  from (select regexp_replace(p_value, '[^0-9]', '', 'g') as value) digits
$$;

do $$
begin
  if exists (select 1 from public.customers where phone ~ '^[0-9]{9}$')
    or exists (select 1 from public.orders where phone ~ '^[0-9]{9}$') then
    raise exception 'A normalização dos telefones portugueses não foi concluída.';
  end if;
end
$$;

commit;
