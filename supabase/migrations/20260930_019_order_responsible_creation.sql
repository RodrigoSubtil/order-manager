-- Resolve a typed responsible when an order is saved. The lookup, optional
-- creation and order save run in one transaction, so a failed order leaves no
-- orphan responsible. Existing web_save_order callers remain compatible.
begin;

do $$
declare duplicate_count integer;
begin
  select count(*) into duplicate_count from (
    select 1 from public.responsibles
    where deleted_at is null
    group by tenant_id, public.web_normalize_label(name)
    having count(*) > 1
  ) duplicates;
  if duplicate_count > 0 then
    raise exception 'Existem % nomes de responsáveis repetidos na mesma empresa. Resolva-os antes desta migration.', duplicate_count
      using errcode = '23505';
  end if;
end
$$;

create unique index responsibles_tenant_normalized_name_uq
  on public.responsibles (tenant_id, public.web_normalize_label(name))
  where deleted_at is null;

create or replace function public.web_save_order_with_responsible(p_order jsonb)
returns jsonb language plpgsql security definer
set search_path = pg_catalog, public, auth, extensions, pg_temp
as $$
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
$$;

revoke all on function public.web_save_order_with_responsible(jsonb) from public, anon, authenticated;
grant execute on function public.web_save_order_with_responsible(jsonb) to authenticated;

commit;
