import 'dotenv/config';

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { assertDevelopmentDatabase } from './development-database';

const [command, ...argumentsToForward] = process.argv.slice(2);

if (!command || !['dev', 'reset'].includes(command)) {
  throw new Error('Use this guard only with "dev" or "reset" migration commands.');
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for local migration commands.');
}

assertDevelopmentDatabase(databaseUrl);

const require = createRequire(join(process.cwd(), 'package.json'));
const prismaCli = require.resolve('prisma/build/index.js');
const child = spawn(
  process.execPath,
  [prismaCli, 'migrate', command, '--config', 'prisma.config.ts', ...argumentsToForward],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  },
);

child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
