import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = join(webRoot, 'src');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const forbiddenSourcePatterns = [
  ['Supabase browser SDK', /@supabase\/supabase-js/],
  ['browser Supabase environment variable', /VITE_SUPABASE_/],
  ['direct fetch call', /\bfetch\s*\(/],
  ['legacy Supabase client', /supabaseClient/],
  ['legacy data hook', /useLegacyOrderData/],
  ['legacy orders API', /ordersApi/],
];

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return listSourceFiles(path);
      return sourceExtensions.has(extname(entry.name)) ? [path] : [];
    }),
  );
  return nested.flat();
}

const failures = [];
for (const file of await listSourceFiles(sourceRoot)) {
  const content = await readFile(file, 'utf8');
  for (const [label, pattern] of forbiddenSourcePatterns) {
    if (label === 'direct fetch call' && /\.test\.[jt]sx?$/.test(file)) continue;
    if (pattern.test(content)) failures.push(`${relative(webRoot, file)}: ${label}`);
  }
}

const packageJson = JSON.parse(await readFile(join(webRoot, 'package.json'), 'utf8'));
const browserDependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
if ('@supabase/supabase-js' in browserDependencies) {
  failures.push('package.json: Supabase browser SDK dependency');
}

for (const envExample of ['.env.example', join('..', '..', '.env.example')]) {
  const content = await readFile(join(webRoot, envExample), 'utf8');
  if (/VITE_SUPABASE_/.test(content)) failures.push(`${envExample}: browser Supabase variable`);
}

if (failures.length > 0) {
  console.error(
    'Browser API boundary violations:\n' + failures.map((item) => `- ${item}`).join('\n'),
  );
  process.exitCode = 1;
} else {
  console.log('Browser API boundary verified: only the generated /api/v1 client is allowed.');
}
