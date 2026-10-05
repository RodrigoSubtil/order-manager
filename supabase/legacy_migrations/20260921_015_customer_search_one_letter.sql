begin;

create or replace function public.web_search_customers(p_query text)
returns jsonb language sql stable security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
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
$$;

commit;
