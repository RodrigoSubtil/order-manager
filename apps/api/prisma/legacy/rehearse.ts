import 'dotenv/config';

import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { Client } from 'pg';

import { assertDevelopmentDatabase } from '../development-database';
import { runLegacyMigration } from './migrate';
import type { LegacyExport, ReconciliationReport } from './types';

const rehearsalDatabase = 'order_manager_migration_test';
const rollbackSnapshotDatabase = 'order_manager_migration_backup';
const apiRoot = process.cwd();
const repositoryRoot = resolve(apiRoot, '../..');
const reportsDirectory = resolve(repositoryRoot, 'docs/reports/stage20');
const fixturePath = resolve(apiRoot, 'prisma/legacy/fixtures/legacy-export.valid.json');

type RestorationReport = {
  strategy: 'LOCAL_POSTGRES_TEMPLATE_SNAPSHOT';
  restored: boolean;
  migrationsAfterRestore: number;
  tenantsAfterRestore: number;
  elapsedMs: number;
  limitation: string;
};

type RehearsalSummary = {
  scope: 'LOCAL_SYNTHETIC_FIXTURE';
  productionTouched: false;
  sourceExportAvailable: false;
  database: string;
  anomalyStatus: ReconciliationReport['status'];
  firstRunStatus: ReconciliationReport['status'];
  replayStatus: ReconciliationReport['status'];
  idempotentReplay: boolean;
  sentinelTenantUnchanged: boolean;
  restoration: RestorationReport;
  startedAt: string;
  finishedAt: string;
  elapsedMs: number;
};

async function main(): Promise<void> {
  const startedAt = new Date();
  const baseUrl = requiredDatabaseUrl();
  assertDevelopmentDatabase(baseUrl);

  const rehearsalUrl = databaseUrl(baseUrl, rehearsalDatabase);
  const adminUrl = databaseUrl(baseUrl, 'postgres');
  const admin = new Client({ connectionString: adminUrl });

  await mkdir(reportsDirectory, { recursive: true });
  await admin.connect();
  try {
    await dropDatabase(admin, rehearsalDatabase);
    await dropDatabase(admin, rollbackSnapshotDatabase);
    await admin.query(`CREATE DATABASE "${rehearsalDatabase}"`);
    await runPrismaMigrations(rehearsalUrl);
    await admin.query(
      `CREATE DATABASE "${rollbackSnapshotDatabase}" TEMPLATE "${rehearsalDatabase}"`,
    );
    const sentinelBefore = await seedSentinelTenant(rehearsalUrl);

    const source = JSON.parse(await readFile(fixturePath, 'utf8')) as LegacyExport;
    const anomalyReport = await runLegacyMigration({
      source: createAnomalousFixture(source),
      apply: false,
    });
    const firstRunReport = await runLegacyMigration({
      source,
      databaseUrl: rehearsalUrl,
      apply: true,
    });
    const replayReport = await runLegacyMigration({
      source,
      databaseUrl: rehearsalUrl,
      apply: true,
    });

    assertExpectedStatus('anomaly dry run', anomalyReport.status, 'BLOCKED');
    assertExpectedStatus('first migration', firstRunReport.status, 'MIGRATED');
    assertExpectedStatus('idempotent replay', replayReport.status, 'MIGRATED');
    if (!replayReport.idempotentReplay) {
      throw new Error('The second migration was not recognized as an idempotent replay.');
    }
    const sentinelAfter = await readSentinelFingerprint(rehearsalUrl);
    const sentinelTenantUnchanged = sentinelBefore === sentinelAfter;
    if (!sentinelTenantUnchanged) {
      throw new Error('The migration changed data belonging to the sentinel tenant.');
    }

    const restoration = await restoreSnapshot(admin, rehearsalUrl);
    if (!restoration.restored) {
      throw new Error('The local rollback snapshot did not restore the expected clean state.');
    }
    const finishedAt = new Date();
    const summary: RehearsalSummary = {
      scope: 'LOCAL_SYNTHETIC_FIXTURE',
      productionTouched: false,
      sourceExportAvailable: false,
      database: rehearsalDatabase,
      anomalyStatus: anomalyReport.status,
      firstRunStatus: firstRunReport.status,
      replayStatus: replayReport.status,
      idempotentReplay: replayReport.idempotentReplay,
      sentinelTenantUnchanged,
      restoration,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      elapsedMs: finishedAt.getTime() - startedAt.getTime(),
    };

    await Promise.all([
      writeJson('anomaly-report.json', anomalyReport),
      writeJson('first-run-report.json', firstRunReport),
      writeJson('replay-report.json', replayReport),
      writeJson('rehearsal-summary.json', summary),
    ]);
    process.stdout.write(
      `Stage 20 local rehearsal passed in ${summary.elapsedMs} ms. Reports: ${reportsDirectory}\n`,
    );
  } finally {
    await dropDatabase(admin, rehearsalDatabase);
    await dropDatabase(admin, rollbackSnapshotDatabase);
    await admin.end();
  }
}

