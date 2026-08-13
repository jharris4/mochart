import type { EnhancedMochartConfig } from '../../src/types/enhanced';
/**
 * Golden DOM snapshot tests for the full chart rendering pipeline.
 *
 * Every demo config from packages/mochart-demo-data/src is rendered through the
 * public createChart() API in jsdom. Animations are driven deterministically
 * on a fake clock (requestAnimationFrame + performance.now). The resulting
 * DOM is normalized and compared against the golden files in ./__snapshots__.
 *
 * The goldens were captured from the mochart-vdom implementation and act as
 * the equivalence oracle for the retained-mode (vdom-free) renderer.
 */
import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MochartInputConfig, DataProvider } from '../../src';
import { getCssSelector, getIdCssSelector, mochartVersionAttribute } from '../../src/utils/ChartDom';
import { installTextMetrics } from './textMetrics';

interface Demo { id: string; config: string; data: string; goldenCategoryShift?: number }
/** Rows are decoded from arbitrary demo JSON, so values are intentionally loose. */
type Row = Record<string, any>;

// headroom for saturated coverage runs, which starve these past the 30s default
vi.setConfig({ testTimeout: 120_000 });

const here = path.dirname(fileURLToPath(import.meta.url));
const demosDir = path.resolve(here, '../../../mochart-demo-data/src');

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
  // jsdom has no font or layout engine; install the deterministic synthetic
  // font so the goldens capture real measured text (truncation, tick pruning,
  // layout fitting) instead of the library's default-bounds fallbacks.
  installTextMetrics();
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
  'categoryaxistitle__clippath__', 'categoryaxisticklabel__clippath__', 'seriesaxistitle__clippath__',
  'series__clippath__', 'clipindicator__pattern__', 'linear__gradient__', 'radial__gradient__', 'seriescolor__gradient__'
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
    .replace(new RegExp(' ' + mochartVersionAttribute + '="[^"]*"', 'g'), '')
    .replace(/<!--[^>]*-->/g, '')
    .replace(/></g, '>\n<');
}

function snapshotFile(demoId: string, stage: string) {
  return path.join(here, '__snapshots__', `${demoId}--${stage}.html`);
}

async function expectSnapshot(container: HTMLElement, demoId: string, stage: string) {
  await expect(normalizeHtml(container.innerHTML)).toMatchFileSnapshot(snapshotFile(demoId, stage));
}

function buildMochartConfig(
  configBasename: string,
  { animate = true, mutate }: { animate?: boolean; mutate?: (raw: Record<string, any>) => void } = {}
): EnhancedMochartConfig {
  const raw = loadJson(configPaths[configBasename]);
  const migrated = mochart.migrateConfig(raw) as Record<string, any>;
  migrated.animation = { ...(migrated.animation || {}), animate };
  mutate?.(migrated);
  return mochart.enhanceConfig(migrated as MochartInputConfig) as EnhancedMochartConfig;
}

function getCategoryProperty(mochartConfig: EnhancedMochartConfig): string | undefined {
  return mochartConfig.categoryAxis ? mochartConfig.categoryAxis.property : undefined;
}

function getSeriesProperties(mochartConfig: EnhancedMochartConfig): string[] {
  return (mochartConfig.series || [])
    .map((seriesConfig) => seriesConfig.property)
    .filter((property): property is string => Boolean(property));
}

function makeProvider(rows: Row[]): DataProvider {
  return new mochart.ArrayOfObjectsDataProvider(rows);
}

/** Deterministic stand-in for the demo app's "randomize values" button. */
function transformValues(mochartConfig: EnhancedMochartConfig, rows: Row[]): Row[] {
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

/** Window slide for demos declaring goldenCategoryShift: days on date axes, value units on numeric. */
function shiftCategories(mochartConfig: EnhancedMochartConfig, rows: Row[], shift: number): Row[] {
  const categoryProperty = getCategoryProperty(mochartConfig);
  if (!categoryProperty) {
    return rows;
  }
  return rows.map((row) => {
    const value = row[categoryProperty];
    const next = { ...row };
    if (typeof value === 'number') {
      next[categoryProperty] = value + shift;
    }
    else if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
      next[categoryProperty] = new Date(Date.parse(value) + shift * 24 * 3600 * 1000).toISOString();
    }
    return next;
  });
}

