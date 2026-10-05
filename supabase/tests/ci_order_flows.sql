-- Disposable local/CI database only; never run fixtures on a live project.
insert into auth.users (id, email, raw_user_meta_data)
values ('22222222-2222-4222-8222-222222222222', 'qa-local@users.order-manager.invalid',
  '{"username":"qa_local","display_name":"QA local"}'::jsonb);
select set_config('order_manager.test_user_id','22222222-2222-4222-8222-222222222222',false);
\ir order_flows.sql
delete from public.users where id='22222222-2222-4222-8222-222222222222';
delete from auth.users where id='22222222-2222-4222-8222-222222222222';
