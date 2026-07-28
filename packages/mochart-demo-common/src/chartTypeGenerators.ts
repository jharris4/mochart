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
// The same canonical inputs also produce the demos' static config/data
// snapshots (see scripts/generateChartTypeDemos.ts), keeping the baked JSON
// and the generated datasets structurally identical by construction.

import seedrandom from 'seedrandom';

import { createHistogram, createWaterfall, createHeatmap, createCandlestick, createOhlc } from '@mochart/core';
import type { CandlestickItem, MochartConfig } from '@mochart/core';

import { generateChartDataProvider } from './randomGenerator';

import type { DataRow, DemoConfig, DemoDataProvider, GroupValue, RandomConfig } from './types';

type Rng = () => number;

/** The chart-type generator ids usable in a demos.json `generator` field. */
export const chartTypeGenerators = ['histogram', 'waterfall', 'heatmap', 'candlestick', 'candlestick-hollow', 'ohlc'] as const;

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

function histogramRows(rng: Rng): DataRow[] {
  const count = 200 + Math.floor(rng() * 200);
  const mean = 130 + rng() * 80;
  const stdDev = 30 + rng() * 25;
  const samples = normalSamples(count, mean, stdDev, rng).map(sample => Math.max(0, sample));
  return createHistogram(samples, { binWidth: HISTOGRAM_BIN_WIDTH, seriesTitle: HISTOGRAM_SERIES_TITLE }).data;
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
  /** Probability the step is present in a random step (1 when omitted). */
  presence?: number;
}

// Optional steps give random mode group enter/exit: when one appears, every
// bar downstream of it shifts as the helper recomputes the running totals.
const WATERFALL_STEP_POOL: WaterfallStepPoolEntry[] = [
  { label: 'Product revenue', value: 420, jitter: 0.35 },
  { label: 'Services revenue', value: 210, jitter: 0.4 },
  { label: 'Licensing', value: 75, jitter: 0.5, presence: 0.6 },
  { label: 'Gross revenue', total: true },
  { label: 'Cost of goods', value: -180, jitter: 0.35 },
  { label: 'Operating expenses', value: -95, jitter: 0.3 },
  { label: 'Marketing', value: -60, jitter: 0.5, presence: 0.7 },
  { label: 'One-time charge', value: -45, jitter: 0.8, presence: 0.35 },
  { label: 'Tax', value: -22, jitter: 0.4 },
  { label: 'Net income', total: true }
];

function waterfallRows(rng: Rng): DataRow[] {
  const items = WATERFALL_STEP_POOL
    .filter(step => step.presence === undefined || rng() < step.presence)
    .map(step => step.total === true
      ? { label: step.label, total: true }
      : { label: step.label, value: Math.round(step.value! * (1 + (step.jitter ?? 0) * (2 * rng() - 1))) });
  return createWaterfall(items).data;
}