/** Deterministic version of the demo app's "add category" button. */
function addCategoryRow(mochartConfig: EnhancedMochartConfig, rows: Row[]): Row[] {
  const categoryProperty = getCategoryProperty(mochartConfig);
  if (!categoryProperty || rows.length === 0) {
    return rows;
  }
  const values = rows.map((row) => row[categoryProperty]);
  const last = values[values.length - 1];
  let nextCategoryValue;
  if (typeof last === 'number') {
    nextCategoryValue = Math.max(...values.filter((v) => typeof v === 'number')) + 1;
  }
  else if (typeof last === 'string' && !Number.isNaN(Date.parse(last)) && last.includes('-')) {
    const maxTime = Math.max(...values.map((v) => Date.parse(v)));
    nextCategoryValue = new Date(maxTime + 24 * 3600 * 1000).toISOString();
  }
  else {
    nextCategoryValue = 'NEW1';
  }
  const row = { ...rows[rows.length - 1], [categoryProperty]: nextCategoryValue };
  const seriesProperties = getSeriesProperties(mochartConfig);
  seriesProperties.forEach((property, i) => {
    if (typeof row[property] === 'number') {
      row[property] = 20 + i * 11;
    }
  });
  return [...rows, row];
}

function removeCategoryRow(rows: Row[]): Row[] {
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
      dataProvider: makeProvider(originalRows),
      width: WIDTH,
      height: HEIGHT
    });

    runFrames();
    await expectSnapshot(container, demo.id, 'initial');

    // deterministic value change: snapshot mid-tween and settled
    const changedRows = transformValues(mochartConfig, originalRows);
    chart.update({ dataProvider: makeProvider(changedRows) });
    advanceFrames(3);
    await expectSnapshot(container, demo.id, 'values-mid-tween');
    runFrames();
    await expectSnapshot(container, demo.id, 'values-settled');

    // category addition, run to completion
    const addedRows = addCategoryRow(mochartConfig, changedRows);
    chart.update({ dataProvider: makeProvider(addedRows) });
    runFrames();
    await expectSnapshot(container, demo.id, 'category-added');

    // category removal, run to completion
    const removedRows = removeCategoryRow(addedRows);
    chart.update({ dataProvider: makeProvider(removedRows) });
    runFrames();
    await expectSnapshot(container, demo.id, 'category-removed');

    chart.destroy();
    expect(container.innerHTML).toBe('');
  });

  it('renders statically with animation disabled', async () => {
    const mochartConfig = buildMochartConfig(demo.config, { animate: false });
    const originalRows = loadJson(dataPaths[demo.data]);
    const container = createContainer();

    const chart = mochart.createChart(container, {
      mochartConfig,
      dataProvider: makeProvider(originalRows),
      width: WIDTH,
      height: HEIGHT
    });
    runFrames();
    await expectSnapshot(container, demo.id, 'static');

    chart.update({ dataProvider: makeProvider(transformValues(mochartConfig, originalRows)) });
    runFrames();
    await expectSnapshot(container, demo.id, 'static-updated');

    chart.destroy();
    expect(container.innerHTML).toBe('');
  });

  // opt-in via goldenCategoryShift: a window slide big enough to classify as a
  // translation, so the mid-tween frame captures the domain mid-slide
  if (demo.goldenCategoryShift !== undefined) {
    it('slides the category window deterministically', async () => {
      const mochartConfig = buildMochartConfig(demo.config);
      const originalRows = loadJson(dataPaths[demo.data]);
      const container = createContainer();

      const chart = mochart.createChart(container, {
        mochartConfig,
        dataProvider: makeProvider(originalRows),
        width: WIDTH,
        height: HEIGHT
      });
      runFrames();

      const shiftedRows = shiftCategories(mochartConfig, originalRows, demo.goldenCategoryShift!);
      chart.update({ dataProvider: makeProvider(shiftedRows) });
      advanceFrames(3);
      await expectSnapshot(container, demo.id, 'slide-mid-tween');
      runFrames();
      await expectSnapshot(container, demo.id, 'slide-settled');

      chart.destroy();
      expect(container.innerHTML).toBe('');
    });
  }
});