async function seedSentinelTenant(targetUrl: string): Promise<string> {
  const client = new Client({ connectionString: targetUrl });
  await client.connect();
  try {
    await client.query(`
      BEGIN;
      INSERT INTO users (id, display_name, email, status, updated_at)
      VALUES (
        '98000000-0000-4000-8000-000000000001',
        'Sentinel Owner',
        'sentinel@example.test',
        'ACTIVE',
        now()
      );
      INSERT INTO tenants (
        id, slug, name, status, next_order_number, created_by, updated_by, updated_at
      )
      VALUES (
        '98000000-0000-4000-8000-000000000002',
        'sentinel-tenant',
        'Sentinel Tenant',
        'ACTIVE',
        8,
        '98000000-0000-4000-8000-000000000001',
        '98000000-0000-4000-8000-000000000001',
        now()
      );
      INSERT INTO tenant_memberships (
        id, tenant_id, user_id, role, status, is_default, created_by, updated_by, updated_at
      )
      VALUES (
        '98000000-0000-4000-8000-000000000003',
        '98000000-0000-4000-8000-000000000002',
        '98000000-0000-4000-8000-000000000001',
        'OWNER',
        'ACTIVE',
        true,
        '98000000-0000-4000-8000-000000000001',
        '98000000-0000-4000-8000-000000000001',
        now()
      );
      INSERT INTO responsibles (
        id, tenant_id, name, is_active, position, created_by, updated_by, updated_at
      )
      VALUES (
        '98000000-0000-4000-8000-000000000004',
        '98000000-0000-4000-8000-000000000002',
        'Sentinel Responsible',
        true,
        0,
        '98000000-0000-4000-8000-000000000001',
        '98000000-0000-4000-8000-000000000001',
        now()
      );
      INSERT INTO orders (
        id, tenant_id, order_number, client_name, responsible_id, delivery_date,
        created_by, updated_by, updated_at
      )
      VALUES (
        '98000000-0000-4000-8000-000000000005',
        '98000000-0000-4000-8000-000000000002',
        7,
        'Sentinel Client',
        '98000000-0000-4000-8000-000000000004',
        DATE '2026-08-03',
        '98000000-0000-4000-8000-000000000001',
        '98000000-0000-4000-8000-000000000001',
        now()
      );
      INSERT INTO order_items (
        id, tenant_id, order_id, category, product_name, quantity_value,
        quantity_unit, position, created_by, updated_by, updated_at
      )
      VALUES (
        '98000000-0000-4000-8000-000000000006',
        '98000000-0000-4000-8000-000000000002',
        '98000000-0000-4000-8000-000000000005',
        'PADARIA',
        'Sentinel Product',
        1,
        'UN',
        0,
        '98000000-0000-4000-8000-000000000001',
        '98000000-0000-4000-8000-000000000001',
        now()
      );
      COMMIT;
    `);
    const fingerprint = await readSentinelFingerprintWithClient(client);
    return fingerprint;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

async function readSentinelFingerprint(targetUrl: string): Promise<string> {
  const client = new Client({ connectionString: targetUrl });
  await client.connect();
  try {
    return await readSentinelFingerprintWithClient(client);
  } finally {
    await client.end();
  }
}

async function readSentinelFingerprintWithClient(client: Client): Promise<string> {
  const result = await client.query<{ fingerprint: string }>(`
    SELECT jsonb_build_object(
      'tenant', (SELECT row_to_json(value) FROM (
        SELECT id, slug, name, next_order_number
        FROM tenants
        WHERE id = '98000000-0000-4000-8000-000000000002'
      ) value),
      'orders', (SELECT count(*) FROM orders
        WHERE tenant_id = '98000000-0000-4000-8000-000000000002'),
      'items', (SELECT count(*) FROM order_items
        WHERE tenant_id = '98000000-0000-4000-8000-000000000002'),
      'responsibles', (SELECT count(*) FROM responsibles
        WHERE tenant_id = '98000000-0000-4000-8000-000000000002'),
      'memberships', (SELECT count(*) FROM tenant_memberships
        WHERE tenant_id = '98000000-0000-4000-8000-000000000002')
    )::text AS fingerprint
  `);
  const fingerprint = result.rows[0]?.fingerprint;
  if (!fingerprint) throw new Error('Sentinel tenant fingerprint could not be calculated.');
  return fingerprint;
}

function requiredDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL is required for the local rehearsal.');
  return value;
}

function databaseUrl(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  url.searchParams.set('schema', 'public');
  return url.toString();
}

async function dropDatabase(client: Client, database: string): Promise<void> {
  if (![rehearsalDatabase, rollbackSnapshotDatabase].includes(database)) {
    throw new Error(`Refusing to drop unexpected database: ${database}`);
  }
  await client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
}

async function runPrismaMigrations(targetUrl: string): Promise<void> {
  const require = createRequire(resolve(apiRoot, 'package.json'));
  const prismaCli = require.resolve('prisma/build/index.js');
  await spawnAndWait(
    process.execPath,
    [prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'],
    {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: targetUrl, NODE_ENV: 'development' },
    },
  );
}

async function spawnAndWait(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { ...options, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`Command failed with exit code ${code ?? 'unknown'}.`));
    });
  });
}

