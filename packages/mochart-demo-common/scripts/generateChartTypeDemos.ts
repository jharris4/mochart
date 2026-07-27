// Rebuilds the chart-type demos' static config/data JSON in
// @mochart/demo-data from the canonical inputs in src/chartTypeGenerators.ts,
// so the baked snapshots and the random-mode generators can never drift
// structurally. Run after changing the canonical inputs or the core helpers:
//
//   npm run generate-demos -w @mochart/demo-common

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildChartTypeDemoSnapshots } from '../src/chartTypeGenerators';

const demoDataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'mochart-demo-data', 'src');

// Matches the hand-written demo data files: one row object per line.
function formatDataRows(rows: unknown[]): string {
  return '[\n' + rows.map(row => '  ' + JSON.stringify(row)).join(',\n') + '\n]\n';
}

for (const snapshot of buildChartTypeDemoSnapshots()) {
  const configPath = path.join(demoDataDir, 'config', snapshot.id + '-config.json');
  const dataPath = path.join(demoDataDir, 'data', snapshot.id + '-data.json');
  fs.writeFileSync(configPath, JSON.stringify(snapshot.config, null, 2) + '\n');
  fs.writeFileSync(dataPath, formatDataRows(snapshot.data));
  console.log('wrote ' + configPath);
  console.log('wrote ' + dataPath);
}
