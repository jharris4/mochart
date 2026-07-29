// Random-mode data generators for the chart-type demos (histogram, waterfall,
// heatmap). The generic random generator draws every data property
// independently, which breaks these charts' intra-row invariants (a waterfall
// bar's start must meet its neighbour's end, a heatmap cell must sit on its
// row band). Instead, these generators randomize the *inputs* to the core
// chart helpers and re-run the helper, so every generated dataset is a valid
// chart of its type. Group labels come from fixed pools so successive random
// steps share most groups and transitions animate as updates plus edge
// enter/exit rather than a full teardown.
//
// Each generator reads its demo's random config (the per-generator schemas in
// demo-data types.ts) defensively: a missing or malformed setting falls back
// to the schema default, so old share links that embedded the generic config
// shape degrade to the canonical behavior instead of erroring.
//
// The same canonical inputs also produce the demos' static config/data
// snapshots (see scripts/generateChartTypeDemos.ts), keeping the baked JSON
// and the generated datasets structurally identical by construction. The
// snapshot paths keep their original sequential-rng draws so the baked JSON
// stays bit-identical; the random paths draw from per-key seeds instead
// (which the reuse settings require).

import seedrandom from 'seedrandom';

import { createHistogram, createWaterfall, createHeatmap, createCandlestick, createOhlc, createPie } from '@mochart/core';
import type { CandlestickItem, MochartConfig, PieItem } from '@mochart/core';

import { generateChartDataProvider } from './randomGenerator';

import type { DataRow, DemoConfig, DemoDataProvider, DemoRandomConfig, GroupValue, RandomConfig } from './types';

type Rng = () => number;