// ---------------------------------------------------------------------------
// series filtering via legend click — the per-demo suites never filter a
// series, and the tween's resting value (the axis base) only shows up
// mid-filtering: a wrong base strands the shrink partway so the shape pops
// out at animation end while still visibly large. The tween moves at constant
// axis-relative speed, so a wrong resting value doesn't change the trajectory,
// only where it stops — a fixed-frame snapshot can miss it. The oracle is the
// LAST frame the filtered series is still in the DOM: correct code shows a
// vanishing sliver there, a wrong base shows the stranded shape. The radial
// demos cover the pie-mode base-0 default; grouped is the xy control (bars
// correctly collapse onto the axis base line).
// ---------------------------------------------------------------------------

const FILTERING_DEMO_IDS = ['pie', 'donut', 'gauge', 'grouped'];
const filteringDemos = allDemos.filter((demo) => FILTERING_DEMO_IDS.includes(demo.id));

function clickFirstLegendItem(container: HTMLElement) {
  const legendItem = container.querySelector(getCssSelector('legendItem'));
  expect(legendItem).not.toBeNull();
  legendItem!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}

describe.each(filteringDemos)('filtering: $id', (demo) => {
  it('animates a legend-click filtering out and back in', async () => {
    const mochartConfig = buildMochartConfig(demo.config);
    const rows = loadJson(dataPaths[demo.data]);
    const container = createContainer();

    const chart = mochart.createChart(container, {
      mochartConfig,
      dataProvider: makeProvider(rows),
      width: WIDTH,
      height: HEIGHT
    });
    runFrames();

    clickFirstLegendItem(container);
    advanceFrames(3);
    await expectSnapshot(container, demo.id, 'filter-early-tween');

    // step to the removal of the filtered series' element, keeping the DOM
    // of the last frame it was still present
    const seriesSelector = getIdCssSelector('series', mochartConfig.series[0].id);
    expect(container.querySelector(seriesSelector)).not.toBeNull();
    let lastPresentHtml = container.innerHTML;
    for (let frame = 0; frame < MAX_FRAMES && vi.getTimerCount() > 0; frame++) {
      vi.advanceTimersByTime(FRAME_MS);
      if (container.querySelector(seriesSelector) === null) {
        break;
      }
      lastPresentHtml = container.innerHTML;
    }
    expect(container.querySelector(seriesSelector)).toBeNull();
    await expect(normalizeHtml(lastPresentHtml)).toMatchFileSnapshot(snapshotFile(demo.id, 'filter-last-frame'));
    runFrames();
    await expectSnapshot(container, demo.id, 'filter-settled');

    // unfilter: the series animates back in from the same resting value
    clickFirstLegendItem(container);
    runFrames();
    await expectSnapshot(container, demo.id, 'filter-restored');

    chart.destroy();
    expect(container.innerHTML).toBe('');
  });
});

// ---------------------------------------------------------------------------
// config updates on a live chart — exercises Chart.derive's incremental vs
// full-rebuild branches and ChartController's animate-toggle source swap,
// which the per-demo suites above never reach (they only update data)
// ---------------------------------------------------------------------------

