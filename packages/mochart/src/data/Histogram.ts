import type { GroupAxisConfig, SeriesConfig } from '../types/config';

export interface HistogramBin {
  /** Inclusive lower edge of the bin. */
  start: number;
  /** Exclusive upper edge of the bin (inclusive for the last bin). */
  end: number;
  /** Midpoint of the bin, used as the group value when charted. */
  center: number;
  /** Number of values that fell into the bin. */
  count: number;
  /** The count after applying `normalize` (equal to `count` for 'count'). */
  value: number;
}

export interface BinValuesOptions {
  /**
   * Approximate number of bins. Ignored when `binWidth` is set. When omitted
   * the count is derived from the data via Sturges' formula. With `nice`
   * enabled (the default) the actual count may differ slightly so that bin
   * edges land on round numbers.
   */
  binCount?: number;
  /** Exact bin width. Takes precedence over `binCount`. */
  binWidth?: number;
  /**
   * The value range to bin over. Values outside the domain are ignored.
   * Defaults to the extent of the data.
   */
  domain?: [number, number];
  /**
   * Whether to round the bin width and edges to round numbers (1, 2 or 5
   * times a power of ten). When false the domain is divided exactly.
   *
   * @default true
   */
  nice?: boolean;
  /**
   * How to scale each bin's `value`: the raw 'count', 'probability'
   * (count / total, sums to 1) or 'density' (probability / bin width,
   * integrates to 1).
   *
   * @default 'count'
   */
  normalize?: 'count' | 'probability' | 'density';
  /** Whether each bin's `value` accumulates the values of the bins before it. */
  cumulative?: boolean;
}

export interface CreateHistogramOptions extends BinValuesOptions {
  /**
   * The data property holding the bin value.
   *
   * @default 'value'
   */
  valueProperty?: string;
  /** The series title, e.g. shown in the legend and tooltip. */
  seriesTitle?: string;
  /**
   * Formats each bin's `binLabel`, shown as the group tick label.
   *
   * @default bin => `${bin.start}–${bin.end}`
   */
  binLabel?: (bin: HistogramBin) => string;
}

export interface HistogramData {
  bins: HistogramBin[];
  /**
   * One row per bin: `binLabel` (the group value), the value property, plus
   * `binStart`, `binEnd`, `binCenter` and `count`.
   */
  data: Record<string, number | string>[];
  /** Fragment to spread into the chart config's `groupAxisConfig`. */
  groupAxisConfig: Partial<GroupAxisConfig>;
  /** Fragment to spread into an entry of the chart config's `seriesConfigs`. */
  seriesConfig: Partial<SeriesConfig>;
}

const GROUP_PROPERTY = 'binLabel';
const DEFAULT_VALUE_PROPERTY = 'value';
const NICE_STEPS = [1, 2, 5, 10];

export function binValues(values: readonly number[], options: BinValuesOptions = {}): HistogramBin[] {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  const domain = options.domain ?? getExtent(finiteValues);
  if (domain === null) {
    return [];
  }
  const [domainMin, domainMax] = domain;
  if (!(domainMax >= domainMin)) {
    throw new Error(`binValues: invalid domain [${domainMin}, ${domainMax}]`);
  }

  const { start, width, binCount } = getBinLayout(domainMin, domainMax, finiteValues.length, options);
  const bins: HistogramBin[] = [];
  for (let i = 0; i < binCount; i++) {
    const binStart = roundToPrecision(start + i * width, width);
    const binEnd = roundToPrecision(start + (i + 1) * width, width);
    bins.push({
      start: binStart,
      end: binEnd,
      center: roundToPrecision(binStart + width / 2, width / 2),
      count: 0,
      value: 0
    });
  }

  for (const value of finiteValues) {
    if (value < domainMin || value > domainMax) {
      continue;
    }
    // Half-open bins [start, end); the last bin also includes its upper edge.
    let index = Math.min(Math.floor((value - start) / width), binCount - 1);
    // the raw quotient can disagree with the rounded edges by one ulp-sized
    // step; membership follows the edges the bins report
    if (index < binCount - 1 && value >= bins[index].end) {
      index++;
    }
    else if (index > 0 && value < bins[index].start) {
      index--;
    }
    bins[index].count++;
  }

  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  const normalize = options.normalize ?? 'count';
  let runningValue = 0;
  for (const bin of bins) {
    let value = bin.count;
    if (normalize === 'probability' && total > 0) {
      value = bin.count / total;
    } else if (normalize === 'density' && total > 0) {
      value = bin.count / (total * (bin.end - bin.start));
    }
    runningValue += value;
    bin.value = options.cumulative === true ? runningValue : value;
  }
  return bins;
}

