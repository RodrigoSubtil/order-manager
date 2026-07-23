import 'dotenv/config';

import { spawn } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for a staging migration.');
}

if (process.env.MIGRATION_TARGET !== 'staging' || process.env.ALLOW_STAGING_MIGRATIONS !== 'true') {
  throw new Error(
    'Set MIGRATION_TARGET=staging and ALLOW_STAGING_MIGRATIONS=true after a verified backup.',
  );
}

if (process.env.NODE_ENV === 'production') {
  throw new Error('This repository does not permit production migrations.');
}

const prismaCli = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
const child = spawn(prismaCli, ['migrate', 'deploy', '--config', 'prisma.config.ts'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});

child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