describe('config updates on a mounted chart', () => {
  const demo = allDemos.find((aDemo) => aDemo.id === 'grouped')!;

  function mountGrouped(mochartConfig: EnhancedMochartConfig, rows: Row[]) {
    const container = createContainer();
    const chart = mochart.createChart(container, {
      mochartConfig,
      dataProvider: makeProvider(rows),
      width: WIDTH,
      height: HEIGHT
    });
    runFrames();
    return { container, chart };
  }

  it('applies a non-structural config change incrementally (title, series title, renderer)', async () => {
    const mochartConfig = buildMochartConfig(demo.config);
    const rows = loadJson(dataPaths[demo.data]);
    const { container, chart } = mountGrouped(mochartConfig, rows);

    const changedConfig = buildMochartConfig(demo.config, {
      mutate: (raw) => {
        raw.title.text = 'Updated Title';
        raw.series[1].title = 'Renamed Series';
        raw.seriesDefaults.renderer = 'line';
      }
    });
    // renderer/title changes must take the incremental derive path, not a rebuild
    expect(mochart.hasConfigStructureChange(mochartConfig, changedConfig)).toBe(false);

    chart.update({ mochartConfig: changedConfig });
    advanceFrames(3);
    await expectSnapshot(container, demo.id, 'config-nonstructural-mid-tween');
    runFrames();
    await expectSnapshot(container, demo.id, 'config-nonstructural-settled');

    chart.destroy();
    expect(container.innerHTML).toBe('');
  });

  it('rebuilds on a structural config change (series removed, then restored)', async () => {
    const mochartConfig = buildMochartConfig(demo.config);
    const rows = loadJson(dataPaths[demo.data]);
    const { container, chart } = mountGrouped(mochartConfig, rows);
    const initialHtml = normalizeHtml(container.innerHTML);

    const removedConfig = buildMochartConfig(demo.config, {
      mutate: (raw) => {
        raw.series.pop();
      }
    });
    expect(mochart.hasConfigStructureChange(mochartConfig, removedConfig)).toBe(true);

    chart.update({ mochartConfig: removedConfig });
    runFrames();
    await expectSnapshot(container, demo.id, 'config-series-removed');

    // restoring the original config rebuilds back to the exact initial DOM
    const restoredConfig = buildMochartConfig(demo.config);
    expect(mochart.hasConfigStructureChange(removedConfig, restoredConfig)).toBe(true);

    chart.update({ mochartConfig: restoredConfig });
    runFrames();
    expect(normalizeHtml(container.innerHTML)).toBe(initialHtml);

    chart.destroy();
    expect(container.innerHTML).toBe('');
  });

  it('swaps the data source when animate is toggled at runtime', async () => {
    const animatedConfig = buildMochartConfig(demo.config);
    const staticConfig = buildMochartConfig(demo.config, { animate: false });
    const rows = loadJson(dataPaths[demo.data]);
    const { container, chart } = mountGrouped(animatedConfig, rows);

    // animate off + new data: the static source applies synchronously, no tween
    const changedRows = transformValues(staticConfig, rows);
    chart.update({ mochartConfig: staticConfig, dataProvider: makeProvider(changedRows) });
    const appliedHtml = normalizeHtml(container.innerHTML);
    runFrames();
    expect(normalizeHtml(container.innerHTML)).toBe(appliedHtml);
    await expectSnapshot(container, demo.id, 'config-animate-off');

    // animate back on with unchanged data settles to the same DOM, style attributes included — an emptied style removes its attribute, so neither path leaves style="" behind
    chart.update({ mochartConfig: animatedConfig });
    runFrames();
    expect(normalizeHtml(container.innerHTML)).toBe(appliedHtml);

    // and the next data change tweens again
    const tweenedRows = transformValues(animatedConfig, changedRows);
    chart.update({ dataProvider: makeProvider(tweenedRows) });
    advanceFrames(3);
    await expectSnapshot(container, demo.id, 'config-animate-on-mid-tween');
    runFrames();
    await expectSnapshot(container, demo.id, 'config-animate-on-settled');

    chart.destroy();
    expect(container.innerHTML).toBe('');
  });
});

