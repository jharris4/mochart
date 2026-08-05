import type { PieTooltipLabelType } from '../config/core/constants';
import type { ChartConfig, DeepPartial, CategoryAxisConfig, PieConfig, SeriesConfig } from '../types/config';

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
   * The single category value the pie renders (pie data is one row).
   *
   * @default 'all'
   */
  categoryValue?: string;
  /**
   * What the tooltip shows for each slice: the slice value, its percentage of
   * the total, or both. Percentages are computed by the chart from the current
   * slice shares — like the slice labels, they renormalize as slices are
   * filtered — so this is forwarded as `pie.tooltipValues` rather than
   * baked into the data.
   *
   * @default 'value'
   */
  tooltipValues?: PieTooltipLabelType;
  /** A d3 format specifier forwarded to each slice's series config. */
  valueFormat?: string;
  /**
   * Shorthand for a donut chart: emits a `pie` fragment with
   * `innerRadiusFraction` 0.6 (override via `innerRadiusFraction`).
   *
   * @default false
   */
  donut?: boolean;
  /** An explicit inner radius fraction (0 - 1) for the `pie` fragment. */
  innerRadiusFraction?: number;
}

export interface PieData {
  /** The sum of the (clamped) slice values. */
  total: number;
  /** Each slice's fraction of the total, in item order (all 0 when total is 0). */
  fractions: number[];
  /** A single row: the category value plus `slice{i}` per item. */
  data: Record<string, number | string>[];
  /** Fragment to spread into the chart config's `chart` (sets type: 'pie'). */
  chart: Partial<ChartConfig>;
  /** Fragment to spread into the chart config's `pie`. */
  pie: Partial<PieConfig>;
  /** Fragment to spread into the chart config's `categoryAxis`. */
  categoryAxis: Partial<CategoryAxisConfig>;
  /** Fragments to spread into the chart config's `series`, one per slice. */
  series: DeepPartial<SeriesConfig>[];
}

const CATEGORY_PROPERTY = 'group';
const DEFAULT_CATEGORY_VALUE = 'all';
const DEFAULT_DONUT_INNER_RADIUS_FRACTION = 0.6;

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
 * filters it), and the data is a single row holding every slice value.
 * Spread the fragments into a chart config and chart the `data`. Slices
 * without an explicit color take the palette color for their series index.
 */
export function createPie(items: readonly PieItem[], options: CreatePieOptions = {}): PieData {
  const { total, fractions } = computePieFractions(items.map((item) => item.value));

  const row: Record<string, number | string> = {
    [CATEGORY_PROPERTY]: options.categoryValue ?? DEFAULT_CATEGORY_VALUE
  };
  items.forEach((item, i) => {
    row['slice' + i] = Number.isFinite(item.value) && item.value > 0 ? item.value : 0;
  });

  const chart: Partial<ChartConfig> = { type: 'pie' };

  const pie: Partial<PieConfig> = {};
  if (options.tooltipValues !== undefined) {
    pie.tooltipValues = options.tooltipValues;
  }
  const innerRadiusFraction = options.innerRadiusFraction ?? (options.donut === true ? DEFAULT_DONUT_INNER_RADIUS_FRACTION : undefined);
  if (innerRadiusFraction !== undefined) {
    pie.innerRadiusFraction = innerRadiusFraction;
  }

  const categoryAxis: Partial<CategoryAxisConfig> = {
    property: CATEGORY_PROPERTY,
    type: 'string',
    scale: 'ordinal'
  };

  const seriesConfigs = items.map((item, i) => {
    const seriesConfig: DeepPartial<SeriesConfig> = {
      id: 'slice' + i,
      property: 'slice' + i,
      title: item.label
    };
    if (item.color !== undefined) {
      seriesConfig.shapeStyle = { normal: { strokeColor: item.color, fillColor: item.color } };
    }
    if (options.valueFormat !== undefined) {
      seriesConfig.valueFormat = options.valueFormat;
    }
    return seriesConfig;
  });

  return { total, fractions, data: [row], chart, pie, categoryAxis, series: seriesConfigs };
}
