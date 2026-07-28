import {
  computeCandlesticks, DIRECTIONS, DEFAULT_TITLES, DEFAULT_COLORS, GROUP_PROPERTY, DEFAULT_RANGE_TITLE
} from './Candlestick';
import type { Candlestick, CandlestickDirection, CandlestickItem } from './Candlestick';
import type { GroupAxisConfig, SeriesConfig } from '../types/config';

export interface CreateOhlcOptions {
  /** The per-direction series titles, e.g. shown in the legend. */
  seriesTitles?: Partial<Record<CandlestickDirection, string>>;
  /**
   * The per-direction bar colors, used for the low/high line and both ticks.
   * The defaults pass the palette validation for adjacent bars on both light
   * and dark surfaces.
   */
  colors?: Partial<Record<CandlestickDirection, string>>;
  /**
   * The fraction (0 - 1) of the group slot used by the vertical low/high line.
   *
   * @default 0.15
   */
  lineWidthPercent?: number;
  /**
   * The fraction (0 - 1) of the group slot used by each open/close tick. Ticks
   * extend from the slot edge to its center, so at the default each tick spans
   * half the slot.
   *
   * @default 0.5
   */
  tickWidthPercent?: number;
  /**
   * The thickness (in pixels) of the open/close tick marks.
   *
   * @default 2
   */
  tickExtent?: number;
  /**
   * The tooltip label shown for the low/high line rows.
   *
   * @default "Range"
   */
  rangeTitle?: string;
  /**
   * The tooltip label shown for the open tick rows.
   *
   * @default "Open"
   */
  openTitle?: string;
  /**
   * The tooltip label shown for the close tick rows.
   *
   * @default "Close"
   */
  closeTitle?: string;
}

export interface OhlcData {
  candles: Candlestick[];
  /**
   * One row per bar: `label` (the group value), the raw `open`/`high`/`low`/
   * `close` plus `change` and `direction`, and the direction-split values the
   * series read (the other direction stays undefined): the close under `up`/
   * `down`, the high under `upHigh`/`downHigh` and the open under `upOpen`/
   * `downOpen`.
   */
  data: Record<string, number | string | undefined>[];
  /** Fragment to spread into the chart config's `groupAxisConfig`. */
  groupAxisConfig: Partial<GroupAxisConfig>;
  /**
   * Fragments to spread into the chart config's `seriesConfigs`: the low/high
   * lines first (the legend entries), then the open and close ticks that
   * follow them, in up/down order. Directions absent from the data keep their
   * series so the config stays stable across data updates.
   */
  seriesConfigs: Partial<SeriesConfig>[];
}

const DEFAULT_LINE_WIDTH_PERCENT = 0.15;
const DEFAULT_TICK_WIDTH_PERCENT = 0.5;
const DEFAULT_TICK_EXTENT = 2;
const DEFAULT_OPEN_TITLE = 'Open';
const DEFAULT_CLOSE_TITLE = 'Close';

export function createOhlc(items: readonly CandlestickItem[], options: CreateOhlcOptions = {}): OhlcData {
  const candles = computeCandlesticks(items);
  const lineWidthPercent = options.lineWidthPercent ?? DEFAULT_LINE_WIDTH_PERCENT;
  const tickWidthPercent = options.tickWidthPercent ?? DEFAULT_TICK_WIDTH_PERCENT;
  const tickExtent = options.tickExtent ?? DEFAULT_TICK_EXTENT;
  const rangeTitle = options.rangeTitle ?? DEFAULT_RANGE_TITLE;
  const openTitle = options.openTitle ?? DEFAULT_OPEN_TITLE;
  const closeTitle = options.closeTitle ?? DEFAULT_CLOSE_TITLE;

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
    upOpen: candle.direction === 'up' ? candle.open : undefined,
    downOpen: candle.direction === 'down' ? candle.open : undefined,
    change: candle.change,
    direction: candle.direction
  }));

  // An ordinal scale so the bars keep even spacing when labels are dates with
  // gaps (weekends, holidays) — a linear/time scale would leave holes.
  const groupAxisConfig: Partial<GroupAxisConfig> = {
    property: GROUP_PROPERTY,
    type: 'string',
    scale: 'ordinal'
  };

  // Three bar series per direction, each defined for exactly one direction per
  // group (skipMissing + skipPartialRange skip the other, as in the
  // candlestick helper): a thin centered low→high line, plus zero-extent range
  // bars (property and rangeProperty read the same value) that barMinExtent
  // expands into tick marks — the open tick in the left half of the slot
  // (barAlignPercent 0) and the close tick in the right half (barAlignPercent
  // 1), each reaching the center line. The lines carry the legend entries;
  // the ticks stay out of the legend but follow their line's filtering and
  // focus via followSeries, so the whole bar acts as one mark. Tooltip rows
  // per group: the range (low – high) then the open and close ticks, whose
  // equal-ended ranges collapse to single values.
  const lineConfigs = DIRECTIONS.map((direction) => ({
    id: direction,
    property: direction + 'High',
    rangeProperty: 'low',
    renderer: 'bar',
    barWidthPercent: lineWidthPercent,
    skipMissing: true,
    skipPartialRange: true,
    group: null,
    stack: null,
    fillOpacity: 1,
    title: options.seriesTitles?.[direction] ?? DEFAULT_TITLES[direction],
    valueLabel: rangeTitle,
    fillColor: options.colors?.[direction] ?? DEFAULT_COLORS[direction]
  } as Partial<SeriesConfig>));

  const tickConfigs = (['open', 'close'] as const).flatMap((side) => DIRECTIONS.map((direction) => ({
    id: direction + (side === 'open' ? 'Open' : 'Close'),
    property: side === 'open' ? direction + 'Open' : direction,
    rangeProperty: side,
    renderer: 'bar',
    barWidthPercent: tickWidthPercent,
    barAlignPercent: side === 'open' ? 0 : 1,
    barMinExtent: tickExtent,
    skipMissing: true,
    skipPartialRange: true,
    group: null,
    stack: null,
    fillOpacity: 1,
    showInLegend: false,
    followSeries: direction,
    valueLabel: side === 'open' ? openTitle : closeTitle,
    fillColor: options.colors?.[direction] ?? DEFAULT_COLORS[direction]
  } as Partial<SeriesConfig>)));

  return { candles, data, groupAxisConfig, seriesConfigs: [...lineConfigs, ...tickConfigs] };
}