function buildWaterfallSnapshot(): ChartTypeDemoSnapshot {
  // The baseline keeps the usually-present optional steps and drops the rare
  // one, so single mode shows a curated statement at the canonical values.
  const items = WATERFALL_STEP_POOL
    .filter(step => step.presence === undefined || step.presence >= 0.5)
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
const HEATMAP_MAX_DROPPED_COLUMNS = 3;

function heatmapRows(rng: Rng, missingProbability: number): DataRow[] {
  // Drop a few columns per step (never more than 3) so groups enter and exit
  // between steps while most columns match and animate in place.
  const columnLabels: string[] = [];
  let dropped = 0;
  for (const label of HEATMAP_COLUMNS) {
    if (dropped < HEATMAP_MAX_DROPPED_COLUMNS && rng() < 0.12) {
      dropped++;
    }
    else {
      columnLabels.push(label);
    }
  }

  const rows = HEATMAP_ROW_PROFILES.map(profile => {
    const values: (number | null)[] = columnLabels.map(() => Math.round(profile.min + rng() * (profile.max - profile.min)));
    // Pin one cell to each extent so the row's generated extent matches the
    // per-row colorMin/colorMax baked into the static demo config.
    const minIndex = Math.floor(rng() * values.length);
    let maxIndex = Math.floor(rng() * (values.length - 1));
    if (maxIndex >= minIndex) {
      maxIndex++;
    }
    values[minIndex] = profile.min;
    values[maxIndex] = profile.max;
    if (missingProbability > 0) {
      for (let i = 0; i < values.length; i++) {
        if (i !== minIndex && i !== maxIndex && rng() < missingProbability) {
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
const CANDLESTICK_MAX_DROPPED_DAYS = 4;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

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

function candlestickRows(rng: Rng): DataRow[] {
  const dayCount = CANDLESTICK_DAYS.length - Math.floor(rng() * (CANDLESTICK_MAX_DROPPED_DAYS + 1));
  return roundCandlestickChanges(createCandlestick(candlestickItems(rng, dayCount)).data);
}

function buildCandlestickSnapshot(): ChartTypeDemoSnapshot {
  const items = candlestickItems(seedrandom('candlestick:baseline'), CANDLESTICK_DAYS.length);
  const { data, groupAxisConfig, seriesConfigs } = createCandlestick(items);
  roundCandlestickChanges(data);
  return {
    id: 'candlestick',
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

// --- Hollow candlestick ------------------------------------------------------

// The hollow variant shares the candlestick price walk (different seed) and
// only flips the helper's hollow option: outlined up bodies with the wicks
// split into segments around them.

function candlestickHollowRows(rng: Rng): DataRow[] {
  const dayCount = CANDLESTICK_DAYS.length - Math.floor(rng() * (CANDLESTICK_MAX_DROPPED_DAYS + 1));
  return roundCandlestickChanges(createCandlestick(candlestickItems(rng, dayCount), { hollow: true }).data);
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

function ohlcRows(rng: Rng): DataRow[] {
  const dayCount = CANDLESTICK_DAYS.length - Math.floor(rng() * (CANDLESTICK_MAX_DROPPED_DAYS + 1));
  return roundCandlestickChanges(createOhlc(candlestickItems(rng, dayCount)).data);
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

// --- Dispatch ----------------------------------------------------------------

/** Rebuilds every chart-type demo's static config/data (snapshot script). */
export function buildChartTypeDemoSnapshots(): ChartTypeDemoSnapshot[] {
  return [buildHistogramSnapshot(), buildWaterfallSnapshot(), buildHeatmapSnapshot(), buildCandlestickSnapshot(), buildCandlestickHollowSnapshot(), buildOhlcSnapshot()];
}

/**
 * Random-mode data for a chart-type demo: re-runs the demo's core helper on
 * randomized inputs (seeded by `randomId`, so a given step is stable). The
 * demo's static config already carries the helper's config fragments, so the
 * generated rows plug straight into it.
 */
export function generateChartTypeDataProvider(
  generator: ChartTypeGenerator,
  mochartConfig: MochartConfig,
  random: RandomConfig,
  randomId: number
): DemoDataProvider {
  const rng = seedrandom(generator + ':' + randomId);
  let rows: DataRow[];
  if (generator === 'histogram') {
    rows = histogramRows(rng);
  }
  else if (generator === 'waterfall') {
    rows = waterfallRows(rng);
  }
  else if (generator === 'candlestick') {
    rows = candlestickRows(rng);
  }
  else if (generator === 'candlestick-hollow') {
    rows = candlestickHollowRows(rng);
  }
  else if (generator === 'ohlc') {
    rows = ohlcRows(rng);
  }
  else {
    rows = heatmapRows(rng, random.series.missing.probability);
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
  random: RandomConfig,
  randomId: number
): DemoDataProvider {
  if (isChartTypeGenerator(generator)) {
    return generateChartTypeDataProvider(generator, mochartConfig, random, randomId);
  }
  return generateChartDataProvider(mochartConfig, random, randomId);
}
