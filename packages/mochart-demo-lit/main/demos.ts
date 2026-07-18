import demoConfig from '../../mochart-demo/demos/demos.json';

import type { Demo, DemoData, RandomConfig, DataRow } from '../src/types';
import type { MochartInputConfig } from 'mochart';

type JsonModule = { default: unknown };
type ModuleMap = Record<string, JsonModule>;

interface DemoEntry {
  id: string;
  title: string;
  config: string;
  data: string;
  random: string;
}

const configModules = import.meta.glob('../../mochart-demo/demos/config/*.json', { eager: true }) as ModuleMap;
const testConfigModules = import.meta.glob('../../mochart-demo/demos/config/test/*.json', { eager: true }) as ModuleMap;
const dataModules = import.meta.glob('../../mochart-demo/demos/data/*.json', { eager: true }) as ModuleMap;
const randomModules = import.meta.glob('../../mochart-demo/demos/random/*.json', { eager: true }) as ModuleMap;

function getModule(modules: ModuleMap, dir: string, file: string): unknown {
  const mod = modules[dir + file];
  if (mod === void 0) {
    throw new Error('demo file not found: ' + dir + file);
  }
  return mod.default;
}

const { demos, testDemos } = demoConfig as { demos: DemoEntry[]; testDemos: DemoEntry[] };

const demoIds: string[] = [];
const demoObjectMap: Record<string, Demo> = {};

const testDemoIds: string[] = [];

function buildDemo(demo: DemoEntry, configModuleMap: ModuleMap, configDir: string): Demo {
  const { id, title, config, data, random } = demo;
  return {
    id,
    title,
    config: Object.assign(
      {},
      getModule(configModuleMap, configDir, config) as MochartInputConfig & Record<string, unknown>
    ),
    data: (getModule(dataModules, '../../mochart-demo/demos/data/', data) as DataRow[]).slice(),
    random: Object.assign({}, getModule(randomModules, '../../mochart-demo/demos/random/', random) as RandomConfig)
  };
}

demos.forEach(entry => {
  const demo = buildDemo(entry, configModules, '../../mochart-demo/demos/config/');
  demoIds.push(demo.id);
  demoObjectMap[demo.id] = demo;
});

testDemos.forEach(entry => {
  const demo = buildDemo(entry, testConfigModules, '../../mochart-demo/demos/config/test/');
  testDemoIds.push(demo.id);
  demoObjectMap[demo.id] = demo;
});

const demoData: DemoData = {
  demoIds,
  demoObjectMap,
  testDemoIds
};

export default demoData;
