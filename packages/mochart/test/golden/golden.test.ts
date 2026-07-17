/**
 * Golden DOM snapshot tests for the full chart rendering pipeline.
 *
 * Every demo config from packages/mochart-demo/demos is rendered through the
 * public createChart() API in jsdom. Animations are driven deterministically
 * on a fake clock (requestAnimationFrame + performance.now are faked BEFORE
 * the library is imported, because ChartTweens binds performance.now at
 * module scope). The resulting DOM is normalized and compared against the
 * golden files in ./__snapshots__.
 *
 * The goldens were captured from the mochart-vdom implementation and act as
 * the equivalence oracle for the retained-mode (vdom-free) renderer.
 */
import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MochartConfig, MochartInputConfig, DataProvider } from '../../src';

interface Demo { id: string; config: string; data: string }
/** Rows are decoded from arbitrary demo JSON, so values are intentionally loose. */
type Row = Record<string, any>;

const here = path.dirname(fileURLToPath(import.meta.url));
const demosDir = path.resolve(here, '../../../mochart-demo/demos');

const WIDTH = 800;
const HEIGHT = 600;
const FRAME_MS = 16;
const MAX_FRAMES = 500;

// ---------------------------------------------------------------------------
// demo assets, indexed by basename (configs live in nested folders too)
// ---------------------------------------------------------------------------

function indexJsonFilesByBasename(dir: string, map: Record<string, string> = {}): Record<string, string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      indexJsonFilesByBasename(full, map);
    }
    else if (entry.name.endsWith('.json')) {
      map[entry.name] = full;
    }
  }
  return map;
}

const demosJson = JSON.parse(fs.readFileSync(path.join(demosDir, 'demos.json'), 'utf8'));
const configPaths = indexJsonFilesByBasename(path.join(demosDir, 'config'));
const dataPaths = indexJsonFilesByBasename(path.join(demosDir, 'data'));
const allDemos: Demo[] = [...demosJson.demos, ...demosJson.testDemos];

function loadJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// ---------------------------------------------------------------------------
// library loading — fake timers must be installed before the import
// ---------------------------------------------------------------------------

let mochart: typeof import('../../src');

beforeAll(async () => {
  // jsdom has no SVG layout engine; return zero sizes so the library takes its
  // documented default-bounds fallbacks. Both renderer implementations see the
  // same shims, so snapshots stay comparable.
  // Cast: these text-measurement methods live on SVGTextContentElement in the
  // DOM lib, not the SVGElement base prototype we shim here.
  const svgProto = globalThis.SVGElement.prototype as any;
  if (typeof svgProto.getComputedTextLength !== 'function') {
    svgProto.getComputedTextLength = () => 0;
  }
  if (typeof svgProto.getSubStringLength !== 'function') {
    svgProto.getSubStringLength = () => 0;
  }
  if (typeof svgProto.getBBox !== 'function') {
    svgProto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
  }
  if (typeof globalThis.requestAnimationFrame !== 'function') {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), FRAME_MS) as unknown as number;
    globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }
  vi.useFakeTimers({
    toFake: [
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'
    ]
  });
  mochart = await import('../../src');
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllTimers();
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Advance the fake clock frame by frame until all tweens/timers settle. */
function runFrames(maxFrames = MAX_FRAMES) {
  let frames = 0;
  while (vi.getTimerCount() > 0 && frames < maxFrames) {
    vi.advanceTimersByTime(FRAME_MS);
    frames++;
  }
  return frames;
}

function advanceFrames(count: number) {
  for (let i = 0; i < count && vi.getTimerCount() > 0; i++) {
    vi.advanceTimersByTime(FRAME_MS);
  }
}

const UNIQUE_ID_PREFIXES = [
  '__mochart__chart__', 'tooltip__clippath__', 'title__clippath__', 'legend__clippath__',
  'groupaxistitle__clippath__', 'groupaxisticklabel__clippath__', 'seriesaxistitle__clippath__',
  'linear__gradient__', 'radial__gradient__', 'seriescolor__gradient__'
];
const uniqueIdPattern = new RegExp('(' + UNIQUE_ID_PREFIXES.join('|') + ')(\\d+)', 'g');

/**
 * Normalize markup so snapshots are stable across runs and implementations:
 * per-instance unique id counters, version stamps, and comment placeholder
 * nodes (the vdom renders empty children as comment nodes; the retained
 * renderer uses comments as internal anchors — neither affects rendering).
 */
function normalizeHtml(html: string) {
  return html
    .replace(uniqueIdPattern, '$1N')
    .replace(/ data-mochart-version="[^"]*"/g, '')
    .replace(/<!--[^>]*-->/g, '')
    .replace(/></g, '>\n<');
}

function snapshotFile(demoId: string, stage: string) {
  return path.join(here, '__snapshots__', `${demoId}--${stage}.html`);
}

async function expectSnapshot(container: HTMLElement, demoId: string, stage: string) {
  await expect(normalizeHtml(container.innerHTML)).toMatchFileSnapshot(snapshotFile(demoId, stage));
}

