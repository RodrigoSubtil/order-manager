import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import postcss from 'postcss';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const sourceRoot = path.join(repositoryRoot, 'apps', 'web', 'src');
const outputPath = path.join(
  repositoryRoot,
  'docs',
  'history',
  'visual',
  'reports',
  'style-inventory.json',
);

const trackedProperties = [
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'gap',
  'row-gap',
  'column-gap',
  'padding',
  'margin',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'border-radius',
  'box-shadow',
  'z-index',
  'transition',
  'animation',
];

const stateMatchers = {
  active: /:active\b/,
  disabled: /:disabled\b|\[disabled\]/,
  error: /invalid|error|danger/i,
  focus: /:focus(?:-visible|-within)?\b/,
  hover: /:hover\b/,
  loading: /loading|saving|spinner/i,
  success: /success/i,
};

const colorPattern =
  /#[\da-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|color-mix)\([^;]+?\)|\b(?:black|white|transparent|currentcolor)\b/gi;
const unitPattern =
  /-?(?:\d+\.?\d*|\.\d+)(px|rem|em|%|vh|vw|dvh|svh|lvh|mm|cm|in|pt|pc|ch|ex|fr|s|ms|deg)\b/gi;
const customPropertyUsagePattern = /var\(\s*(--[\w-]+)/g;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(absolutePath)));
    } else if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

function relativeToRepository(absolutePath) {
  return path.relative(repositoryRoot, absolutePath).replaceAll(path.sep, '/');
}

function addCount(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function addOccurrence(map, key, occurrence) {
  const current = map.get(key) ?? [];
  current.push(occurrence);
  map.set(key, current);
}

function mapToSortedObject(map) {
  return Object.fromEntries(
    [...map.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [key, value]),
  );
}

function countMapToRows(map) {
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function lineNumber(node) {
  return node.source?.start?.line ?? null;
}

function classifyFile(relativePath, css) {
  if (
    relativePath.endsWith('/styles/print.css') ||
    relativePath.endsWith('/PrintableOrders.module.css')
  ) {
    return 'print';
  }
  if (/@media\s+print\b|@page\b/i.test(css)) return 'mixed';
  if (relativePath.endsWith('.module.css')) return 'module';
  return 'global';
}

function declarationContext(declaration, fileKind) {
  if (fileKind === 'print') return 'print';

  let parent = declaration.parent;
  while (parent) {
    if (
      parent.type === 'atrule' &&
      (parent.name.toLowerCase() === 'page' ||
        (parent.name.toLowerCase() === 'media' && /\bprint\b/i.test(parent.params)))
    ) {
      return 'print';
    }
    parent = parent.parent;
  }

  return 'screen';
}

function collectColorValues(value) {
  return [...value.matchAll(colorPattern)].map((match) => match[0].toLowerCase());
}

function collectUnits(value) {
  return [...value.matchAll(unitPattern)].map((match) => match[1].toLowerCase());
}

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, stableSort(nestedValue)]),
    );
  }
  return value;
}

const allSourceFiles = await walk(sourceRoot);
const cssFiles = allSourceFiles.filter((file) => file.endsWith('.css'));
const codeFiles = allSourceFiles.filter((file) => /\.(?:ts|tsx)$/.test(file));
const componentFiles = codeFiles.filter(
  (file) => file.endsWith('.tsx') && !/\.(?:test|spec)\.tsx$/.test(file),
);

const importedCssFiles = new Set();
const components = [];
const inlineSvgComponents = [];

for (const codeFile of codeFiles) {
  const source = await readFile(codeFile, 'utf8');
  const importPattern = /(?:from\s+|import\s*)['"]([^'"]+\.css)['"]/g;
  for (const match of source.matchAll(importPattern)) {
    const importedPath = match[1];
    if (!importedPath.startsWith('.')) continue;
    importedCssFiles.add(path.resolve(path.dirname(codeFile), importedPath));
  }
}

for (const componentFile of componentFiles) {
  const source = await readFile(componentFile, 'utf8');
  const cssImports = [];
  const importPattern = /(?:from\s+|import\s*)['"]([^'"]+\.css)['"]/g;
  for (const match of source.matchAll(importPattern)) {
    if (!match[1].startsWith('.')) continue;
    cssImports.push(relativeToRepository(path.resolve(path.dirname(componentFile), match[1])));
  }

  const inlineSvgCount = (source.match(/<svg\b/g) ?? []).length;
  const component = {
    file: relativeToRepository(componentFile),
    cssImports: [...new Set(cssImports)].sort(),
    inlineSvgCount,
    ariaAttributeCount: (source.match(/\baria-[\w-]+=/g) ?? []).length,
    explicitRoleCount: (source.match(/\brole=/g) ?? []).length,
  };
  components.push(component);
  if (inlineSvgCount > 0) inlineSvgComponents.push(component);
}

