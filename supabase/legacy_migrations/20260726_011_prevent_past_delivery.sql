-- Order Manager: reject delivery date/time values before the current minute.
-- Business time is Europe/Lisbon, independently from the database UTC timezone.

begin;

create or replace function public.validate_order_delivery_not_past()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  local_now timestamp := timezone('Europe/Lisbon', clock_timestamp());
begin
  if new.delivery_date < local_now::date
     or (
       new.delivery_date = local_now::date
       and new.delivery_time < date_trunc('minute', local_now)::time
     )
  then
    raise exception 'A data e a hora de entrega não podem ser anteriores ao momento atual.'
      using errcode = '23514';
  end if;

  return new;
end
$$;

revoke all
on function public.validate_order_delivery_not_past()
from public, anon, authenticated;

drop trigger if exists orders_delivery_not_past on public.orders;

create trigger orders_delivery_not_past
before insert or update of delivery_date, delivery_time
on public.orders
for each row
execute function public.validate_order_delivery_not_past();

commit;