function createAnomalousFixture(source: LegacyExport): LegacyExport {
  const anomaly = structuredClone(source);
  anomaly.migration.batchId = 'stage20-fixture-anomalies-v1';
  const firstOrder = anomaly.data.orders[0];
  const secondOrder = anomaly.data.orders[1];
  const firstItem = anomaly.data.orderProducts[0];
  if (!firstOrder || !secondOrder || !firstItem) {
    throw new Error('The rehearsal fixture is incomplete.');
  }

  secondOrder.orderNumber = firstOrder.orderNumber;
  firstOrder.responsibleId = '99999999-0000-4000-8000-000000000099';
  firstItem.quantity = 'doze caixas';
  anomaly.data.orderProducts = anomaly.data.orderProducts.filter(
    (item) => item.orderId !== secondOrder.id,
  );
  anomaly.data.orderProducts.push({
    ...firstItem,
    id: 'orphan-item-for-rehearsal',
    orderId: '99999999-0000-4000-8000-000000000098',
  });
  return anomaly;
}

async function restoreSnapshot(admin: Client, rehearsalUrl: string): Promise<RestorationReport> {
  const startedAt = Date.now();
  await dropDatabase(admin, rehearsalDatabase);
  await admin.query(
    `CREATE DATABASE "${rehearsalDatabase}" TEMPLATE "${rollbackSnapshotDatabase}"`,
  );

  const restored = new Client({ connectionString: rehearsalUrl });
  await restored.connect();
  try {
    const migrationResult = await restored.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
    );
    const tenantResult = await restored.query<{ count: string }>(
      'SELECT count(*)::text AS count FROM tenants',
    );
    const migrationsAfterRestore = Number(migrationResult.rows[0]?.count ?? 0);
    const tenantsAfterRestore = Number(tenantResult.rows[0]?.count ?? 0);
    return {
      strategy: 'LOCAL_POSTGRES_TEMPLATE_SNAPSHOT',
      restored: migrationsAfterRestore > 0 && tenantsAfterRestore === 0,
      migrationsAfterRestore,
      tenantsAfterRestore,
      elapsedMs: Date.now() - startedAt,
      limitation:
        'This proves local snapshot restoration only; Supabase backup or PITR must be rehearsed separately before production.',
    };
  } finally {
    await restored.end();
  }
}

function assertExpectedStatus(
  label: string,
  actual: ReconciliationReport['status'],
  expected: ReconciliationReport['status'],
): void {
  if (actual !== expected) {
    throw new Error(`${label} returned ${actual}; expected ${expected}.`);
  }
}

async function writeJson(name: string, value: unknown): Promise<void> {
  await writeFile(resolve(reportsDirectory, name), `${JSON.stringify(value, null, 2)}\n`);
}

void main();