const customPropertyDefinitions = new Map();
const customPropertyUsages = new Map();
const directColors = new Map();
const tokenColors = new Map();
const mediaQueries = [];
const breakpoints = new Map();
const units = new Map();
const keyframes = [];
const iconRules = [];
const propertyValues = Object.fromEntries(
  trackedProperties.map((property) => [property, new Map()]),
);
const contextDeclarationCounts = { print: 0, screen: 0 };
const stateSelectorCounts = new Map(Object.keys(stateMatchers).map((state) => [state, 0]));
const files = [];
const sourceDigest = createHash('sha256');
let totalLines = 0;
let totalDeclarations = 0;
let reducedMotionRuleCount = 0;
let forcedColorsRuleCount = 0;

for (const cssFile of cssFiles) {
  const css = await readFile(cssFile, 'utf8');
  const relativePath = relativeToRepository(cssFile);
  const lines = css === '' ? 0 : css.split(/\r?\n/).length;
  const fileKind = classifyFile(relativePath, css);
  const root = postcss.parse(css, { from: relativePath });
  let declarationCount = 0;
  let ruleCount = 0;

  sourceDigest.update(relativePath);
  sourceDigest.update('\0');
  sourceDigest.update(css);
  sourceDigest.update('\0');
  totalLines += lines;

  root.walkRules((rule) => {
    ruleCount += 1;
    for (const [state, matcher] of Object.entries(stateMatchers)) {
      if (matcher.test(rule.selector)) addCount(stateSelectorCounts, state);
    }

    if (/\bsvg\b|icon|whatsapp|chevron|calendar|clock|phone|search|close/i.test(rule.selector)) {
      const dimensions = {};
      rule.walkDecls(
        /^(?:width|height|min-width|min-height|max-width|max-height)$/,
        (declaration) => {
          dimensions[declaration.prop] = declaration.value;
        },
      );
      if (Object.keys(dimensions).length > 0) {
        iconRules.push({
          file: relativePath,
          line: lineNumber(rule),
          selector: rule.selector,
          dimensions,
        });
      }
    }
  });

  root.walkAtRules((atRule) => {
    const name = atRule.name.toLowerCase();
    if (name === 'media') {
      mediaQueries.push({ file: relativePath, line: lineNumber(atRule), query: atRule.params });
      if (/prefers-reduced-motion/i.test(atRule.params)) reducedMotionRuleCount += 1;
      if (/forced-colors/i.test(atRule.params)) forcedColorsRuleCount += 1;
      for (const match of atRule.params.matchAll(/(?:min|max)-width\s*:\s*([^)]+)/gi)) {
        addCount(breakpoints, match[0].replace(/\s+/g, ' ').toLowerCase());
      }
    }
    if (name.endsWith('keyframes')) {
      keyframes.push({ file: relativePath, line: lineNumber(atRule), name: atRule.params });
    }
  });

  root.walkDecls((declaration) => {
    declarationCount += 1;
    totalDeclarations += 1;
    const context = declarationContext(declaration, fileKind);
    contextDeclarationCounts[context] += 1;
    const occurrence = {
      file: relativePath,
      line: lineNumber(declaration),
      value: declaration.value,
      context,
    };

    if (declaration.prop.startsWith('--')) {
      addOccurrence(customPropertyDefinitions, declaration.prop, occurrence);
      for (const color of collectColorValues(declaration.value)) addCount(tokenColors, color);
    }

    for (const match of declaration.value.matchAll(customPropertyUsagePattern)) {
      addOccurrence(customPropertyUsages, match[1], {
        file: relativePath,
        line: lineNumber(declaration),
        property: declaration.prop,
        context,
      });
    }

    if (!declaration.prop.startsWith('--')) {
      for (const color of collectColorValues(declaration.value)) addCount(directColors, color);
    }

    for (const unit of collectUnits(declaration.value)) addCount(units, unit);
    if (propertyValues[declaration.prop]) {
      addCount(propertyValues[declaration.prop], declaration.value.trim());
    }
  });

  files.push({
    path: relativePath,
    kind: fileKind,
    lines,
    bytes: Buffer.byteLength(css),
    rules: ruleCount,
    declarations: declarationCount,
    importedByCode: importedCssFiles.has(cssFile),
  });
}

