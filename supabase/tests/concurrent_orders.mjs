// Run only against a disposable database, with PGHOST/PGDATABASE configured.
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
if (!process.env.PGDATABASE?.startsWith('om_') && process.env.PGDATABASE !== 'order_manager_test') {
  throw new Error('Use a disposable om_* or order_manager_test database');
}
const psql = process.env.PG_BIN_DIR
  ? path.join(process.env.PG_BIN_DIR, process.platform === 'win32' ? 'psql.exe' : 'psql')
  : 'psql';
const args = ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1'];
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
function sql(query) {
  const run = spawnSync(psql, args, { input: query, encoding: 'utf8', env: process.env });
  if (run.status !== 0) throw new Error(run.stderr);
  return run.stdout.trim();
}
function concurrent(query) {
  return new Promise((resolve, reject) => {
    const child = spawn(psql, args, { env: process.env });
    child.stdin.end(query);
    let output = '',
      errors = '';
    child.stdout.on('data', (data) => (output += data));
    child.stderr.on('data', (data) => (errors += data));
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve(output.trim()) : reject(new Error(errors))));
  });
}
const user = randomUUID(),
  tenant = randomUUID(),
  responsible = randomUUID();
try {
  sql(
    'INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES (' +
      quote(user) +
      ',' +
      quote('qa-' + user + '@users.order-manager.invalid') +
      ',' +
      quote(
        JSON.stringify({ username: 'qa_' + user.slice(0, 8), display_name: 'QA concurrency' }),
      ) +
      '::jsonb);' +
      'INSERT INTO public.tenants(id,slug,name) VALUES (' +
      quote(tenant) +
      ',' +
      quote('qa-' + tenant) +
      ",'QA concurrency');" +
      'INSERT INTO public.tenant_memberships(tenant_id,user_id,role,status,is_default) VALUES (' +
      quote(tenant) +
      ',' +
      quote(user) +
      ",'OPERATOR','ACTIVE',true);" +
      'INSERT INTO public.responsibles(id,tenant_id,name) VALUES (' +
      quote(responsible) +
      ',' +
      quote(tenant) +
      ",'QA responsible');",
  );
  const date = sql("SELECT (timezone('Europe/Lisbon',now())::date+1)::text;");
  const payload = (requestId) => ({
    requestId,
    clientName: 'QA concurrency',
    phone: '351912345678',
    responsibleId: responsible,
    deliveryDate: date,
    deliveryTime: '11:00',
    items: [{ category: 'PADARIA', productName: 'Pão QA', quantityValue: 1, quantityUnit: 'UN' }],
  });
  const request = (value) =>
    "BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub'," +
    quote(user) +
    ',true); SELECT public.web_save_order_with_responsible(' +
    quote(JSON.stringify(value)) +
    '::jsonb); SELECT pg_sleep(0.3); COMMIT;';
  await Promise.all([
    concurrent(request(payload(randomUUID()))),
    concurrent(request(payload(randomUUID()))),
  ]);
  const counts = JSON.parse(
    sql(
      "SELECT jsonb_build_object('orders',(SELECT count(*) FROM public.orders WHERE tenant_id=" +
        quote(tenant) +
        "),'customers',(SELECT count(*) FROM public.customers WHERE tenant_id=" +
        quote(tenant) +
        "),'products',(SELECT count(*) FROM public.catalog_products WHERE tenant_id=" +
        quote(tenant) +
        '));',
    ),
  );
  if (counts.orders !== 2 || counts.customers !== 1 || counts.products !== 1)
    throw new Error('Concurrent identity duplication: ' + JSON.stringify(counts));
  const retry = payload(randomUUID());
  const result = await Promise.all([concurrent(request(retry)), concurrent(request(retry))]);
  const saved = result.map((text) =>
    JSON.parse(text.split('\n').find((line) => line.trim().startsWith('{'))),
  );
  if (saved[0].id !== saved[1].id) throw new Error('Concurrent retries returned different orders');
  if (Number(sql('SELECT count(*) FROM public.orders WHERE tenant_id=' + quote(tenant))) !== 3)
    throw new Error('Retry created another order');
  console.log(
    'Concurrent orders: PASS; customer/product uniqueness: PASS; concurrent retry idempotency: PASS',
  );
} finally {
  sql(
    'DELETE FROM public.order_items WHERE tenant_id=' +
      quote(tenant) +
      '; DELETE FROM public.orders WHERE tenant_id=' +
      quote(tenant) +
      '; DELETE FROM public.order_save_receipts WHERE tenant_id=' +
      quote(tenant) +
      '; DELETE FROM public.customers WHERE tenant_id=' +
      quote(tenant) +
      '; DELETE FROM public.catalog_products WHERE tenant_id=' +
      quote(tenant) +
      '; DELETE FROM public.responsibles WHERE tenant_id=' +
      quote(tenant) +
      '; DELETE FROM public.tenant_memberships WHERE tenant_id=' +
      quote(tenant) +
      '; DELETE FROM public.tenants WHERE id=' +
      quote(tenant) +
      '; DELETE FROM public.users WHERE id=' +
      quote(user) +
      '; DELETE FROM auth.users WHERE id=' +
      quote(user) +
      ';',
  );
}
