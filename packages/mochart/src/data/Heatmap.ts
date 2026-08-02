import { interpolateRgb, interpolateHsl, interpolateLab, interpolateHcl } from 'd3-interpolate';

import type { ColorInterpolation } from '../config/core/constants';
import type { DeepPartial, GroupAxisConfig, SeriesAxisConfig, SeriesConfig } from '../types/config';

export interface HeatmapRow {
  /** The row title, e.g. shown in the legend and tooltip. */
  label: string;
  /** One cell value per column; null/undefined leaves a gap in the grid. */
  values: readonly (number | null | undefined)[];
}

export interface CreateHeatmapColorScaleOptions {
  /**
   * The cell color at the low end of the value domain. Together with
   * `colorMax` the defaults form a single-hue light-to-dark sequential blue
   * ramp that reads on both light and dark surfaces.
   *
   * @default '#cde2fb'
   */
  colorMin?: string;
  /**
   * The cell color at the high end of the value domain.
   *
   * @default '#0d366b'
   */
  colorMax?: string;
  /**
   * The color space the ramp interpolates through, matching the series config
   * `colorInterpolation` values. The default 'lab' (and 'rgb') interpolate
   * linearly, which keeps the per-row series colors emitted by
   * `createHeatmap` exactly on the global ramp; 'hsl'/'hcl' rotate through
   * hue and can drift very slightly per row.
   *
   * @default 'lab'
   */
  colorInterpolation?: ColorInterpolation;
}

export interface CreateHeatmapOptions extends CreateHeatmapColorScaleOptions {
  /**
   * The column labels, used as the group values (must be unique). Defaults to
   * the 1-based column numbers as strings.
   */
  columnLabels?: readonly string[];
  /**
   * The value domain the cell colors are scaled over. Defaults to the extent
   * of all cell values. Cell values outside an explicit domain are clamped
   * toward the end colors.
   */
  domain?: [number, number];
  /**
   * The fraction (0 - 0.5) of a cell trimmed from each side as the gap
   * between neighbouring cells (use 0 for a contiguous grid).
   *
   * @default 0.03
   */
  cellPadding?: number;
}

export interface HeatmapData {
  /** The value domain the cell colors are scaled over (null with no values). */
  domain: [number, number] | null;
  /** Maps a cell value to its hex color, e.g. for building a color legend. */
  colorScale: (value: number) => string;
  /**
   * One entry per column: `column` (the group value) plus, for each heatmap
   * row `r` with a cell in the column, `row{r}` / `row{r}Start` (the cell's
   * band on the series axis) and `row{r}Value` (the value driving the color).
   */
  data: Record<string, number | string | undefined>[];
  /** Fragment to spread into the chart config's `groupAxisConfig`. */
  groupAxisConfig: Partial<GroupAxisConfig>;
  /** Fragment to spread into the chart config's (sole) series axis config. */
  seriesAxisConfig: Partial<SeriesAxisConfig>;
  /** Fragments to spread into the chart config's `seriesConfigs`, one per row. */
  seriesConfigs: DeepPartial<SeriesConfig>[];
}

const GROUP_PROPERTY = 'column';
const DEFAULT_COLOR_MIN = '#cde2fb';
const DEFAULT_COLOR_MAX = '#0d366b';
const DEFAULT_COLOR_INTERPOLATION: ColorInterpolation = 'lab';
const DEFAULT_CELL_PADDING = 0.03;

const INTERPOLATORS: Record<ColorInterpolation, (a: string, b: string) => (t: number) => string> = {
  rgb: interpolateRgb,
  hsl: interpolateHsl,
  lab: interpolateLab,
  hcl: interpolateHcl
};

/**
 * Builds the sequential color scale a heatmap uses: `domain[0]` maps to
 * `colorMin`, `domain[1]` to `colorMax`, values outside the domain clamp to
 * the end colors and everything in between interpolates through
 * `colorInterpolation` space. Returned colors are hex strings.
 */
export function createHeatmapColorScale(domain: [number, number], options: CreateHeatmapColorScaleOptions = {}): (value: number) => string {
  const colorMin = options.colorMin ?? DEFAULT_COLOR_MIN;
  const colorMax = options.colorMax ?? DEFAULT_COLOR_MAX;
  const interpolate = INTERPOLATORS[options.colorInterpolation ?? DEFAULT_COLOR_INTERPOLATION](colorMin, colorMax);
  const [min, max] = domain;
  const extent = max - min;
  return (value: number) => {
    // A collapsed domain (all cells equal) sits every cell at the ramp midpoint.
    const t = extent > 0 ? Math.min(Math.max((value - min) / extent, 0), 1) : 0.5;
    return toHexColor(interpolate(t));
  };
}

