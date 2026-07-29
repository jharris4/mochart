import type { ChartConfig, GroupAxisConfig, PieConfig, SeriesConfig } from '../types/config';

export interface PieItem {
  /** The slice title, e.g. shown in the legend and tooltip. */
  label: string;
  /** The slice value; non-finite or negative values count as 0. */
  value: number;
  /** An explicit slice color; defaults to the palette color for the slice index. */
  color?: string;
}

export interface CreatePieOptions {
  /**
   * The single group value the pie renders (pie data is one row).
   *
   * @default 'all'
   */
  groupValue?: string;
  /**
   * What the tooltip shows for each slice: the raw slice value, or the slice's
   * percentage of the total (precomputed into the data row, so it reflects the
   * values passed in — not any later suppression).
   *
   * @default 'value'
   */
  tooltipValues?: 'value' | 'percent';
  /** A d3 format specifier forwarded to each slice's series config. */
  valueFormat?: string;
  /**
   * Shorthand for a donut chart: emits a `pieConfig` fragment with
   * `innerRadiusPercent` 0.6 (override via `innerRadiusPercent`).
   *
   * @default false
   */
  donut?: boolean;
  /** An explicit inner radius fraction (0 - 1) for the `pieConfig` fragment. */
  innerRadiusPercent?: number;
}

export interface PieData {
  /** The sum of the (clamped) slice values. */
  total: number;
  /** Each slice's fraction of the total, in item order (all 0 when total is 0). */
  fractions: number[];
  /**
   * A single row: the group value plus `slice{i}` per item (and
   * `slice{i}Percent` when `tooltipValues` is 'percent').
   */
  data: Record<string, number | string>[];
  /** Fragment to spread into the chart config's `chartConfig` (sets type: 'pie'). */
  chartConfig: Partial<ChartConfig>;
  /** Fragment to spread into the chart config's `pieConfig`. */
  pieConfig: Partial<PieConfig>;
  /** Fragment to spread into the chart config's `groupAxisConfig`. */
  groupAxisConfig: Partial<GroupAxisConfig>;
  /** Fragments to spread into the chart config's `seriesConfigs`, one per slice. */
  seriesConfigs: Partial<SeriesConfig>[];
}

const GROUP_PROPERTY = 'group';
const DEFAULT_GROUP_VALUE = 'all';
const DEFAULT_DONUT_INNER_RADIUS_PERCENT = 0.6;

/**
 * Sums the slice values (clamping negative and non-finite values to 0) and
 * returns each slice's fraction of the total. A total of 0 yields all-zero
 * fractions.
 */
export function computePieFractions(values: readonly number[]): { total: number; fractions: number[] } {
  const clamped = values.map((value) => (Number.isFinite(value) && value > 0 ? value : 0));
  const total = clamped.reduce((sum, value) => sum + value, 0);
  const fractions = clamped.map((value) => (total > 0 ? value / total : 0));
  return { total, fractions };
}

/**
 * Turns labelled values into the pieces of a pie/donut chart: each item
 * becomes one series (so the legend lists the slices and clicking one
 * suppresses it), and the data is a single row holding every slice value.
 * Spread the fragments into a chart config and chart the `data`. Slices
 * without an explicit color take the palette color for their series index.
 */
export function createPie(items: readonly PieItem[], options: CreatePieOptions = {}): PieData {
  const { total, fractions } = computePieFractions(items.map((item) => item.value));
  const percentValues = options.tooltipValues === 'percent';

  const row: Record<string, number | string> = {
    [GROUP_PROPERTY]: options.groupValue ?? DEFAULT_GROUP_VALUE
  };
  items.forEach((item, i) => {
    row['slice' + i] = Number.isFinite(item.value) && item.value > 0 ? item.value : 0;
    if (percentValues) {
      row['slice' + i + 'Percent'] = Math.round(fractions[i] * 1000) / 10;
    }
  });

  const chartConfig: Partial<ChartConfig> = { type: 'pie' };

  const pieConfig: Partial<PieConfig> = {};
  const innerRadiusPercent = options.innerRadiusPercent ?? (options.donut === true ? DEFAULT_DONUT_INNER_RADIUS_PERCENT : undefined);
  if (innerRadiusPercent !== undefined) {
    pieConfig.innerRadiusPercent = innerRadiusPercent;
  }

  const groupAxisConfig: Partial<GroupAxisConfig> = {
    property: GROUP_PROPERTY,
    type: 'string',
    scale: 'ordinal'
  };

  const seriesConfigs = items.map((item, i) => {
    const seriesConfig: Partial<SeriesConfig> = {
      id: 'slice' + i,
      property: 'slice' + i,
      title: item.label
    };
    if (item.color !== undefined) {
      seriesConfig.strokeColor = item.color;
      seriesConfig.fillColor = item.color;
    }
    if (options.valueFormat !== undefined) {
      seriesConfig.valueFormat = options.valueFormat;
    }
    if (percentValues) {
      seriesConfig.tooltipProperty = 'slice' + i + 'Percent';
      seriesConfig.valueSuffix = '%';
    }
    return seriesConfig;
  });

  return { total, fractions, data: [row], chartConfig, pieConfig, groupAxisConfig, seriesConfigs };
}