function buildMochartConfig(configBasename: string, { animate = true }: { animate?: boolean } = {}): MochartConfig {
  const raw = loadJson(configPaths[configBasename]);
  const migrated = mochart.migrateConfig(raw) as Record<string, any>;
  migrated.animationConfig = { ...(migrated.animationConfig || {}), animate };
  return mochart.enhanceConfig(migrated as MochartInputConfig);
}

function getGroupProperty(mochartConfig: MochartConfig): string | undefined {
  return mochartConfig.groupAxisConfig ? mochartConfig.groupAxisConfig.property : undefined;
}

function getSeriesProperties(mochartConfig: MochartConfig): string[] {
  return (mochartConfig.seriesConfigs || [])
    .map((seriesConfig) => seriesConfig.property)
    .filter((property): property is string => Boolean(property));
}

function makeProvider(mochartConfig: MochartConfig, rows: Row[]): DataProvider {
  // every demo config defines a group property; the optionality is only for malformed input
  return new mochart.ArrayOfObjectsDataProvider(rows, getGroupProperty(mochartConfig)!) as unknown as DataProvider;
}

/** Deterministic stand-in for the demo app's "randomize values" button. */
function transformValues(mochartConfig: MochartConfig, rows: Row[]): Row[] {
  const seriesProperties = getSeriesProperties(mochartConfig);
  return rows.map((row, rowIndex) => {
    const next = { ...row };
    for (const property of seriesProperties) {
      if (typeof next[property] === 'number') {
        next[property] = Math.round(next[property] * 0.6 + 7 + rowIndex);
      }
    }
    return next;
  });
}

/** Deterministic version of the demo app's "add group" button. */
function addGroupRow(mochartConfig: MochartConfig, rows: Row[]): Row[] {
  const groupProperty = getGroupProperty(mochartConfig);
  if (!groupProperty || rows.length === 0) {
    return rows;
  }
  const values = rows.map((row) => row[groupProperty]);
  const last = values[values.length - 1];
  let nextGroupValue;
  if (typeof last === 'number') {
    nextGroupValue = Math.max(...values.filter((v) => typeof v === 'number')) + 1;
  }
  else if (typeof last === 'string' && !Number.isNaN(Date.parse(last)) && last.includes('-')) {
    const maxTime = Math.max(...values.map((v) => Date.parse(v)));
    nextGroupValue = new Date(maxTime + 24 * 3600 * 1000).toISOString();
  }
  else {
    nextGroupValue = 'NEW1';
  }
  const row = { ...rows[rows.length - 1], [groupProperty]: nextGroupValue };
  const seriesProperties = getSeriesProperties(mochartConfig);
  seriesProperties.forEach((property, i) => {
    if (typeof row[property] === 'number') {
      row[property] = 20 + i * 11;
    }
  });
  return [...rows, row];
}

function removeGroupRow(rows: Row[]): Row[] {
  if (rows.length <= 2) {
    return rows;
  }
  const index = Math.floor(rows.length / 2);
  return rows.filter((_, i) => i !== index);
}

function createContainer() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

// ---------------------------------------------------------------------------
// the suites
// ---------------------------------------------------------------------------

describe.each(allDemos)('demo: $id', (demo) => {
  it('renders and animates deterministically', async () => {
    const mochartConfig = buildMochartConfig(demo.config);
    const originalRows = loadJson(dataPaths[demo.data]);
    const container = createContainer();

    const chart = mochart.createChart(container, {
      mochartConfig,
      dataProvider: makeProvider(mochartConfig, originalRows),
      width: WIDTH,
      height: HEIGHT
    });

    runFrames();
    await expectSnapshot(container, demo.id, 'initial');

    // deterministic value change: snapshot mid-tween and settled
    const changedRows = transformValues(mochartConfig, originalRows);
    chart.update({ dataProvider: makeProvider(mochartConfig, changedRows) });
    advanceFrames(3);
    await expectSnapshot(container, demo.id, 'values-mid-tween');
    runFrames();
    await expectSnapshot(container, demo.id, 'values-settled');

    // group addition, run to completion
    const addedRows = addGroupRow(mochartConfig, changedRows);
    chart.update({ dataProvider: makeProvider(mochartConfig, addedRows) });
    runFrames();
    await expectSnapshot(container, demo.id, 'group-added');

    // group removal, run to completion
    const removedRows = removeGroupRow(addedRows);
    chart.update({ dataProvider: makeProvider(mochartConfig, removedRows) });
    runFrames();
    await expectSnapshot(container, demo.id, 'group-removed');

    chart.destroy();
    expect(container.innerHTML).toBe('');
  });

  it('renders statically with animation disabled', async () => {
    const mochartConfig = buildMochartConfig(demo.config, { animate: false });
    const originalRows = loadJson(dataPaths[demo.data]);
    const container = createContainer();

    const chart = mochart.createChart(container, {
      mochartConfig,
      dataProvider: makeProvider(mochartConfig, originalRows),
      width: WIDTH,
      height: HEIGHT
    });
    runFrames();
    await expectSnapshot(container, demo.id, 'static');

    chart.update({ dataProvider: makeProvider(mochartConfig, transformValues(mochartConfig, originalRows)) });
    runFrames();
    await expectSnapshot(container, demo.id, 'static-updated');

    chart.destroy();
    expect(container.innerHTML).toBe('');
  });
});
