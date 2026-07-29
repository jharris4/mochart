// Checks that every public export and every chart prop, callback, and payload
// field is mentioned somewhere in the docs pages. The config reference is
// generated from the validators and cannot drift; the prop/API pages are
// hand-written prose, so this is what keeps them honest — adding a prop
// without documenting it fails CI instead of shipping an undocumented API.
//
// Names that are deliberately not documented go in `undocumented` below, with
// a reason. Usage: tsx scripts/checkApiCoverage.ts

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(scriptDir, '..');
const coreSrcDir = path.join(docsDir, '..', 'mochart', 'src');

// Prop-bearing interfaces whose members are part of the documented surface.
// `ChartDomAccessors` and `InternalFocus` are intentionally absent: they are
// internals whose only documentation is the shipped `.d.ts`.
const propInterfaces = [
  'ChartEventPayload',
  'ChartFocus',
  'ChartSeriesFilter',
  'ChartSliceClickPayload',
  'ChartFactoryContext',
  'ChartCallbacks',
  'ChartFactories',
  'BaseChartProps',
  'ManagedChartProps',
  'DefaultChartProps'
];

// name → why it needs no docs page mention.
const undocumented: Record<string, string> = {};

const docsGlobs = ['guide', 'reference', 'recipes'];

function readDocsText(): string {
  const files: string[] = [path.join(docsDir, 'index.md')];
  for (const dir of docsGlobs) {
    const walk = (current: string) => {
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.md')) files.push(full);
      }
    };
    walk(path.join(docsDir, dir));
  }
  return files.map(file => fs.readFileSync(file, 'utf8')).join('\n');
}

function exportedValueNames(source: string): string[] {
  const names = new Set<string>();
  const blocks = source.matchAll(/export\s+(type\s+)?\{([^}]*)\}/g);
  for (const [, typeOnly, body] of blocks) {
    if (typeOnly !== undefined) continue; // type-only exports live in the .d.ts
    for (const entry of (body ?? '').split(',')) {
      const trimmed = entry.trim();
      if (trimmed === '') continue;
      // `default as Chart` / `foo as bar` — the public name is the alias.
      const aliased = /\sas\s+(\w+)$/.exec(trimmed);
      names.add(aliased?.[1] ?? trimmed);
    }
  }
  return [...names].sort();
}

function interfaceMemberNames(source: string, interfaceName: string): string[] {
  const start = source.indexOf(`interface ${interfaceName} `);
  if (start === -1) {
    console.error(`✗ interface ${interfaceName} not found in types/chart.ts`);
    process.exit(1);
  }
  const open = source.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let index = open; index < source.length; index++) {
    if (source[index] === '{') depth++;
    else if (source[index] === '}') {
      depth--;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  const body = source.slice(open + 1, end);
  // Two-space indentation = a top-level member; anything deeper is nested.
  return [...body.matchAll(/^ {2}(\w+)\??[?:(]/gm)].flatMap(match => match[1] ?? []);
}

const docsText = readDocsText();
const indexSource = fs.readFileSync(path.join(coreSrcDir, 'index.ts'), 'utf8');
const chartTypesSource = fs.readFileSync(path.join(coreSrcDir, 'types', 'chart.ts'), 'utf8');

const targets: { kind: string; name: string }[] = [];
for (const name of exportedValueNames(indexSource)) {
  targets.push({ kind: 'export', name });
}
for (const interfaceName of propInterfaces) {
  for (const member of interfaceMemberNames(chartTypesSource, interfaceName)) {
    targets.push({ kind: interfaceName, name: member });
  }
}

const missing: { kind: string; name: string }[] = [];
const seen = new Set<string>();
for (const target of targets) {
  if (seen.has(target.name)) continue;
  seen.add(target.name);
  if (target.name in undocumented) continue;
  if (new RegExp(`\\b${target.name}\\b`).test(docsText)) continue;
  missing.push(target);
}

const stale = Object.keys(undocumented).filter(name => !seen.has(name));

if (missing.length > 0) {
  console.error('✗ undocumented public API — add it to a docs page, or to `undocumented` with a reason:\n');
  for (const { kind, name } of missing) {
    console.error(`    ${name}  (${kind})`);
  }
}
if (stale.length > 0) {
  console.error('\n✗ stale `undocumented` entries — these names no longer exist:\n');
  for (const name of stale) {
    console.error(`    ${name}`);
  }
}
if (missing.length > 0 || stale.length > 0) {
  process.exit(1);
}

console.log(`✓ all ${seen.size} public exports and chart props are mentioned in the docs`);
