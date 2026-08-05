// Checks that the public API is documented. Four ratchets, matching how the
// pieces of the reference are produced:
//
// - chart props, callbacks, and payload fields must appear in the generated
//   api-reference model (the generator itself fails when a member has no
//   JSDoc or its interface has no page group, so this is the backstop for a
//   member quietly moving to an undocumented interface);
// - public exports from core's index.ts — values and named types alike —
//   must be mentioned in a docs page (the `export type *` wildcard is the
//   exception: that surface is the generated config reference / the .d.ts);
// - `ChartHandle` methods must appear in a docs page as a call —
//   `` `name(` `` — so renaming a method breaks the check;
// - @mochart/export's declared exports must be mentioned in a docs page
//   (the binding packages are covered by the framework-props generator).
//
// Names that are deliberately undocumented go in `undocumented` below, with a
// reason. Usage: tsx scripts/checkApiCoverage.ts (run `npm run gen` first).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.join(scriptDir, '..');
const corePackageDir = path.join(docsDir, '..', 'mochart');
const coreSrcDir = path.join(corePackageDir, 'src');
const apiModelPath = path.join(corePackageDir, 'generated', 'api-reference.json');

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

// name → why it needs no documentation.
const undocumented: Record<string, string> = {};

const docsGlobs = ['guide', 'reference', 'recipes'];

interface ApiReferenceModel {
  pages: { groups: { properties: { key: string }[] }[] }[];
}

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

function readDocumentedPropKeys(): Set<string> {
  if (!fs.existsSync(apiModelPath)) {
    console.error(`✗ ${apiModelPath} not found — run "npm run gen" first`);
    process.exit(1);
  }
  const model = JSON.parse(fs.readFileSync(apiModelPath, 'utf8')) as ApiReferenceModel;
  const keys = new Set<string>();
  for (const page of model.pages) {
    for (const group of page.groups) {
      for (const property of group.properties) {
        keys.add(property.key);
      }
    }
  }
  return keys;
}

function exportedBraceNames(source: string, wantTypeOnly: boolean): string[] {
  const names = new Set<string>();
  const blocks = source.matchAll(/export\s+(type\s+)?\{([^}]*)\}/g);
  for (const [, typeOnly, body] of blocks) {
    if ((typeOnly !== undefined) !== wantTypeOnly) continue;
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

/** Exports declared in place: `export function foo`, `export interface Foo`, … */
function declaredExportNames(source: string): string[] {
  return [...source.matchAll(/^export\s+(?:async\s+)?(?:function|interface|class|const|enum)\s+(\w+)/gm)]
    .flatMap(match => match[1] ?? [])
    .sort();
}

function interfaceMemberNames(source: string, interfaceName: string, sourceLabel: string): string[] {
  const start = source.search(new RegExp(`interface ${interfaceName}\\b`));
  if (start === -1) {
    console.error(`✗ interface ${interfaceName} not found in ${sourceLabel}`);
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
const documentedPropKeys = readDocumentedPropKeys();
const indexSource = fs.readFileSync(path.join(coreSrcDir, 'index.ts'), 'utf8');
const chartTypesSource = fs.readFileSync(path.join(coreSrcDir, 'types', 'chart.ts'), 'utf8');
const createChartSource = fs.readFileSync(path.join(coreSrcDir, 'createChart.ts'), 'utf8');
const exportIndexSource = fs.readFileSync(
  path.join(docsDir, '..', 'mochart-export', 'src', 'index.ts'), 'utf8');

const missing: { kind: string; name: string; where: string }[] = [];
const seen = new Set<string>();

function check(kind: string, name: string, documented: boolean, where: string) {
  if (seen.has(name)) return;
  seen.add(name);
  if (name in undocumented || documented) return;
  missing.push({ kind, name, where });
}

for (const interfaceName of propInterfaces) {
  for (const member of interfaceMemberNames(chartTypesSource, interfaceName, 'types/chart.ts')) {
    check(interfaceName, member, documentedPropKeys.has(member), 'the api-reference model');
  }
}
for (const member of interfaceMemberNames(createChartSource, 'ChartHandle', 'createChart.ts')) {
  check('ChartHandle', member, docsText.includes('`' + member + '('), 'any docs page as a `' + member + '(…)` call');
}
for (const name of exportedBraceNames(indexSource, false)) {
  check('export', name, new RegExp(`\\b${name}\\b`).test(docsText), 'any docs page');
}
for (const name of exportedBraceNames(indexSource, true)) {
  check('type export', name, new RegExp(`\\b${name}\\b`).test(docsText), 'any docs page');
}
for (const name of declaredExportNames(exportIndexSource)) {
  check('@mochart/export', name, new RegExp(`\\b${name}\\b`).test(docsText), 'any docs page');
}

const stale = Object.keys(undocumented).filter(name => !seen.has(name));

if (missing.length > 0) {
  console.error('✗ undocumented public API — document it, or add it to `undocumented` with a reason:\n');
  for (const { kind, name, where } of missing) {
    console.error(`    ${name}  (${kind}) — not in ${where}`);
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

console.log(`✓ all ${seen.size} public exports and chart props are documented`);
