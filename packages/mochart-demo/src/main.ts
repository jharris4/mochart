import {
  createChart,
  migrateConfig,
  enhanceConfig,
  ArrayOfObjectsDataProvider
} from 'mochart';
import type { ChartHandle } from 'mochart';
import demosJson from '../demos/demos.json';

// eagerly bundle every demo config + dataset + random spec, keyed by basename
const configModules = import.meta.glob('../demos/config/**/*.json', { eager: true, import: 'default' });
const dataModules = import.meta.glob('../demos/data/**/*.json', { eager: true, import: 'default' });
const randomModules = import.meta.glob('../demos/random/**/*.json', { eager: true, import: 'default' });

interface DemoEntry {
  id: string;
  title: string;
  config: string;
  data: string;
  random?: string;
}

interface SeriesBounds {
  min: number;
  max: number;
  round: boolean;
}

const byBasename = (modules: Record<string, any>) => {
  const map: Record<string, any> = {};
  for (const path in modules) {
    map[path.split('/').pop() as string] = modules[path];
  }
  return map;
};

const configs = byBasename(configModules);
const datasets = byBasename(dataModules);
const randomSpecs = byBasename(randomModules);

const demoSections: { section: string; entries: DemoEntry[] }[] = [
  { section: 'Demos', entries: (demosJson as any).demos },
  { section: 'Test Demos', entries: (demosJson as any).testDemos }
];

const demoList = document.getElementById('demo-list') as HTMLDivElement;
const demoTitle = document.getElementById('demo-title') as HTMLSpanElement;
const chartHost = document.getElementById('chart-host') as HTMLDivElement;
const errorsPane = document.getElementById('errors') as HTMLPreElement;
const randomizeButton = document.getElementById('randomize') as HTMLButtonElement;
const addGroupButton = document.getElementById('add-group') as HTMLButtonElement;
const removeGroupButton = document.getElementById('remove-group') as HTMLButtonElement;
const autoplayButton = document.getElementById('autoplay') as HTMLButtonElement;
const resetButton = document.getElementById('reset') as HTMLButtonElement;

let chart: ChartHandle | null = null;
let currentDemo: DemoEntry | null = null;
let mochartConfig: any = null;
let groupProperty: string | undefined;
let seriesProperties: string[] = [];
let seriesBounds: Record<string, SeriesBounds> = {};
let originalData: any[] = [];
let currentData: any[] = [];
let autoplayTimer: number | null = null;
let groupCounter = 0;

function showErrors(messages: string[]): void {
  errorsPane.hidden = messages.length === 0;
  errorsPane.textContent = messages.join('\n');
}

// Per-property value bounds from the demo's random spec, clamped to the
// series axis config (when limitToAxisConfig) so random values never land
// outside a fixed axis range.
function computeSeriesBounds(config: any, randomSpec: any): Record<string, SeriesBounds> {
  const numberSpec = randomSpec?.series?.number ?? {};
  const { min = -500, max = 500, round = true, limitToAxisConfig = true } = numberSpec;
  const bounds: Record<string, SeriesBounds> = {};
  for (const seriesConfig of config.seriesConfigs || []) {
    const axisConfig = seriesConfig.seriesAxisConfig || {};
    for (const key of ['property', 'rangeProperty']) {
      const property = seriesConfig[key];
      if (!property) {
        continue;
      }
      bounds[property] = {
        min: limitToAxisConfig && typeof axisConfig.min === 'number' ? axisConfig.min : min,
        max: limitToAxisConfig && typeof axisConfig.max === 'number' ? axisConfig.max : max,
        round
      };
    }
  }
  return bounds;
}

function randomValue({ min, max, round }: SeriesBounds): number {
  const value = min + Math.random() * (max - min);
  return round ? Math.round(value) : value;
}

function makeDataProvider(): any {
  if (groupProperty === undefined) {
    throw new Error('Cannot create a data provider without a group property');
  }
  return new ArrayOfObjectsDataProvider(currentData, groupProperty);
}

