// Checks that the usage-index section registries cover every config section
// the core enhancer emits, so a new section can't silently lose its "Used in"
// links (the drift CONTRIBUTING.md's "Adding a new config section" list warns
// about). Object/list classification and the *Defaults companion map are
// verified against core's `sectionKeyAllMap`.
// Usage: tsx --conditions=development scripts/checkSectionCoverage.ts

import { enhanceConfig, sectionKeyAllMap } from '@mochart/core';
import { objectSectionIds, listSectionIds, allKeySectionMap } from '../.vitepress/lib/usageIndex';

const enhanced = enhanceConfig({
  version: '1.0.0',
  categoryAxis: { property: 'x', type: 'string', scale: 'ordinal' },
  series: [{ property: 'y' }]
}) as unknown as Record<string, unknown>;

// top-level enhanced keys that are not config sections
const nonSectionKeys = new Set(['version', 'validation']);
const sectionIds = Object.keys(enhanced).filter((key) => !nonSectionKeys.has(key) && !key.endsWith('ById'));

const problems: string[] = [];

for (const sectionId of sectionIds) {
  const isList = sectionKeyAllMap[sectionId] !== undefined;
  const expected = isList ? listSectionIds : objectSectionIds;
  const other = isList ? objectSectionIds : listSectionIds;
  if (!expected.has(sectionId)) {
    problems.push(`${sectionId} — missing from ${isList ? 'listSectionIds' : 'objectSectionIds'}`);
  }
  if (other.has(sectionId)) {
    problems.push(`${sectionId} — in ${isList ? 'objectSectionIds' : 'listSectionIds'} but is a ${isList ? 'list' : 'object'} section`);
  }
}

for (const id of [...objectSectionIds, ...listSectionIds]) {
  if (!sectionIds.includes(id)) {
    problems.push(`${id} — registered but the enhancer emits no such section`);
  }
}

for (const [sectionId, defaultsKey] of Object.entries(sectionKeyAllMap)) {
  if (allKeySectionMap[defaultsKey] !== sectionId) {
    problems.push(`${defaultsKey} — allKeySectionMap maps it to ${allKeySectionMap[defaultsKey] ?? 'nothing'}, expected ${sectionId}`);
  }
}
for (const defaultsKey of Object.keys(allKeySectionMap)) {
  if (Object.values(sectionKeyAllMap).indexOf(defaultsKey) === -1) {
    problems.push(`${defaultsKey} — in allKeySectionMap but core has no such *Defaults key`);
  }
}

if (problems.length > 0) {
  console.error('✗ usage-index section registries are out of sync with the core sections:\n');
  for (const problem of problems) {
    console.error(`    ${problem}`);
  }
  process.exit(1);
}

console.log(`✓ usage index covers all ${sectionIds.length} config sections`);
