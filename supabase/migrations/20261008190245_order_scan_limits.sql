-- Preparação da digitalização. Nenhuma chamada à IA é feita por esta migration.
-- Custos em micros de dólar: 1 USD = 1 000 000 microUSD.
-- A reserva de 40 000 microUSD (US$ 0,04) cobre o teto local de
-- 8 000 tokens de entrada e 6 000 de saída no modelo escolhido para o piloto.

create table app_security.order_scan_attempts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  user_id uuid not null references public.users(id),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '3 minutes'),
  finished_at timestamptz,
  state text not null default 'running' check (state in ('running', 'succeeded', 'failed')),
  reserved_microusd integer not null default 40000 check (reserved_microusd between 0 and 40000),
  actual_microusd integer check (actual_microusd >= 0),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0)
);

create index order_scan_attempts_tenant_started_idx
  on app_security.order_scan_attempts (tenant_id, started_at);

create index order_scan_attempts_running_idx
  on app_security.order_scan_attempts (tenant_id, expires_at)
  where state = 'running';

alter table app_security.order_scan_attempts enable row level security;
revoke all on app_security.order_scan_attempts from public, anon, authenticated;

create function public.web_begin_order_scan(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, app_security, auth, pg_temp
as $function$
declare
  v_tenant_id uuid;
  v_attempt_id uuid;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_month_start timestamptz;
  v_month_end timestamptz;
  v_spend_microusd bigint;
begin
  if p_user_id is null then
    raise exception 'Utilizador obrigatório.' using errcode = '42501';
  end if;

  select membership.tenant_id into v_tenant_id
  from public.tenant_memberships membership
  join public.tenants tenant on tenant.id = membership.tenant_id
  join public.users profile on profile.id = membership.user_id
  where membership.user_id = p_user_id
    and membership.status = 'ACTIVE'
    and membership.is_default = true
    and tenant.status = 'ACTIVE'
    and profile.status = 'ACTIVE'
  limit 1;

  if v_tenant_id is null then
    raise exception 'Empresa ativa não encontrada.' using errcode = '42501';
  end if;

  -- Serializa decisões apenas dentro desta empresa; outras empresas seguem em paralelo.
  perform pg_advisory_xact_lock(hashtextextended('order-scan:' || v_tenant_id::text, 0));

  if exists (
    select 1 from app_security.order_scan_attempts attempt
    where attempt.tenant_id = v_tenant_id
      and attempt.state = 'running'
      and attempt.expires_at > now()
  ) then
    raise exception 'Já existe uma análise em curso para esta empresa.' using errcode = 'P0001';
  end if;

  v_day_start := date_trunc('day', now() at time zone 'Europe/Lisbon') at time zone 'Europe/Lisbon';
  v_day_end := (date_trunc('day', now() at time zone 'Europe/Lisbon') + interval '1 day') at time zone 'Europe/Lisbon';
  if (
    select count(*) from app_security.order_scan_attempts attempt
    where attempt.tenant_id = v_tenant_id
      and attempt.started_at >= v_day_start
      and attempt.started_at < v_day_end
  ) >= 50 then
    raise exception 'O limite de 50 análises de hoje foi atingido.' using errcode = 'P0001';
  end if;

  v_month_start := date_trunc('month', now() at time zone 'Europe/Lisbon') at time zone 'Europe/Lisbon';
  v_month_end := (date_trunc('month', now() at time zone 'Europe/Lisbon') + interval '1 month') at time zone 'Europe/Lisbon';
  select coalesce(sum(coalesce(attempt.actual_microusd, attempt.reserved_microusd)), 0)
    into v_spend_microusd
  from app_security.order_scan_attempts attempt
  where attempt.tenant_id = v_tenant_id
    and attempt.started_at >= v_month_start
    and attempt.started_at < v_month_end;

  if v_spend_microusd + 40000 > 1000000 then
    raise exception 'O orçamento de US$ 1 deste mês foi atingido.' using errcode = 'P0001';
  end if;

  insert into app_security.order_scan_attempts (tenant_id, user_id)
  values (v_tenant_id, p_user_id)
  returning id into v_attempt_id;
  return v_attempt_id;
end
$function$;

revoke all on function public.web_begin_order_scan(uuid) from public, anon, authenticated, service_role;
grant execute on function public.web_begin_order_scan(uuid) to service_role;

create function public.web_finish_order_scan(
  p_attempt_id uuid,
  p_state text,
  p_actual_microusd integer default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, app_security, auth, pg_temp
as $function$
begin
  if p_state not in ('succeeded', 'failed')
    or p_actual_microusd < 0
    or p_input_tokens < 0
    or p_output_tokens < 0 then
    raise exception 'Resultado de análise inválido.' using errcode = '22023';
  end if;

  update app_security.order_scan_attempts
  set state = p_state,
      finished_at = now(),
      actual_microusd = p_actual_microusd,
      input_tokens = p_input_tokens,
      output_tokens = p_output_tokens
  where id = p_attempt_id and state = 'running';

  if not found then
    raise exception 'Análise em curso não encontrada.' using errcode = 'P0001';
  end if;
end
$function$;

revoke all on function public.web_finish_order_scan(uuid, text, integer, integer, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.web_finish_order_scan(uuid, text, integer, integer, integer)
  to service_role;