function mountDemo(demo: DemoEntry): void {
  currentDemo = demo;
  demoTitle.textContent = demo.title;
  stopAutoplay();

  const rawConfig = configs[demo.config];
  const rawData = datasets[demo.data];
  if (!rawConfig || !rawData) {
    showErrors(['missing demo assets: ' + demo.config + ' / ' + demo.data]);
    return;
  }

  const config = migrateConfig(JSON.parse(JSON.stringify(rawConfig)));
  mochartConfig = enhanceConfig(config);
  const { valid, errors, warnings } = mochartConfig.validation;
  showErrors(valid ? [] : [...errors, ...warnings]);

  groupProperty = mochartConfig.groupAxisConfig ? mochartConfig.groupAxisConfig.property : undefined;
  const randomSpec = (demo.random && randomSpecs[demo.random]) || randomSpecs['default-random.json'];
  seriesBounds = computeSeriesBounds(mochartConfig, randomSpec);
  seriesProperties = Object.keys(seriesBounds);
  originalData = rawData as any[];
  currentData = originalData.map((row) => ({ ...row }));
  groupCounter = 0;

  if (chart) {
    chart.destroy();
    chart = null;
  }
  chartHost.innerHTML = '';

  const { width, height } = chartHost.getBoundingClientRect();
  chart = createChart(chartHost, {
    mochartConfig,
    dataProvider: makeDataProvider(),
    width: Math.floor(width),
    height: Math.floor(height)
  });

  for (const button of demoList.querySelectorAll('button')) {
    button.classList.toggle('active', button.dataset.id === demo.id);
  }
  location.hash = demo.id;
}

function randomizeValues(): void {
  currentData = currentData.map((row) => {
    const next = { ...row };
    for (const property of seriesProperties) {
      if (typeof next[property] === 'number') {
        next[property] = randomValue(seriesBounds[property]);
      }
    }
    return next;
  });
  chart?.update({ dataProvider: makeDataProvider() });
}

function nextGroupValue(): any {
  const values = currentData.map((row) => row[groupProperty as string]);
  const last = values[values.length - 1];
  groupCounter++;
  if (typeof last === 'number') {
    return Math.max(...values.filter((v) => typeof v === 'number')) + 1;
  }
  if (typeof last === 'string' && !Number.isNaN(Date.parse(last)) && last.includes('-')) {
    const maxTime = Math.max(...values.map((v) => Date.parse(v)));
    return new Date(maxTime + 24 * 3600 * 1000).toISOString();
  }
  return 'NEW' + groupCounter;
}

function addGroup(): void {
  if (!groupProperty || currentData.length === 0) {
    return;
  }
  const template = currentData[currentData.length - 1];
  const row: any = { ...template, [groupProperty]: nextGroupValue() };
  for (const property of seriesProperties) {
    if (typeof row[property] === 'number') {
      row[property] = randomValue(seriesBounds[property]);
    }
  }
  currentData = [...currentData, row];
  chart?.update({ dataProvider: makeDataProvider() });
}

function removeGroup(): void {
  if (currentData.length <= 2) {
    return;
  }
  const index = Math.floor(Math.random() * currentData.length);
  currentData = currentData.filter((_, i) => i !== index);
  chart?.update({ dataProvider: makeDataProvider() });
}

function resetData(): void {
  stopAutoplay();
  currentData = originalData.map((row) => ({ ...row }));
  chart?.update({ dataProvider: makeDataProvider() });
}

function stopAutoplay(): void {
  if (autoplayTimer !== null) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
    autoplayButton.textContent = 'Play';
    autoplayButton.classList.remove('on');
  }
}

function toggleAutoplay(): void {
  if (autoplayTimer !== null) {
    stopAutoplay();
    return;
  }
  autoplayButton.textContent = 'Stop';
  autoplayButton.classList.add('on');
  autoplayTimer = window.setInterval(() => {
    const roll = Math.random();
    if (roll < 0.15) {
      addGroup();
    }
    else if (roll < 0.3) {
      removeGroup();
    }
    else {
      randomizeValues();
    }
  }, 1600);
}

randomizeButton.addEventListener('click', randomizeValues);
addGroupButton.addEventListener('click', addGroup);
removeGroupButton.addEventListener('click', removeGroup);
autoplayButton.addEventListener('click', toggleAutoplay);
resetButton.addEventListener('click', resetData);

new ResizeObserver(() => {
  if (chart) {
    const { width, height } = chartHost.getBoundingClientRect();
    chart.update({ width: Math.floor(width), height: Math.floor(height) });
  }
}).observe(chartHost);

// build the sidebar
for (const { section, entries } of demoSections) {
  const heading = document.createElement('div');
  heading.className = 'section';
  heading.textContent = section;
  demoList.appendChild(heading);
  for (const demo of entries) {
    const button = document.createElement('button');
    button.textContent = demo.title;
    button.dataset.id = demo.id;
    button.addEventListener('click', () => mountDemo(demo));
    demoList.appendChild(button);
  }
}

const allDemos = demoSections.flatMap((s) => s.entries);
const initial = allDemos.find((demo) => demo.id === location.hash.slice(1)) || allDemos[0];
if (initial) {
  mountDemo(initial);
}