export function createHistogram(values: readonly number[], options: CreateHistogramOptions = {}): HistogramData {
  const bins = binValues(values, options);
  const valueProperty = options.valueProperty ?? DEFAULT_VALUE_PROPERTY;
  const binLabel = options.binLabel ?? ((bin: HistogramBin) => `${bin.start}–${bin.end}`);

  const data = bins.map((bin) => ({
    [GROUP_PROPERTY]: binLabel(bin),
    [valueProperty]: bin.value,
    binStart: bin.start,
    binEnd: bin.end,
    binCenter: bin.center,
    count: bin.count
  }));

  // Bins are contiguous and equal width, so an ordinal axis positions them
  // identically to a linear one while letting the bars fill each bin (on a
  // linear group axis a bar always spans a single group *value*, which for a
  // multi-unit-wide bin leaves the bars as slivers).
  const groupAxisConfig: Partial<GroupAxisConfig> = {
    property: GROUP_PROPERTY,
    type: 'string',
    scale: 'ordinal',
    groupPadding: { inner: 0, outer: 0 }
  };
  const seriesConfig: Partial<SeriesConfig> = {
    property: valueProperty,
    renderer: 'bar',
    title: options.seriesTitle ?? getDefaultSeriesTitle(options)
  };
  return { bins, data, groupAxisConfig, seriesConfig };
}

function getDefaultSeriesTitle(options: BinValuesOptions): string {
  switch (options.normalize) {
    case 'probability':
      return 'Probability';
    case 'density':
      return 'Density';
    default:
      return 'Count';
  }
}

function getExtent(values: readonly number[]): [number, number] | null {
  if (values.length === 0) {
    return null;
  }
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return [min, max];
}

function getBinLayout(
  domainMin: number,
  domainMax: number,
  valueCount: number,
  options: BinValuesOptions
): { start: number; width: number; binCount: number } {
  const extent = domainMax - domainMin;
  const nice = options.nice ?? true;

  let width = options.binWidth ?? 0;
  if (width <= 0) {
    const targetCount = options.binCount ?? getSturgesBinCount(valueCount);
    if (extent === 0) {
      // All values identical — a single unit-width (or nice-width) bin.
      width = nice ? getNiceStep(1) : 1;
    } else if (nice) {
      width = getNiceStep(extent / Math.max(1, targetCount));
    } else {
      return { start: domainMin, width: extent / Math.max(1, targetCount), binCount: Math.max(1, targetCount) };
    }
  }

  const start = nice ? roundToPrecision(Math.floor(domainMin / width) * width, width) : domainMin;
  const spanned = (domainMax - start) / width;
  // A max landing exactly on an edge still needs a bin to fall into.
  const binCount = Math.max(1, spanned % 1 === 0 && spanned > 0 ? spanned : Math.ceil(spanned));
  return { start, width, binCount };
}

function getSturgesBinCount(valueCount: number): number {
  return valueCount === 0 ? 1 : Math.max(1, Math.ceil(Math.log2(valueCount)) + 1);
}

function getNiceStep(rawStep: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  for (const step of NICE_STEPS) {
    if (step * magnitude >= rawStep) {
      return roundToPrecision(step * magnitude, magnitude);
    }
  }
  return 10 * magnitude;
}

function roundToPrecision(value: number, step: number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(Math.abs(step))) + 2);
  return Number(value.toFixed(Math.min(20, decimals)));
}