// --- Random-config access ----------------------------------------------------

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function section(config: unknown, key: string): Record<string, unknown> {
  const value = config !== null && typeof config === 'object' ? (config as Record<string, unknown>)[key] : undefined;
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function range(config: unknown, key: string, fallback: { min: number; max: number }): { min: number; max: number } {
  const rangeSection = section(config, key);
  const min = num(rangeSection.min, fallback.min);
  const max = num(rangeSection.max, fallback.max);
  return min <= max ? { min, max } : fallback;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// --- Reuse -------------------------------------------------------------------

/**
 * One deterministic 0–1 draw for a keyed quantity, honoring the reuse flags:
 * pinned to a global seed (identical every step), averaged between the two
 * half-step seeds (adjacent steps share one component, so the quantity morphs
 * smoothly instead of jumping), or fresh per step.
 */
function reusedDraw(scope: string, key: string, randomId: number, reuseGlobal: boolean, reuseStep: boolean): number {
  if (reuseGlobal) {
    return seedrandom(scope + ':global:' + key)();
  }
  if (reuseStep) {
    return (seedrandom(scope + ':' + (randomId - 0.5) + ':' + key)() + seedrandom(scope + ':' + (randomId + 0.5) + ':' + key)()) / 2;
  }
  return seedrandom(scope + ':' + randomId + ':' + key)();
}

/**
 * The draw stream for pool entry `index` at step `randomId` under the pool
 * reuse fractions: the first globalPercentage of entries pin to a global seed
 * (their state never changes), then stepPercentage of the remainder read a
 * half-step seed shared with one neighbouring step — staggered by entry
 * parity, so every step boundary sees half of them persist exactly — and the
 * rest draw fresh each step.
 */
function poolEntryRng(scope: string, index: number, randomId: number, poolSize: number, globalPercentage: number, stepPercentage: number): Rng {
  const globalCount = Math.round(clamp01(globalPercentage) * poolSize);
  const stepCount = Math.round(clamp01(stepPercentage) * (poolSize - globalCount));
  if (index < globalCount) {
    return seedrandom(scope + ':global:' + index);
  }
  if (index < globalCount + stepCount) {
    const halfStep = (randomId + index) % 2 === 0 ? randomId + 0.5 : randomId - 0.5;
    return seedrandom(scope + ':' + halfStep + ':' + index);
  }
  return seedrandom(scope + ':' + randomId + ':' + index);
}

/** The chart-type generator ids usable in a demos.json `generator` field. */
export const chartTypeGenerators = ['histogram', 'waterfall', 'heatmap', 'candlestick', 'candlestick-hollow', 'ohlc', 'error-bars', 'pie', 'donut', 'gauge'] as const;

export type ChartTypeGenerator = (typeof chartTypeGenerators)[number];

/** One chart-type demo's baked files, rebuilt by the snapshot script. */
export interface ChartTypeDemoSnapshot {
  id: ChartTypeGenerator;
  config: DemoConfig;
  data: DataRow[];
}

function toDemoDataProvider(rows: DataRow[], groupProperty: string): DemoDataProvider {
  const groupValues = rows.map(row => row[groupProperty] as GroupValue);
  const seriesValues: Record<string, (number | undefined)[]> = {};
  rows.forEach((row, index) => {
    for (const key of Object.keys(row)) {
      if (key !== groupProperty) {
        (seriesValues[key] ??= new Array(rows.length).fill(undefined))[index] = row[key] as number | undefined;
      }
    }
  });
  return {
    groupValues,
    seriesValues,
    getGroupValues: () => groupValues,
    getSeriesValue: (_groupValue, groupIndex, seriesProperty) => seriesValues[seriesProperty]?.[groupIndex]
  };
}

// --- Histogram --------------------------------------------------------------

// A fixed bin width keeps interior bin labels ("150–175") identical across
// random steps, so only the edge bins enter/exit as the sampled extent moves.
const HISTOGRAM_BIN_WIDTH = 25;
const HISTOGRAM_SERIES_TITLE = 'Requests';

function normalSamples(count: number, mean: number, stdDev: number, rng: Rng): number[] {
  const samples: number[] = [];
  for (let i = 0; i < count; i++) {
    const u = Math.max(rng(), 1e-9);
    const v = rng();
    samples.push(mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
  }
  return samples;
}

// Random config: samples = population size range, value = the band the normal
// distribution wanders in, reuse = pin the distribution parameters globally /
// morph them smoothly between adjacent steps.
function histogramRows(random: unknown, randomId: number): DataRow[] {
  const samples = range(random, 'samples', { min: 200, max: 400 });
  const value = range(random, 'value', { min: 100, max: 280 });
  const reuse = section(random, 'reuse');
  const reuseGlobal = bool(reuse.global, false);
  const reuseStep = bool(reuse.step, true);

  const span = Math.max(1, value.max - value.min);
  const count = Math.max(1, Math.round(samples.min + reusedDraw('histogram', 'count', randomId, reuseGlobal, reuseStep) * (samples.max - samples.min)));
  const stdDev = (0.15 + 0.12 * reusedDraw('histogram', 'stdDev', randomId, reuseGlobal, reuseStep)) * span;
  const mean = value.min + stdDev + reusedDraw('histogram', 'mean', randomId, reuseGlobal, reuseStep) * Math.max(0, span - 2 * stdDev);
  // with the parameters pinned globally the samples pin too, so the chart is
  // fully static across steps; with step reuse only the parameters correlate
  const samplesRng = seedrandom('histogram:samples:' + (reuseGlobal ? 'global' : randomId));
  const sampleValues = normalSamples(count, mean, stdDev, samplesRng).map(sample => Math.max(0, sample));
  return createHistogram(sampleValues, { binWidth: HISTOGRAM_BIN_WIDTH, seriesTitle: HISTOGRAM_SERIES_TITLE }).data;
}

function buildHistogramSnapshot(): ChartTypeDemoSnapshot {
  const samples = normalSamples(280, 160, 40, seedrandom('histogram:baseline'));
  const { data, groupAxisConfig, seriesConfig } = createHistogram(samples, {
    binWidth: HISTOGRAM_BIN_WIDTH,
    seriesTitle: HISTOGRAM_SERIES_TITLE
  });
  return {
    id: 'histogram',
    config: {
      version: '1.0.0',
      titleConfig: { title: 'Response Time Distribution' },
      groupAxisConfig: { ...groupAxisConfig, title: 'Response time (ms)' },
      seriesAxisConfigs: [{ min: 0 }],
      seriesConfigs: [seriesConfig]
    },
    data
  };
}

// --- Waterfall ---------------------------------------------------------------

interface WaterfallStepPoolEntry {
  label: string;
  value?: number;
  total?: boolean;
  /** Relative value jitter applied in random mode (±fraction of value). */
  jitter?: number;
  /** Multiplier on missing.probability for this step (0/omitted = always present). */
  dropWeight?: number;
}

// Optional steps give random mode group enter/exit: when one appears, every
// bar downstream of it shifts as the helper recomputes the running totals.
// Drop weights make the rarer steps flakier than the config's baseline.
const WATERFALL_STEP_POOL: WaterfallStepPoolEntry[] = [
  { label: 'Product revenue', value: 420, jitter: 0.35 },
  { label: 'Services revenue', value: 210, jitter: 0.4 },
  { label: 'Licensing', value: 75, jitter: 0.5, dropWeight: 1 },
  { label: 'Gross revenue', total: true },
  { label: 'Cost of goods', value: -180, jitter: 0.35 },
  { label: 'Operating expenses', value: -95, jitter: 0.3 },
  { label: 'Marketing', value: -60, jitter: 0.5, dropWeight: 0.75 },
  { label: 'One-time charge', value: -45, jitter: 0.8, dropWeight: 1.625 },
  { label: 'Tax', value: -22, jitter: 0.4 },
  { label: 'Net income', total: true }
];

// Random config: value = the range the pool deltas are remapped into, missing
// = the optional steps' dropout baseline, reuse = fractions of steps whose
// state persists globally / across adjacent steps.
function waterfallRows(random: unknown, randomId: number): DataRow[] {
  const poolValues = WATERFALL_STEP_POOL.filter(step => step.value !== undefined).map(step => step.value!);
  const poolMin = Math.min(...poolValues);
  const poolMax = Math.max(...poolValues);
  const value = range(random, 'value', { min: poolMin, max: poolMax });
  const missingProbability = clamp01(num(section(random, 'missing').probability, 0.4));
  const reuse = section(random, 'reuse');
  const globalPercentage = clamp01(num(reuse.globalPercentage, 0));
  const stepPercentage = clamp01(num(reuse.stepPercentage, 0.5));

  const items: ({ label: string; total: true } | { label: string; value: number })[] = [];
  WATERFALL_STEP_POOL.forEach((step, index) => {
    if (step.total === true) {
      items.push({ label: step.label, total: true });
      return;
    }
    // one fixed-order stream per entry — [drop roll, value roll] — so a
    // persisted entry keeps its whole state across the shared steps
    const entryRng = poolEntryRng('waterfall', index, randomId, WATERFALL_STEP_POOL.length, globalPercentage, stepPercentage);
    const dropRoll = entryRng();
    const valueRoll = entryRng();
    if ((step.dropWeight ?? 0) > 0 && dropRoll < clamp01(missingProbability * step.dropWeight!)) {
      return;
    }
    const remapped = value.min + ((step.value! - poolMin) / (poolMax - poolMin)) * (value.max - value.min);
    items.push({ label: step.label, value: Math.round(remapped * (1 + (step.jitter ?? 0) * (2 * valueRoll - 1))) });
  });
  return createWaterfall(items).data;
}

function buildWaterfallSnapshot(): ChartTypeDemoSnapshot {
  // The baseline keeps the usually-present optional steps and drops the rare
  // one, so single mode shows a curated statement at the canonical values.
  const items = WATERFALL_STEP_POOL
    .filter(step => (step.dropWeight ?? 0) <= 1)
    .map(step => (step.total === true ? { label: step.label, total: true } : { label: step.label, value: step.value! }));
  const { data, groupAxisConfig, seriesConfigs } = createWaterfall(items);
  return {
    id: 'waterfall',
    config: {
      version: '1.0.0',
      titleConfig: { title: 'Income Statement (fictional, $k)' },
      groupAxisConfig,
      seriesAxisConfigs: [{ title: '$ thousands' }],
      seriesConfigs
    },
    data
  };
}

// --- Heatmap -----------------------------------------------------------------

interface HeatmapRowProfile {
  label: string;
  /** The row's fixed value extent. Generated cells always span it exactly, */
  /** so the per-row colors baked into the demo config stay on the ramp. */
  min: number;
  max: number;
}

const HEATMAP_ROW_PROFILES: HeatmapRowProfile[] = [
  { label: 'Mon', min: 30, max: 65 },
  { label: 'Tue', min: 30, max: 65 },
  { label: 'Wed', min: 32, max: 68 },
  { label: 'Thu', min: 30, max: 64 },
  { label: 'Fri', min: 26, max: 55 },
  { label: 'Sat', min: 10, max: 26 },
  { label: 'Sun', min: 8, max: 22 }
];

const HEATMAP_COLUMNS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Random config: columns = per-step column dropouts, missing = empty-cell
// chance, reuse = pin cell values globally / morph them smoothly between
// adjacent steps. Cell values stay on each row's baked color extents, so
// there is no value range to configure.
function heatmapRows(random: unknown, randomId: number): DataRow[] {
  const columnsSection = section(random, 'columns');
  const dropProbability = clamp01(num(columnsSection.dropProbability, 0.12));
  const maxDropped = Math.min(HEATMAP_COLUMNS.length - 1, Math.max(0, Math.round(num(columnsSection.maxDropped, 3))));
  const missingProbability = clamp01(num(section(random, 'missing').probability, 0));
  const reuse = section(random, 'reuse');
  const reuseGlobal = bool(reuse.global, false);
  const reuseStep = bool(reuse.step, true);

  // Column dropouts churn per step regardless of reuse — they are the group
  // enter/exit the demo shows. Cells key on their column label, so a kept
  // column's values are unaffected by its neighbours dropping.
  const columnRng = seedrandom('heatmap:columns:' + randomId);
  const columnLabels: string[] = [];
  let dropped = 0;
  for (const label of HEATMAP_COLUMNS) {
    if (dropped < maxDropped && columnRng() < dropProbability) {
      dropped++;
    }
    else {
      columnLabels.push(label);
    }
  }

  const rows = HEATMAP_ROW_PROFILES.map(profile => {
    const values: (number | null)[] = columnLabels.map(column =>
      Math.round(profile.min + reusedDraw('heatmap', profile.label + ':' + column, randomId, reuseGlobal, reuseStep) * (profile.max - profile.min)));
    // Pin one cell to each extent so the row's generated extent matches the
    // per-row colorMin/colorMax baked into the static demo config.
    const positionRng = seedrandom('heatmap:extent:' + randomId + ':' + profile.label);
    const minIndex = Math.floor(positionRng() * values.length);
    let maxIndex = minIndex;
    if (values.length > 1) {
      maxIndex = Math.floor(positionRng() * (values.length - 1));
      if (maxIndex >= minIndex) {
        maxIndex++;
      }
      values[minIndex] = profile.min;
    }
    values[maxIndex] = profile.max;
    if (missingProbability > 0) {
      const missingRng = seedrandom('heatmap:missing:' + randomId + ':' + profile.label);
      for (let i = 0; i < values.length; i++) {
        if (i !== minIndex && i !== maxIndex && missingRng() < missingProbability) {
          values[i] = null;
        }
      }
    }
    return { label: profile.label, values };
  });

  return createHeatmap(rows, { columnLabels }).data;
}

function buildHeatmapSnapshot(): ChartTypeDemoSnapshot {
  // A seasonal cosine curve: every row peaks in January and bottoms out in
  // July, hitting its min/max exactly so the baked per-row colors sit
  // exactly on the shared ramp.
  const rows = HEATMAP_ROW_PROFILES.map(profile => ({
    label: profile.label,
    values: HEATMAP_COLUMNS.map((column, c) => {
      if (profile.label === 'Sat' && column === 'Apr') {
        return null; // no data collected — demos the skipMissing gap
      }
      const t = (1 + Math.cos((c / HEATMAP_COLUMNS.length) * 2 * Math.PI)) / 2;
      return Math.round(profile.min + t * (profile.max - profile.min));
    })
  }));
  const { data, groupAxisConfig, seriesAxisConfig, seriesConfigs } = createHeatmap(rows, { columnLabels: HEATMAP_COLUMNS });
  return {
    id: 'heatmap',
    config: {
      version: '1.0.0',
      titleConfig: { title: 'Support Tickets by Weekday (fictional)' },
      groupAxisConfig,
      seriesAxisConfigs: [seriesAxisConfig],
      seriesConfigs: seriesConfigs.map(seriesConfig => ({ ...seriesConfig, valueFormat: ',.0f' }))
    },
    data
  };
}

// --- Candlestick -------------------------------------------------------------

// Twenty June 2026 trading days (weekends skipped — the helper's ordinal axis
// keeps the candles evenly spaced across the gaps). The fixed pool keeps most
// labels shared between random steps, so candles animate in place while the
// tail enters and exits.
const CANDLESTICK_DAYS = [
  'Jun 01', 'Jun 02', 'Jun 03', 'Jun 04', 'Jun 05',
  'Jun 08', 'Jun 09', 'Jun 10', 'Jun 11', 'Jun 12',
  'Jun 15', 'Jun 16', 'Jun 17', 'Jun 18', 'Jun 19',
  'Jun 22', 'Jun 23', 'Jun 24', 'Jun 25', 'Jun 26'
];
const CANDLESTICK_START_PRICE = 100;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// The snapshot baseline walk — sequential draws from one rng so the baked
// demo JSON stays bit-identical. Keep the formulas in sync with walkItems,
// the random-mode equivalent below.
function candlestickItems(rng: Rng, dayCount: number): CandlestickItem[] {
  let previousClose = CANDLESTICK_START_PRICE * (0.9 + rng() * 0.2);
  return CANDLESTICK_DAYS.slice(0, dayCount).map(label => {
    const open = previousClose * (1 + 0.006 * (2 * rng() - 1)); // small overnight gap
    const close = open * (1 + 0.04 * (2 * rng() - 1)); // intraday drift
    const high = Math.max(open, close) * (1 + 0.015 * rng());
    const low = Math.min(open, close) * (1 - 0.015 * rng());
    previousClose = close;
    return { label, open: round2(open), high: round2(high), low: round2(low), close: round2(close) };
  });
}

// Random config: candles = how many trading days each step keeps, price = the
// band the starting price is drawn from plus the intraday volatility (the
// overnight gap and wick extents scale off it, at the baseline's 0.15/0.375
// ratios), reuse.step = correlate the walk with the neighbouring steps so
// playing steps looks like one instrument drifting.
function walkItems(scope: string, random: unknown, randomId: number): CandlestickItem[] {
  const candles = range(random, 'candles', { min: 16, max: 20 });
  const price = range(random, 'price', { min: 90, max: 110 });
  const volatility = Math.min(0.5, Math.max(0, num(section(random, 'price').volatility, 0.04)));
  const reuseStep = bool(section(random, 'reuse').step, true);

  const dayMax = Math.min(CANDLESTICK_DAYS.length, Math.max(1, Math.round(candles.max)));
  const dayMin = Math.min(dayMax, Math.max(1, Math.round(candles.min)));
  const dayCount = dayMin + Math.floor(seedrandom(scope + ':count:' + randomId)() * (dayMax - dayMin + 1));

  let previousClose = Math.max(0.01, price.min + reusedDraw(scope, 'start', randomId, false, reuseStep) * (price.max - price.min));
  return CANDLESTICK_DAYS.slice(0, dayCount).map(label => {
    const draw = (key: string) => reusedDraw(scope, label + ':' + key, randomId, false, reuseStep);
    const open = previousClose * (1 + (volatility * 0.15) * (2 * draw('gap') - 1));
    const close = open * (1 + volatility * (2 * draw('drift') - 1));
    const high = Math.max(open, close) * (1 + (volatility * 0.375) * draw('high'));
    const low = Math.min(open, close) * (1 - (volatility * 0.375) * draw('low'));
    previousClose = close;
    return { label, open: round2(open), high: round2(high), low: round2(low), close: round2(close) };
  });
}

// Random-mode volumes: fresh noise per step, but scaled by the day's relative
// move, so the reuse continuity in the prices carries into the volume pane.
function walkVolumes(scope: string, randomId: number, items: CandlestickItem[]): CandlestickItem[] {
  return items.map(item => ({
    ...item,
    volume: Math.round((2 + 6 * seedrandom(scope + ':' + randomId + ':volume:' + item.label)()) * (1 + 25 * Math.abs(item.close - item.open) / item.open) * 1e5)
  }));
}

// Volumes are drawn after the whole price walk, so the price sequence for a
// given seed stays identical whether or not a demo adds volumes — the hollow
// and OHLC demos share the walk without them.
function withVolumes(items: CandlestickItem[], rng: Rng): CandlestickItem[] {
  return items.map(item => ({
    ...item,
    // busier days trade more: volume scales with the day's relative move
    volume: Math.round((2 + 6 * rng()) * (1 + 25 * Math.abs(item.close - item.open) / item.open) * 1e5)
  }));
}

// The helper derives `change` from the raw open/close, so it carries float
// noise (97.13 - 96.54 = 0.589999…); round it for the baked/generated rows.
function roundCandlestickChanges(rows: DataRow[]): DataRow[] {
  for (const row of rows) {
    if (typeof row.change === 'number') {
      row.change = round2(row.change);
    }
  }
  return rows;
}

function candlestickRows(random: unknown, randomId: number): DataRow[] {
  return roundCandlestickChanges(createCandlestick(walkVolumes('candlestick', randomId, walkItems('candlestick', random, randomId)), { volume: true }).data);
}

function buildCandlestickSnapshot(): ChartTypeDemoSnapshot {
  const baselineRng = seedrandom('candlestick:baseline');
  const items = withVolumes(candlestickItems(baselineRng, CANDLESTICK_DAYS.length), baselineRng);
  const { data, groupAxisConfig, seriesConfigs, seriesAxisConfigs } = createCandlestick(items, { volume: true });
  roundCandlestickChanges(data);
  return {
    id: 'candlestick',
    config: {
      version: '1.0.0',
      titleConfig: { title: 'Daily Share Price (fictional, $)' },
      groupAxisConfig,
      // the helper's price/volume pane axes, with the demo's title on price
      seriesAxisConfigs: seriesAxisConfigs!.map(axisConfig =>
        axisConfig.id === 'price' ? { ...axisConfig, title: '$ per share' } : axisConfig),
      seriesConfigs: seriesConfigs.map(seriesConfig =>
        ({ ...seriesConfig, valueFormat: seriesConfig.id!.includes('Volume') ? ',.0f' : ',.2f' }))
    },
    data
  };
}

// --- Hollow candlestick ------------------------------------------------------

// The hollow variant shares the candlestick price walk (different seed) and
// only flips the helper's hollow option: outlined up bodies with the wicks
// split into segments around them.

function candlestickHollowRows(random: unknown, randomId: number): DataRow[] {
  return roundCandlestickChanges(createCandlestick(walkItems('candlestick-hollow', random, randomId), { hollow: true }).data);
}

function buildCandlestickHollowSnapshot(): ChartTypeDemoSnapshot {
  const items = candlestickItems(seedrandom('candlestick-hollow:baseline'), CANDLESTICK_DAYS.length);
  const { data, groupAxisConfig, seriesConfigs } = createCandlestick(items, { hollow: true });
  roundCandlestickChanges(data);
  return {
    id: 'candlestick-hollow',
    config: {
      version: '1.0.0',
      titleConfig: { title: 'Daily Share Price (fictional, $)' },
      groupAxisConfig,
      seriesAxisConfigs: [{ title: '$ per share' }],
      seriesConfigs: seriesConfigs.map(seriesConfig => ({ ...seriesConfig, valueFormat: ',.2f' }))
    },
    data
  };
}

// --- OHLC --------------------------------------------------------------------

// The OHLC demo shares the candlestick price walk (different seed) — only the
// helper differs: thin low/high lines with open/close ticks instead of
// wick-and-body candles.

function ohlcRows(random: unknown, randomId: number): DataRow[] {
  return roundCandlestickChanges(createOhlc(walkItems('ohlc', random, randomId)).data);
}

function buildOhlcSnapshot(): ChartTypeDemoSnapshot {
  const items = candlestickItems(seedrandom('ohlc:baseline'), CANDLESTICK_DAYS.length);
  const { data, groupAxisConfig, seriesConfigs } = createOhlc(items);
  roundCandlestickChanges(data);
  return {
    id: 'ohlc',
    config: {
      version: '1.0.0',
      titleConfig: { title: 'Daily Share Price (fictional, $)' },
      groupAxisConfig,
      seriesAxisConfigs: [{ title: '$ per share' }],
      seriesConfigs: seriesConfigs.map(seriesConfig => ({ ...seriesConfig, valueFormat: ',.2f' }))
    },
    data
  };
}

// --- Error bars --------------------------------------------------------------

// Error bars are first-class series config (errorLowProperty/errorHighProperty),
// so there is no core helper to re-run — but the generic randomizer would draw
// value, low and high independently and break low ≤ value ≤ high. This
// generator draws each point's value and its two error margins instead, and
// derives the bounds. The fixed month pool keeps most groups shared between
// random steps, so the bars and whiskers animate in place while tail months
// enter and exit.
const ERROR_BARS_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The snapshot baseline — sequential draws from one rng so the baked demo
// JSON stays bit-identical. Keep the formulas in sync with errorBarsRandomRows.
function errorBarsItems(rng: Rng, monthCount: number): DataRow[] {
  return ERROR_BARS_MONTHS.slice(0, monthCount).map((month, m) => {
    // a seasonal curve with per-plant jitter; asymmetric margins per bound
    const seasonal = Math.sin((m / ERROR_BARS_MONTHS.length) * 2 * Math.PI);
    const a = 55 + 10 * seasonal + 6 * (2 * rng() - 1);
    const b = 46 + 8 * seasonal + 6 * (2 * rng() - 1);
    const target = 52 + 9 * seasonal;
    return {
      month,
      a: round2(a), aLow: round2(a - (3 + 4 * rng())), aHigh: round2(a + (3 + 4 * rng())),
      b: round2(b), bLow: round2(b - (3 + 4 * rng())), bHigh: round2(b + (3 + 4 * rng())),
      target: round2(target), targetLow: round2(target - (1.5 + 1.5 * rng())), targetHigh: round2(target + (1.5 + 1.5 * rng()))
    };
  });
}

// Random config: months = how many months each step keeps, margin = the
// whisker half-width range (the target line's margins scale to 0.45 of it,
// matching the baseline's tighter CI), missing = the chance a plant's point
// drops out with its bounds, reuse = pin the per-point jitter globally /
// morph it smoothly between adjacent steps.
function errorBarsRandomRows(random: unknown, randomId: number): DataRow[] {
  const scope = 'error-bars';
  const months = range(random, 'months', { min: 9, max: 12 });
  const margin = range(random, 'margin', { min: 3, max: 7 });
  const missingProbability = clamp01(num(section(random, 'missing').probability, 0));
  const reuse = section(random, 'reuse');
  const reuseGlobal = bool(reuse.global, false);
  const reuseStep = bool(reuse.step, true);

  const monthMax = Math.min(ERROR_BARS_MONTHS.length, Math.max(1, Math.round(months.max)));
  const monthMin = Math.min(monthMax, Math.max(1, Math.round(months.min)));
  const monthCount = monthMin + Math.floor(seedrandom(scope + ':count:' + randomId)() * (monthMax - monthMin + 1));
  const marginSpan = margin.max - margin.min;

  return ERROR_BARS_MONTHS.slice(0, monthCount).map((month, m) => {
    const draw = (key: string) => reusedDraw(scope, month + ':' + key, randomId, reuseGlobal, reuseStep);
    const missingRng = seedrandom(scope + ':missing:' + randomId + ':' + month);
    const seasonal = Math.sin((m / ERROR_BARS_MONTHS.length) * 2 * Math.PI);
    const target = 52 + 9 * seasonal;
    const row: DataRow = {
      month,
      target: round2(target),
      targetLow: round2(target - (margin.min + marginSpan * draw('targetLowMargin')) * 0.45),
      targetHigh: round2(target + (margin.min + marginSpan * draw('targetHighMargin')) * 0.45)
    };
    if (!(missingProbability > 0 && missingRng() < missingProbability)) {
      const a = 55 + 10 * seasonal + 6 * (2 * draw('a') - 1);
      row.a = round2(a);
      row.aLow = round2(a - (margin.min + marginSpan * draw('aLowMargin')));
      row.aHigh = round2(a + (margin.min + marginSpan * draw('aHighMargin')));
    }
    if (!(missingProbability > 0 && missingRng() < missingProbability)) {
      const b = 46 + 8 * seasonal + 6 * (2 * draw('b') - 1);
      row.b = round2(b);
      row.bLow = round2(b - (margin.min + marginSpan * draw('bLowMargin')));
      row.bHigh = round2(b + (margin.min + marginSpan * draw('bHighMargin')));
    }
    return row;
  });
}

function buildErrorBarsSnapshot(): ChartTypeDemoSnapshot {
  const data = errorBarsItems(seedrandom('error-bars:baseline'), ERROR_BARS_MONTHS.length);
  return {
    id: 'error-bars',
    config: {
      version: '1.0.0',
      titleConfig: { title: 'Monthly Output with 95% CI (fictional)' },
      groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
      seriesAxisConfigs: [{ title: 'units per day' }],
      seriesGroupConfigs: [{ id: 'plants' }],
      seriesConfigs: [
        { id: 'a', title: 'Plant A', property: 'a', renderer: 'bar', group: 'plants',
          errorLowProperty: 'aLow', errorHighProperty: 'aHigh', valueFormat: ',.1f' },
        { id: 'b', title: 'Plant B', property: 'b', renderer: 'bar', group: 'plants',
          errorLowProperty: 'bLow', errorHighProperty: 'bHigh', valueFormat: ',.1f' },
        { id: 'target', title: 'Target', property: 'target', renderer: 'line', group: null,
          errorLowProperty: 'targetLow', errorHighProperty: 'targetHigh', valueFormat: ',.1f' }
      ]
    },
    data
  };
}

// --- Pie / Donut -------------------------------------------------------------

interface PieSlicePoolEntry {
  label: string;
  value: number;
  /** Relative value jitter applied in random mode (±fraction of value). */
  jitter?: number;
  /** Multiplier on missing.probability for this slice (0/omitted = never drops). */
  dropWeight?: number;
}

// Slices keep their pool position across random steps — an absent slice
// generates value 0 (a zero-width slice that animates out) instead of being
// dropped, so the row's slice{i} properties always match the baked config.
// Drop weights make the minor slices flakier than the config's baseline.
const PIE_SLICE_POOL: PieSlicePoolEntry[] = [
  { label: 'Subscriptions', value: 420, jitter: 0.3 },
  { label: 'Services', value: 210, jitter: 0.35 },
  { label: 'Hardware', value: 140, jitter: 0.4 },
  { label: 'Licensing', value: 75, jitter: 0.5, dropWeight: 1 },
  { label: 'Support', value: 65, jitter: 0.4 },
  { label: 'Other', value: 30, jitter: 0.6, dropWeight: 1.6 }
];

const DONUT_SLICE_POOL: PieSlicePoolEntry[] = [
  { label: 'Chrome', value: 62, jitter: 0.25 },
  { label: 'Safari', value: 20, jitter: 0.3 },
  { label: 'Edge', value: 6, jitter: 0.5 },
  { label: 'Firefox', value: 5, jitter: 0.5, dropWeight: 1 },
  { label: 'Opera', value: 3, jitter: 0.6, dropWeight: 2 },
  { label: 'Other', value: 4, jitter: 0.5 }
];

/** The pie family's schema defaults, tuned per demo (see random/*.json). */
interface PiePoolDefaults {
  value: { min: number; max: number };
  missingProbability: number;
}

// Random config: value = the range the pool weights are scaled into (the
// curated mix keeps its shape; min/max act as a zoom), missing = droppable
// slices' dropout baseline, reuse = fractions of slices whose state persists
// globally / across adjacent steps.
function pieItems(pool: PieSlicePoolEntry[], scope: string, random: unknown, randomId: number, defaults: PiePoolDefaults): PieItem[] {
  const value = range(random, 'value', defaults.value);
  const missingProbability = clamp01(num(section(random, 'missing').probability, defaults.missingProbability));
  const reuse = section(random, 'reuse');
  const globalPercentage = clamp01(num(reuse.globalPercentage, 0));
  const stepPercentage = clamp01(num(reuse.stepPercentage, 0.5));
  const poolMax = Math.max(...pool.map(slice => slice.value));

  return pool.map((slice, index) => {
    // one fixed-order stream per slice — [drop roll, value roll] — so a
    // persisted slice keeps its whole state across the shared steps
    const sliceRng = poolEntryRng(scope, index, randomId, pool.length, globalPercentage, stepPercentage);
    const dropRoll = sliceRng();
    const valueRoll = sliceRng();
    if ((slice.dropWeight ?? 0) > 0 && dropRoll < clamp01(missingProbability * slice.dropWeight!)) {
      return { label: slice.label, value: 0 };
    }
    const scaled = value.min + (slice.value / poolMax) * (value.max - value.min);
    return { label: slice.label, value: Math.max(0, Math.round(scaled * (1 + (slice.jitter ?? 0) * (2 * valueRoll - 1)))) };
  });
}

function pieRows(random: unknown, randomId: number): DataRow[] {
  return createPie(pieItems(PIE_SLICE_POOL, 'pie', random, randomId, { value: { min: 0, max: 420 }, missingProbability: 0.25 }), { valueFormat: ',.0f' }).data;
}

function donutRows(random: unknown, randomId: number): DataRow[] {
  return createPie(pieItems(DONUT_SLICE_POOL, 'donut', random, randomId, { value: { min: 0, max: 62 }, missingProbability: 0.2 }), { tooltipValues: 'percent' }).data;
}

function buildPieSnapshot(): ChartTypeDemoSnapshot {
  const pie = createPie(PIE_SLICE_POOL.map(({ label, value }) => ({ label, value })), { valueFormat: ',.0f' });
  return {
    id: 'pie',
    config: {
      version: '1.0.0',
      titleConfig: { title: 'Revenue by Product (fictional, $k)' },
      chartConfig: pie.chartConfig,
      groupAxisConfig: pie.groupAxisConfig,
      seriesConfigs: pie.seriesConfigs
    },
    data: pie.data
  };
}

function buildDonutSnapshot(): ChartTypeDemoSnapshot {
  const pie = createPie(DONUT_SLICE_POOL.map(({ label, value }) => ({ label, value })), { donut: true, tooltipValues: 'percent' });
  return {
    id: 'donut',
    config: {
      version: '1.0.0',
      titleConfig: { title: 'Browser Market Share (fictional)' },
      chartConfig: pie.chartConfig,
      // focusOffsetPercent explodes the hovered slice away from the center
      pieConfig: { ...pie.pieConfig, showLabels: true, labelType: 'percent', focusOffsetPercent: 0.05 },
      groupAxisConfig: pie.groupAxisConfig,
      seriesConfigs: pie.seriesConfigs
    },
    data: pie.data
  };
}

// A half-donut gauge: survey responses split across three sentiment segments.
// Its random config defaults missing.probability to 0 (a gauge with a missing
// segment reads as broken), but every segment is droppable if it's raised.
const GAUGE_SLICE_POOL: PieSlicePoolEntry[] = [
  { label: 'Promoters', value: 540, jitter: 0.3, dropWeight: 1 },
  { label: 'Passives', value: 280, jitter: 0.3, dropWeight: 1 },
  { label: 'Detractors', value: 180, jitter: 0.4, dropWeight: 1 }
];

function gaugeRows(random: unknown, randomId: number): DataRow[] {
  return createPie(pieItems(GAUGE_SLICE_POOL, 'gauge', random, randomId, { value: { min: 0, max: 540 }, missingProbability: 0 }), { tooltipValues: 'percent' }).data;
}

function buildGaugeSnapshot(): ChartTypeDemoSnapshot {
  const pie = createPie(GAUGE_SLICE_POOL.map(({ label, value }) => ({ label, value })), { tooltipValues: 'percent' });
  return {
    id: 'gauge',
    config: {
      version: '1.0.0',
      titleConfig: { title: 'Customer Sentiment (fictional survey)' },
      chartConfig: pie.chartConfig,
      pieConfig: {
        startAngle: -90,
        endAngle: 90,
        innerRadiusPercent: 0.55,
        padAngle: 1,
        cornerRadius: 3,
        showLabels: true,
        labelType: 'title',
        centerLabel: 'responses',
        showCenterTotal: true,
        centerTotalFormat: ',.0f',
        // lift the center content off the gauge pivot into the hole
        centerOffsetYPercent: -0.25
      },
      groupAxisConfig: pie.groupAxisConfig,
      seriesConfigs: pie.seriesConfigs
    },
    data: pie.data
  };
}

// --- Dispatch ----------------------------------------------------------------

/** Rebuilds every chart-type demo's static config/data (snapshot script). */
export function buildChartTypeDemoSnapshots(): ChartTypeDemoSnapshot[] {
  return [buildHistogramSnapshot(), buildWaterfallSnapshot(), buildHeatmapSnapshot(), buildCandlestickSnapshot(), buildCandlestickHollowSnapshot(), buildOhlcSnapshot(), buildErrorBarsSnapshot(), buildPieSnapshot(), buildDonutSnapshot(), buildGaugeSnapshot()];
}

/**
 * Random-mode data for a chart-type demo: re-runs the demo's core helper on
 * randomized inputs (seeded by `randomId`, so a given step is stable). The
 * demo's static config already carries the helper's config fragments, so the
 * generated rows plug straight into it. `random` is the demo's per-generator
 * random config; missing settings fall back to the schema defaults.
 */
export function generateChartTypeDataProvider(
  generator: ChartTypeGenerator,
  mochartConfig: MochartConfig,
  random: DemoRandomConfig,
  randomId: number
): DemoDataProvider {
  let rows: DataRow[];
  if (generator === 'histogram') {
    rows = histogramRows(random, randomId);
  }
  else if (generator === 'waterfall') {
    rows = waterfallRows(random, randomId);
  }
  else if (generator === 'candlestick') {
    rows = candlestickRows(random, randomId);
  }
  else if (generator === 'candlestick-hollow') {
    rows = candlestickHollowRows(random, randomId);
  }
  else if (generator === 'ohlc') {
    rows = ohlcRows(random, randomId);
  }
  else if (generator === 'error-bars') {
    rows = errorBarsRandomRows(random, randomId);
  }
  else if (generator === 'pie') {
    rows = pieRows(random, randomId);
  }
  else if (generator === 'donut') {
    rows = donutRows(random, randomId);
  }
  else if (generator === 'gauge') {
    rows = gaugeRows(random, randomId);
  }
  else {
    rows = heatmapRows(random, randomId);
  }
  return toDemoDataProvider(rows, mochartConfig.groupAxisConfig.property ?? '');
}

export function isChartTypeGenerator(generator: string | undefined): generator is ChartTypeGenerator {
  return generator !== undefined && (chartTypeGenerators as readonly string[]).includes(generator);
}

/**
 * Random-mode entry point for every demo: dispatches to the demo's
 * chart-type generator when its manifest entry names one, and to the generic
 * per-property random generator otherwise. `generator` is the demo's
 * `generator` field (undefined for regular demos).
 */
export function generateDemoDataProvider(
  generator: string | undefined,
  mochartConfig: MochartConfig,
  random: DemoRandomConfig,
  randomId: number
): DemoDataProvider {
  if (isChartTypeGenerator(generator)) {
    return generateChartTypeDataProvider(generator, mochartConfig, random, randomId);
  }
  return generateChartDataProvider(mochartConfig, random as RandomConfig, randomId);
}
