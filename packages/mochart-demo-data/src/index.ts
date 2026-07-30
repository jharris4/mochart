import demosJson from './demos.json';

import type { DataRow, Demo, DemoConfig, DemoData, DemoManifestEntry, DemoRandomConfig } from './types';

export type {
  DataRow, Demo, DemoConfig, DemoData, DemoManifestEntry, DemoRandomConfig,
  ErrorBarsRandomConfig, HeatmapRandomConfig, HistogramRandomConfig, PieRandomConfig,
  RandomConfig, WalkRandomConfig, WaterfallRandomConfig
} from './types';

type ModuleMap = Record<string, unknown>;

const configModules = import.meta.glob('./config/*.json', { eager: true, import: 'default' }) as ModuleMap;
const testConfigModules = import.meta.glob('./config/test/*.json', { eager: true, import: 'default' }) as ModuleMap;
const dataModules = import.meta.glob('./data/*.json', { eager: true, import: 'default' }) as ModuleMap;
const randomModules = import.meta.glob('./random/*.json', { eager: true, import: 'default' }) as ModuleMap;

function getModule(modules: ModuleMap, dir: string, file: string): unknown {
  const mod = modules[dir + file];
  if (mod === undefined) {
    throw new Error('demo file not found: ' + dir + file);
  }
  return mod;
}

const { demos, testDemos } = demosJson as { demos: DemoManifestEntry[]; testDemos: DemoManifestEntry[] };

function buildDemo(entry: DemoManifestEntry, configModuleMap: ModuleMap, configDir: string): Demo {
  const { id, title, description, notes, config, data, random, generator } = entry;
  return {
    id,
    title,
    description,
    notes,
    config: Object.assign({}, getModule(configModuleMap, configDir, config) as DemoConfig),
    data: (getModule(dataModules, './data/', data) as DataRow[]).slice(),
    random: Object.assign({}, getModule(randomModules, './random/', random) as DemoRandomConfig),
    generator
  };
}

const demoIds: string[] = [];
const testDemoIds: string[] = [];
const demoObjectMap: Record<string, Demo> = {};

demos.forEach(entry => {
  const demo = buildDemo(entry, configModules, './config/');
  demoIds.push(demo.id);
  demoObjectMap[demo.id] = demo;
});

testDemos.forEach(entry => {
  const demo = buildDemo(entry, testConfigModules, './config/test/');
  testDemoIds.push(demo.id);
  demoObjectMap[demo.id] = demo;
});

const demoData: DemoData = {
  demoIds,
  demoObjectMap,
  testDemoIds
};

export default demoData;
