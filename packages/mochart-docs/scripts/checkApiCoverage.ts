// Checks that the public API is documented. Five ratchets, matching how the
// pieces of the reference are produced:
//
// - chart props, callbacks, and payload fields must appear in the generated
//   api-reference model (the generator itself fails when a member has no
//   JSDoc or its interface has no page group, so this is the backstop for a
//   member quietly moving to an undocumented interface);
// - public exports from core's index.ts — values and named types alike, in
//   any export syntax, resolved through the TypeScript checker — must be
//   mentioned in a docs page. Exports declared under src/types/ are the
//   exception: that surface is the generated config reference / the .d.ts;
// - `ChartHandle` methods must appear in a docs page as a call —
//   `` `name(` `` — so renaming a method breaks the check;
// - @mochart/export's exports (checker-resolved, like core's) must be
//   mentioned in a docs page (the binding packages are covered by the
//   framework-props generator);
// - the non-JS surface — core's subpath exports (the optional stylesheet)
//   and the IIFE script-tag artifact — must be mentioned in a docs page.
//   (@mochart/editor is exempt until it gets a docs page; add it here then.)
//
// Names that are deliberately undocumented go in `undocumented` below, with a
// reason. Usage: tsx scripts/checkApiCoverage.ts (run `npm run gen` first).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

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

/**
 * Every export of the module at `entryPath`, resolved through the TypeScript
 * checker so the syntax cannot create blind spots: brace re-exports, inline
 * declarations, `export * from`, and `export type *` all land in the
 * module's export table. Each name carries the files its (alias-resolved)
 * declarations live in, so callers can exempt whole surfaces by path.
 */
function moduleExports(entryPath: string): { name: string; declarationFiles: string[] }[] {
  const program = ts.createProgram([entryPath], {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    customConditions: ['development'],
    skipLibCheck: true
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(entryPath);
  const moduleSymbol = sourceFile === undefined ? undefined : checker.getSymbolAtLocation(sourceFile);
  if (moduleSymbol === undefined) {
    console.error(`✗ could not resolve the module at ${entryPath}`);
    process.exit(1);
  }
  const exports = checker.getExportsOfModule(moduleSymbol).map(symbol => {
    const resolved = (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;
    return {
      name: symbol.name,
      declarationFiles: (resolved.declarations ?? []).map(declaration => declaration.getSourceFile().fileName)
    };
  });
  if (exports.length === 0) {
    console.error(`✗ found no exports at ${entryPath} — the coverage check would be vacuous`);
    process.exit(1);
  }
  return exports.sort((a, b) => a.name.localeCompare(b.name));
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
const chartTypesSource = fs.readFileSync(path.join(coreSrcDir, 'types', 'chart.ts'), 'utf8');
const createChartSource = fs.readFileSync(path.join(coreSrcDir, 'createChart.ts'), 'utf8');

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
// Types declared under src/types are the `export type *` wildcard surface —
// the generated config reference / shipped .d.ts, not docs-page material.
const coreTypesDir = path.join(coreSrcDir, 'types') + path.sep;
for (const { name, declarationFiles } of moduleExports(path.join(coreSrcDir, 'index.ts'))) {
  if (declarationFiles.length > 0 && declarationFiles.every(file => file.startsWith(coreTypesDir))) continue;
  check('export', name, new RegExp(`\\b${name}\\b`).test(docsText), 'any docs page');
}
for (const { name } of moduleExports(path.join(docsDir, '..', 'mochart-export', 'src', 'index.ts'))) {
  check('@mochart/export', name, new RegExp(`\\b${name}\\b`).test(docsText), 'any docs page');
}

// Non-JS surface: subpath exports (the optional stylesheet) and the IIFE
// script-tag artifact.
const corePackageJson = JSON.parse(fs.readFileSync(path.join(corePackageDir, 'package.json'), 'utf8')) as { exports?: Record<string, unknown> };
for (const subpath of Object.keys(corePackageJson.exports ?? {})) {
  if (subpath === '.') continue;
  const specifier = '@mochart/core' + subpath.slice(1);
  check('subpath export', specifier, docsText.includes(specifier), 'any docs page');
}
const viteConfigSource = fs.readFileSync(path.join(corePackageDir, 'vite.config.ts'), 'utf8');
const iifeArtifact = /'([\w.-]+\.iife\.js)'/.exec(viteConfigSource)?.[1];
if (iifeArtifact === undefined) {
  console.error('✗ could not find the IIFE artifact name in core vite.config.ts');
  process.exit(1);
}
check('script-tag artifact', iifeArtifact, docsText.includes(iifeArtifact), 'any docs page');

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
