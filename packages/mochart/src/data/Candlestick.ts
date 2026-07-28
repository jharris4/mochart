import type { GroupAxisConfig, SeriesConfig } from '../types/config';

export type CandlestickDirection = 'up' | 'down';

export interface CandlestickItem {
  /** The candle label (e.g. the trading day), used as the group value when charted. */
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Candlestick {
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** The signed change of the candle (close minus open). */
  change: number;
  /** `down` when the close is below the open, otherwise `up`. */
  direction: CandlestickDirection;
}

export interface CreateCandlestickOptions {
  /** The per-direction series titles, e.g. shown in the legend and tooltip. */
  seriesTitles?: Partial<Record<CandlestickDirection, string>>;
  /**
   * The per-direction candle colors, used for both the body and its wick. The
   * defaults pass the palette validation for adjacent bars on both light and
   * dark surfaces.
   */
  colors?: Partial<Record<CandlestickDirection, string>>;
  /**
   * The fraction (0 - 1) of the group slot used by the low/high wick bars.
   *
   * @default 0.15
   */
  wickWidthPercent?: number;
  /**
   * The fraction (0 - 1) of the group slot used by the open/close body bars.
   *
   * @default 1
   */
  bodyWidthPercent?: number;
  /**
   * The tooltip label shown for the low/high wick rows.
   *
   * @default "Range"
   */
  rangeTitle?: string;
}

export interface CandlestickData {
  candles: Candlestick[];
  /**
   * One row per candle: `label` (the group value), the raw `open`/`high`/
   * `low`/`close` plus `change` and `direction`, and the close under the
   * property matching its direction (`up` or `down` — the other stays
   * undefined) with the high mirrored the same way (`upHigh`/`downHigh`) so
   * the wicks split by direction too.
   */
  data: Record<string, number | string | undefined>[];
  /** Fragment to spread into the chart config's `groupAxisConfig`. */
  groupAxisConfig: Partial<GroupAxisConfig>;
  /**
   * Fragments to spread into the chart config's `seriesConfigs`, wicks first
   * so the bodies paint over them, in up/down order. Directions absent from
   * the data keep their series so the config stays stable across data updates.
   */
  seriesConfigs: Partial<SeriesConfig>[];
}

const GROUP_PROPERTY = 'label';
const DIRECTIONS: CandlestickDirection[] = ['up', 'down'];

const DEFAULT_TITLES: Record<CandlestickDirection, string> = {
  up: 'Up',
  down: 'Down'
};

// Aqua/red rather than the conventional green/red: green↔red is the classic
// red-green-blindness collision, while this pair stays distinguishable (and
// ≥3:1 against both light and dark chart surfaces). Matches the waterfall
// helper's increase/decrease colors.
const DEFAULT_COLORS: Record<CandlestickDirection, string> = {
  up: '#1baf7a',
  down: '#e34948'
};

const DEFAULT_WICK_WIDTH_PERCENT = 0.15;
const DEFAULT_RANGE_TITLE = 'Range';

export function computeCandlesticks(items: readonly CandlestickItem[]): Candlestick[] {
  return items.map((item) => {
    const { label, open, high, low, close } = item;
    return { label, open, high, low, close, change: close - open, direction: close < open ? 'down' as const : 'up' as const };
  });
}

export function createCandlestick(items: readonly CandlestickItem[], options: CreateCandlestickOptions = {}): CandlestickData {
  const candles = computeCandlesticks(items);
  const wickWidthPercent = options.wickWidthPercent ?? DEFAULT_WICK_WIDTH_PERCENT;
  const bodyWidthPercent = options.bodyWidthPercent ?? 1;
  const rangeTitle = options.rangeTitle ?? DEFAULT_RANGE_TITLE;

  const data = candles.map((candle) => ({
    [GROUP_PROPERTY]: candle.label,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    up: candle.direction === 'up' ? candle.close : undefined,
    down: candle.direction === 'down' ? candle.close : undefined,
    upHigh: candle.direction === 'up' ? candle.high : undefined,
    downHigh: candle.direction === 'down' ? candle.high : undefined,
    change: candle.change,
    direction: candle.direction
  }));

  // An ordinal scale so the candles keep even spacing when labels are dates
  // with gaps (weekends, holidays) — a linear/time scale would leave holes.
  const groupAxisConfig: Partial<GroupAxisConfig> = {
    property: GROUP_PROPERTY,
    type: 'string',
    scale: 'ordinal'
  };

  // Two bar series per direction, each defined for exactly one direction per
  // group (skipMissing + skipPartialRange skip the other, as in the waterfall
  // helper): a thin low→high wick and a full-width open→close body painted
  // over it. Fills are opaque so the body fully covers the wick where they
  // overlap. Wicks stay out of the legend (they'd duplicate the body entries)
  // but follow their body's legend filtering via followSeries, and label
  // their tooltip row with the shared range title, so each group shows one
  // body row (open – close) and one range row (low – high).
  const wickConfigs = DIRECTIONS.map((direction) => ({
    id: direction + 'Wick',
    property: direction + 'High',
    rangeProperty: 'low',
    renderer: 'bar',
    barWidthPercent: wickWidthPercent,
    skipMissing: true,
    skipPartialRange: true,
    group: null,
    stack: null,
    fillOpacity: 1,
    showInLegend: false,
    followSeries: direction,
    valueLabel: rangeTitle,
    fillColor: options.colors?.[direction] ?? DEFAULT_COLORS[direction]
  } as Partial<SeriesConfig>));

  const bodyConfigs = DIRECTIONS.map((direction) => ({
    id: direction,
    property: direction,
    rangeProperty: 'open',
    renderer: 'bar',
    barWidthPercent: bodyWidthPercent,
    skipMissing: true,
    skipPartialRange: true,
    group: null,
    stack: null,
    fillOpacity: 1,
    title: options.seriesTitles?.[direction] ?? DEFAULT_TITLES[direction],
    fillColor: options.colors?.[direction] ?? DEFAULT_COLORS[direction]
  } as Partial<SeriesConfig>));

  return { candles, data, groupAxisConfig, seriesConfigs: [...wickConfigs, ...bodyConfigs] };
}
