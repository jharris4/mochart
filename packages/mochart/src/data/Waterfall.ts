import type { DeepPartial, GroupAxisConfig, SeriesConfig } from '../types/config';

export type WaterfallDirection = 'increase' | 'decrease' | 'total';

export interface WaterfallItem {
  /** The step label, used as the group value when charted. */
  label: string;
  /**
   * The signed change for a delta step. For a `total` step it instead resets
   * the running total (e.g. an audited opening or closing balance); when
   * omitted the total shows the running total accumulated so far.
   */
  value?: number;
  /**
   * Whether the step is a total: a bar spanning from the base to the running
   * total instead of a floating delta bar.
   */
  total?: boolean;
}

export interface WaterfallStep {
  label: string;
  /** The signed change of the step (for totals, the offset from the base). */
  delta: number;
  /** The value the bar starts from (the base for totals). */
  start: number;
  /** The value the bar ends at. */
  end: number;
  /** The running total after the step. */
  cumulative: number;
  direction: WaterfallDirection;
}

export interface CreateWaterfallOptions {
  /**
   * The value the running total starts from and total bars span from. Also
   * worth setting as the series axis `base` so delta bars near it read
   * correctly.
   *
   * @default 0
   */
  base?: number;
  /** The per-direction series titles, e.g. shown in the legend and tooltip. */
  seriesTitles?: Partial<Record<WaterfallDirection, string>>;
  /**
   * The per-direction bar fill colors. The defaults pass the palette
   * validation for adjacent bars on both light and dark surfaces.
   */
  colors?: Partial<Record<WaterfallDirection, string>>;
}

export interface WaterfallData {
  steps: WaterfallStep[];
  /**
   * One row per step: `label` (the group value), `start` (the shared range
   * property) and the step's `end` under the property matching its direction
   * (`increase`, `decrease` or `total` — the other two stay undefined), plus
   * `delta`, `cumulative` and `direction`.
   */
  data: Record<string, number | string | undefined>[];
  /** Fragment to spread into the chart config's `groupAxisConfig`. */
  groupAxisConfig: Partial<GroupAxisConfig>;
  /**
   * Fragments to spread into the chart config's `seriesConfigs`, one per
   * direction in increase/decrease/total order. Directions absent from the
   * data keep their series so the config stays stable across data updates.
   */
  seriesConfigs: DeepPartial<SeriesConfig>[];
}

const GROUP_PROPERTY = 'label';
const RANGE_PROPERTY = 'start';
const DIRECTIONS: WaterfallDirection[] = ['increase', 'decrease', 'total'];

const DEFAULT_TITLES: Record<WaterfallDirection, string> = {
  increase: 'Increase',
  decrease: 'Decrease',
  total: 'Total'
};

// Aqua/red/blue rather than the conventional green/red: green↔red is the
// classic red-green-blindness collision, while this triple keeps every pair
// distinguishable (and ≥3:1 against both light and dark chart surfaces).
const DEFAULT_COLORS: Record<WaterfallDirection, string> = {
  increase: '#1baf7a',
  decrease: '#e34948',
  total: '#2a78d6'
};

export function computeWaterfallSteps(items: readonly WaterfallItem[], base = 0): WaterfallStep[] {
  let running = base;
  return items.map((item) => {
    const { label } = item;
    if (item.total === true) {
      if (item.value !== undefined) {
        running = item.value;
      }
      return { label, delta: running - base, start: base, end: running, cumulative: running, direction: 'total' as const };
    }
    const value = item.value ?? 0;
    const start = running;
    running += value;
    return { label, delta: value, start, end: running, cumulative: running, direction: value < 0 ? 'decrease' as const : 'increase' as const };
  });
}

export function createWaterfall(items: readonly WaterfallItem[], options: CreateWaterfallOptions = {}): WaterfallData {
  const base = options.base ?? 0;
  const steps = computeWaterfallSteps(items, base);

  const data = steps.map((step) => ({
    [GROUP_PROPERTY]: step.label,
    [RANGE_PROPERTY]: step.start,
    increase: step.direction === 'increase' ? step.end : undefined,
    decrease: step.direction === 'decrease' ? step.end : undefined,
    total: step.direction === 'total' ? step.end : undefined,
    delta: step.delta,
    cumulative: step.cumulative,
    direction: step.direction
  }));

  const groupAxisConfig: Partial<GroupAxisConfig> = {
    property: GROUP_PROPERTY,
    type: 'string',
    scale: 'ordinal'
  };

  // One series per direction, all floating from the shared `start` property;
  // each group carries a value for exactly one of them, so the bars render
  // full-width in their slot (group/stack null keeps them out of any
  // configured grouping) and the legend names the three directions.
  // skipPartialRange matters because `start` exists on every row: without it
  // the two off-direction series would keep zero-extent bars at `start`
  // instead of skipping the group.
  // The shape's strokeColor matches its fill: bars grow a 1px outline when
  // focused, and the default strokeColor is the palette color for the series
  // *index*, which would rim the bar in an unrelated color.
  const seriesConfigs = DIRECTIONS.map((direction) => {
    const color = options.colors?.[direction] ?? DEFAULT_COLORS[direction];
    return {
      id: direction,
      property: direction,
      rangeProperty: RANGE_PROPERTY,
      renderer: 'bar',
      skipMissing: true,
      skipPartialRange: true,
      group: null,
      stack: null,
      title: options.seriesTitles?.[direction] ?? DEFAULT_TITLES[direction],
      shapeStyle: { normal: { strokeColor: color, fillColor: color } }
    } as DeepPartial<SeriesConfig>;
  });

  return { steps, data, groupAxisConfig, seriesConfigs };
}