/**
 * Turns a grid of values into the pieces of a heatmap chart: each row becomes
 * a full-width `bar` series floating on a fixed one-unit band of a linear
 * series axis labelled with the row names via explicit `ticks` (`rows[0]` on
 * top), columns become ordinal group values, and each cell's `colorProperty`
 * value colors it from a shared sequential ramp. Spread the fragments into a
 * chart config and chart the `data`. The row series stay out of the legend
 * (`showInLegend: false`) — the axis names the rows and a color-scale strip
 * built from `colorScale` makes the better legend.
 *
 * The core color scale spans each series' own color-value extent, so each
 * row's `colorScale.min`/`colorScale.max` is the global ramp sampled at that row's
 * min/max — linear interpolation restricted to a sub-interval reproduces the
 * global scale, keeping cell colors comparable across rows.
 *
 * Each series sets `tooltipProperty` to the cell value, so the tooltip shows
 * the value driving the color rather than the cell's band coordinates.
 */
export function createHeatmap(rows: readonly HeatmapRow[], options: CreateHeatmapOptions = {}): HeatmapData {
  const cellPadding = options.cellPadding ?? DEFAULT_CELL_PADDING;
  const rowCount = rows.length;
  const columnCount = rows.reduce((count, row) => Math.max(count, row.values.length), 0);

  const domain = options.domain ?? getExtent(rows.flatMap((row) => row.values));
  const colorScale = createHeatmapColorScale(domain ?? [0, 1], options);

  const data: Record<string, number | string | undefined>[] = [];
  for (let c = 0; c < columnCount; c++) {
    const entry: Record<string, number | string | undefined> = {
      [GROUP_PROPERTY]: options.columnLabels?.[c] ?? String(c + 1)
    };
    for (let r = 0; r < rowCount; r++) {
      const value = rows[r].values[c];
      if (value != null && Number.isFinite(value)) {
        entry['row' + r] = rowCount - r - cellPadding;
        entry['row' + r + 'Start'] = rowCount - r - 1 + cellPadding;
        entry['row' + r + 'Value'] = value;
      }
    }
    data.push(entry);
  }

  const groupAxisConfig: Partial<GroupAxisConfig> = {
    property: GROUP_PROPERTY,
    type: 'string',
    scale: 'ordinal',
    // The inner gap is shared between two neighbouring columns, matching the
    // one-sided vertical trim between two neighbouring rows.
    groupPadding: { inner: cellPadding * 2, outer: cellPadding }
  };

  // Pinned to exactly the stacked row bands, with one explicit tick per row
  // labelling its band center (auto numeric ticks would land on band edges
  // and mislabel the rows).
  const seriesAxisConfig: Partial<SeriesAxisConfig> = {
    min: 0,
    max: Math.max(rowCount, 1),
    minMarginPercent: 0,
    maxMarginPercent: 0,
    ticks: rows.map((row, r) => ({ value: rowCount - r - 0.5, label: row.label }))
  };

  const seriesConfigs = rows.map((row, r) => {
    const rowDomain = getExtent(row.values) ?? domain ?? [0, 1];
    return {
      id: 'row' + r,
      property: 'row' + r,
      rangeProperty: 'row' + r + 'Start',
      tooltipProperty: 'row' + r + 'Value',
      colorProperty: 'row' + r + 'Value',
      colorScale: {
        interpolation: options.colorInterpolation ?? DEFAULT_COLOR_INTERPOLATION,
        min: colorScale(rowDomain[0]),
        max: colorScale(rowDomain[1])
      },
      renderer: 'bar',
      skipMissing: true,
      group: null,
      stack: null,
      shapeStyle: { normal: { fillOpacity: 1 } },
      // Rows are named by the axis ticks; a legend entry per row would only
      // invite suppressing rows, which reads as data rather than a hidden series.
      showInLegend: false,
      title: row.label
    } as DeepPartial<SeriesConfig>;
  });

  return { domain, colorScale, data, groupAxisConfig, seriesAxisConfig, seriesConfigs };
}

function getExtent(values: readonly (number | null | undefined)[]): [number, number] | null {
  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value != null && Number.isFinite(value)) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  return min <= max ? [min, max] : null;
}

// d3's interpolators return 'rgb(r, g, b)' strings; the config color
// validator wants hex (its rgb() form rejects the spaces).
function toHexColor(color: string): string {
  const match = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (match === null) {
    return color;
  }
  return '#' + match.slice(1, 4).map((channel) => Number(channel).toString(16).padStart(2, '0')).join('');
}
