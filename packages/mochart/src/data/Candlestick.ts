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
  /**
   * Draw up candles hollow — outlined open/close bodies instead of filled —
   * the classic hollow-candle style where a filled body means down. The wicks
   * split into segments above and below each body so they don't show through
   * the hollow interior, the tooltip keeps its single low–high range row, and
   * the data rows gain an `upOpen` column for the below-body wick segment.
   *
   * @default false
   */
  hollow?: boolean;
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
   * With the `hollow` option the wick series turn shapeless (tooltip row
   * only) and per-direction upper/lower wick segment series slot in between
   * them and the bodies.
   */
  seriesConfigs: Partial<SeriesConfig>[];
}

// Shared with the OHLC helper (src/data/Ohlc.ts); not part of the public API.
export const GROUP_PROPERTY = 'label';
export const DIRECTIONS: CandlestickDirection[] = ['up', 'down'];

export const DEFAULT_TITLES: Record<CandlestickDirection, string> = {
  up: 'Up',
  down: 'Down'
};

// Aqua/red rather than the conventional green/red: green↔red is the classic
// red-green-blindness collision, while this pair stays distinguishable (and
// ≥3:1 against both light and dark chart surfaces). Matches the waterfall
// helper's increase/decrease colors.
export const DEFAULT_COLORS: Record<CandlestickDirection, string> = {
  up: '#1baf7a',
  down: '#e34948'
};

const DEFAULT_WICK_WIDTH_PERCENT = 0.15;
export const DEFAULT_RANGE_TITLE = 'Range';

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
  const hollow = options.hollow ?? false;

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
    // The below-body wick segment of a hollow up candle spans low→open, and
    // needs the open under an up-only property (the shared `open` column is
    // defined on every row, so it can't gate the segment by direction).
    ...(hollow ? { upOpen: candle.direction === 'up' ? candle.open : undefined } : {}),
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
  //
  // In hollow mode the wick can't run behind the body (it would show through
  // the see-through up bodies), so this series stops rendering — keeping only
  // its tooltip range row and interaction targets — and per-direction segment
  // series draw the wick above and below the body instead.
  const wickConfigs = DIRECTIONS.map((direction) => {
    const color = options.colors?.[direction] ?? DEFAULT_COLORS[direction];
    return {
      id: direction + 'Wick',
      property: direction + 'High',
      rangeProperty: 'low',
      renderer: hollow ? 'none' : 'bar',
      barWidthPercent: wickWidthPercent,
      skipMissing: true,
      skipPartialRange: true,
      group: null,
      stack: null,
      fillOpacity: 1,
      showInLegend: false,
      followSeries: direction,
      valueLabel: rangeTitle,
      fillColor: color,
      // strokeColor matches the fill: focused bars grow a 1px outline, and
      // the default strokeColor is the palette color for the series *index*,
      // which would rim the wick in an unrelated color.
      strokeColor: color,
      // markerShape null overrides the renderer-none default (circle
      // markers), and the label fill color/opacity color the tooltip icon,
      // which falls back to them for shapeless series.
      ...(hollow ? { markerShape: null, labelFillColor: color, labelFillOpacity: 1 } : {})
    } as Partial<SeriesConfig>;
  });

  // The visible wick in hollow mode: a segment above the body (body top →
  // high) and one below (low → body bottom), gated to one direction per row
  // by skipPartialRange — an up body's top/bottom are the close (`up`) and
  // the open (`upOpen`), a down body's the open and the close (`down`).
  // Segments stay out of the tooltip; the shapeless wick series above carries
  // the single low – high range row.
  const wickSegmentConfigs = hollow ? DIRECTIONS.flatMap((direction) => {
    const shared = {
      renderer: 'bar',
      barWidthPercent: wickWidthPercent,
      skipMissing: true,
      skipPartialRange: true,
      group: null,
      stack: null,
      fillOpacity: 1,
      showInLegend: false,
      showInTooltip: false,
      followSeries: direction,
      fillColor: options.colors?.[direction] ?? DEFAULT_COLORS[direction],
      strokeColor: options.colors?.[direction] ?? DEFAULT_COLORS[direction]
    };
    return [
      { id: direction + 'WickUpper', property: direction + 'High', rangeProperty: direction === 'up' ? 'up' : 'open', ...shared } as Partial<SeriesConfig>,
      { id: direction + 'WickLower', property: direction === 'up' ? 'upOpen' : 'down', rangeProperty: 'low', ...shared } as Partial<SeriesConfig>
    ];
  }) : [];

  const bodyConfigs = DIRECTIONS.map((direction) => {
    const color = options.colors?.[direction] ?? DEFAULT_COLORS[direction];
    const hollowBody = hollow && direction === 'up';
    return {
      id: direction,
      property: direction,
      rangeProperty: 'open',
      renderer: 'bar',
      barWidthPercent: bodyWidthPercent,
      skipMissing: true,
      skipPartialRange: true,
      group: null,
      stack: null,
      fillOpacity: hollowBody ? 0 : 1,
      title: options.seriesTitles?.[direction] ?? DEFAULT_TITLES[direction],
      fillColor: color,
      strokeColor: color,
      // Outline only: the fill stays transparent in every focus state, and
      // focus thickens the outline instead of the default bar behavior of
      // thinning it back to 1px.
      ...(hollowBody ? {
        focusedFillOpacity: 0,
        defocusedFillOpacity: 0,
        strokeWidth: 2,
        strokeOpacity: 1,
        focusedStrokeWidth: 3,
        defocusedStrokeWidth: 2
      } : {})
    } as Partial<SeriesConfig>;
  });

  return { candles, data, groupAxisConfig, seriesConfigs: [...wickConfigs, ...wickSegmentConfigs, ...bodyConfigs] };
}