const definedTokens = new Set(customPropertyDefinitions.keys());
const usedTokens = new Set(customPropertyUsages.keys());
const unusedTokens = [...definedTokens].filter((token) => !usedTokens.has(token)).sort();
const undefinedTokens = [...usedTokens].filter((token) => !definedTokens.has(token)).sort();
const unreferencedCssModules = files
  .filter((file) => file.path.endsWith('.module.css') && !file.importedByCode)
  .map((file) => file.path)
  .sort();

const inventory = stableSort({
  schemaVersion: 1,
  scope: {
    repositoryRoot: '.',
    sourceRoot: 'apps/web/src',
    excluded: ['node_modules', 'dist', 'build', 'generated dependencies'],
    notes: [
      'Counts describe source files only.',
      'Direct-color and icon-rule detection is approximate and intended for audit prioritization.',
      'Runtime behavior is intentionally outside this static inventory.',
    ],
  },
  summary: {
    cssFiles: files.length,
    cssModules: files.filter((file) => file.path.endsWith('.module.css')).length,
    globalCssFiles: files.filter((file) => file.kind === 'global').length,
    printCssFiles: files.filter((file) => file.kind === 'print').length,
    mixedCssFiles: files.filter((file) => file.kind === 'mixed').length,
    totalLines,
    totalDeclarations,
    componentFiles: components.length,
    componentsWithInlineSvg: inlineSvgComponents.length,
    customPropertiesDefined: definedTokens.size,
    customPropertiesUsed: usedTokens.size,
    unusedTokens: unusedTokens.length,
    undefinedTokens: undefinedTokens.length,
    unreferencedCssModules: unreferencedCssModules.length,
    sourceDigestSha256: sourceDigest.digest('hex'),
  },
  files: files.sort((left, right) => left.path.localeCompare(right.path)),
  largestFilesByLines: [...files]
    .sort((left, right) => right.lines - left.lines || left.path.localeCompare(right.path))
    .slice(0, 15),
  customProperties: {
    definitions: mapToSortedObject(customPropertyDefinitions),
    usages: mapToSortedObject(customPropertyUsages),
    unused: unusedTokens,
    undefined: undefinedTokens,
  },
  colors: {
    directApproximate: countMapToRows(directColors),
    tokenDefinitions: countMapToRows(tokenColors),
  },
  properties: Object.fromEntries(
    trackedProperties.map((property) => [property, countMapToRows(propertyValues[property])]),
  ),
  responsive: {
    mediaQueries: mediaQueries.sort(
      (left, right) =>
        left.file.localeCompare(right.file) ||
        (left.line ?? 0) - (right.line ?? 0) ||
        left.query.localeCompare(right.query),
    ),
    breakpoints: countMapToRows(breakpoints),
    reducedMotionRuleCount,
    forcedColorsRuleCount,
  },
  contexts: {
    declarations: contextDeclarationCounts,
  },
  units: countMapToRows(units),
  states: mapToSortedObject(stateSelectorCounts),
  keyframes: keyframes.sort(
    (left, right) => left.file.localeCompare(right.file) || (left.line ?? 0) - (right.line ?? 0),
  ),
  iconRules: iconRules.sort(
    (left, right) => left.file.localeCompare(right.file) || (left.line ?? 0) - (right.line ?? 0),
  ),
  components: components.sort((left, right) => left.file.localeCompare(right.file)),
  inlineSvgComponents: inlineSvgComponents.sort((left, right) =>
    left.file.localeCompare(right.file),
  ),
  unreferencedCssModules,
});

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');

console.log(`CSS files: ${inventory.summary.cssFiles}`);
console.log(`CSS lines: ${inventory.summary.totalLines}`);
console.log(`CSS declarations: ${inventory.summary.totalDeclarations}`);
console.log(`Component files: ${inventory.summary.componentFiles}`);
console.log(`Defined tokens: ${inventory.summary.customPropertiesDefined}`);
console.log(`Unused tokens: ${inventory.summary.unusedTokens}`);
console.log(`Unreferenced CSS Modules: ${inventory.summary.unreferencedCssModules}`);
console.log(`Source digest: ${inventory.summary.sourceDigestSha256}`);
console.log(`Wrote: ${relativeToRepository(outputPath)}`);
