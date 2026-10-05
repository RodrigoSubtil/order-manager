-- Keep the database aligned with the browser form: every operational field is
-- mandatory and only item notes remain optional.
begin;

do $$
begin
  if exists (
    select 1
    from public.orders
    where phone is null
       or phone !~ '^[0-9]{9,15}$'
       or responsible_id is null
       or delivery_time is null
  ) then
    raise exception
      'orders contains incomplete rows; correct phone, responsible and delivery time before applying this migration';
  end if;
end
$$;

alter table public.orders
  alter column phone set not null,
  alter column responsible_id set not null,
  alter column delivery_time set not null;

alter table public.orders
  drop constraint if exists orders_phone_required_format;

alter table public.orders
  add constraint orders_phone_required_format
  check (phone ~ '^[0-9]{9,15}$');

commit;
