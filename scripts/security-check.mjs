import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const frontendRoot = join(root, 'apps', 'web', 'src');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const prohibitedFrontendPatterns = [
  { pattern: /VITE_SUPABASE_/i, description: 'VITE_SUPABASE_* variable' },
  { pattern: /SUPABASE_SERVICE_ROLE/i, description: 'Supabase service role reference' },
  { pattern: /@supabase\/supabase-js/i, description: 'direct Supabase browser client' },
];

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(path);
    return sourceExtensions.has(entry.name.slice(entry.name.lastIndexOf('.'))) ? [path] : [];
  });
}

const violations = [];
for (const file of listSourceFiles(frontendRoot)) {
  const contents = readFileSync(file, 'utf8');
  for (const { pattern, description } of prohibitedFrontendPatterns) {
    if (pattern.test(contents)) {
      violations.push(`${relative(root, file)} contains ${description}.`);
    }
  }
}

const gitignore = readFileSync(join(root, '.gitignore'), 'utf8');
for (const ignoredPattern of ['.env', '*.local']) {
  if (!gitignore.split(/\r?\n/).includes(ignoredPattern)) {
    violations.push(`.gitignore must contain ${ignoredPattern}.`);
  }
}

const webExample = readFileSync(join(root, 'apps', 'web', '.env.example'), 'utf8');
if (/VITE_SUPABASE_/i.test(webExample)) {
  violations.push('apps/web/.env.example exposes a Supabase browser variable.');
}

if (violations.length) {
  process.stderr.write(
    `Security boundary checks failed:\n${violations.map((item) => `- ${item}`).join('\n')}\n`,
  );
  process.exit(1);
}

process.stdout.write('Security boundary checks passed.\n');
