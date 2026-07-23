import 'dotenv/config';

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { runLegacyMigration } from './migrate';
import type { LegacyExport } from './types';

async function main() {
  const values = process.argv.slice(2);
  const argumentsMap = parseArguments(values);
  const positional = values.filter((value) => !value.startsWith('--'));
  const inputPath = argumentsMap.get('input') ?? positional[0];
  const reportPath = argumentsMap.get('report') ?? positional[1];
  if (!inputPath || !reportPath) {
    throw new Error(
      'Usage: legacy:migrate <input.json> <report.json> [apply], or use --input and --report.',
    );
  }
  const apply = argumentsMap.has('apply') || positional[2] === 'apply';
  const source = JSON.parse(await readFile(resolve(inputPath), 'utf8')) as LegacyExport;
  const report = await runLegacyMigration({
    source,
    apply,
    databaseUrl: apply ? process.env.DATABASE_URL : undefined,
  });
  await writeFile(resolve(reportPath), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `Legacy migration ${report.status}; ${report.issues.length} issue(s); report: ${resolve(reportPath)}\n`,
  );
  if (report.status === 'BLOCKED' || report.status === 'FAILED_RECONCILIATION')
    process.exitCode = 2;
}

function parseArguments(values: string[]): Map<string, string> {
  const result = new Map<string, string>();
  for (let index = 0; index < values.length; index += 1) {
    const argument = values[index];
    if (!argument?.startsWith('--')) continue;
    const equalsIndex = argument.indexOf('=');
    if (equalsIndex > 2) {
      result.set(argument.slice(2, equalsIndex), argument.slice(equalsIndex + 1));
      continue;
    }
    const key = argument.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith('--')) result.set(key, 'true');
    else {
      result.set(key, next);
      index += 1;
    }
  }
  return result;
}

void main();
