import type { DeepPartial, GroupAxisConfig, SeriesAxisConfig, SeriesConfig } from '../types/config';

export type CandlestickDirection = 'up' | 'down';

export interface CandlestickItem {
  /** The candle label (e.g. the trading day), used as the group value when charted. */
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** The traded volume of the candle, charted when the `volume` option enables the volume pane. */
  volume?: number;
}

export interface Candlestick {
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  /** The traded volume of the candle, when the input item carried one. */
  volume?: number;
  /** The signed change of the candle (close minus open). */
  change: number;
  /** `down` when the close is below the open, otherwise `up`. */
  direction: CandlestickDirection;
}

export interface CandlestickVolumeOptions {
  /**
   * The fraction (0 - 1) of the plot height used by the volume pane.
   *
   * @default 0.2
   */
  heightPercent?: number;
  /**
   * The fraction (0 - 1) of the plot height left empty between the price and
   * volume panes.
   *
   * @default 0.05
   */
  gapPercent?: number;
  /**
   * The tooltip label shown for the volume rows.
   *
   * @default "Volume"
   */
  valueLabel?: string;
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
   * Add a volume pane: direction-colored volume bars along the bottom of the
   * plot on their own hidden `volume` axis, with the price series moved to a
   * `price` axis whose enlarged minimum margin reserves the lower plot band.
   * Requires `volume` values on the items; pass `true` for the defaults or an
   * options object to tune the pane. The result gains a `seriesAxisConfigs`
   * fragment to spread into the chart config alongside the series.
   *
   * @default false
   */
  volume?: boolean | CandlestickVolumeOptions;
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
   * them and the bodies. With the `volume` option per-direction volume bar
   * series are appended.
   */
  seriesConfigs: DeepPartial<SeriesConfig>[];
  /**
   * Fragments to spread into the chart config's `seriesAxisConfigs` — only
   * present with the `volume` option: the `price` axis the price series
   * reference and the hidden `volume` axis whose margins split the plot into
   * the two panes.
   */
  seriesAxisConfigs?: Partial<SeriesAxisConfig>[];
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

export const PRICE_AXIS_ID = 'price';
export const VOLUME_AXIS_ID = 'volume';
const DEFAULT_VOLUME_HEIGHT_PERCENT = 0.2;
const DEFAULT_VOLUME_GAP_PERCENT = 0.05;
const DEFAULT_VOLUME_LABEL = 'Volume';

export function computeCandlesticks(items: readonly CandlestickItem[]): Candlestick[] {
  return items.map((item) => {
    const { label, open, high, low, close, volume } = item;
    return {
      label, open, high, low, close,
      ...(volume !== undefined ? { volume } : {}),
      change: close - open,
      direction: close < open ? 'down' as const : 'up' as const
    };
  });
}

/** Resolves the shared candlestick/OHLC `volume` option; null when disabled. */
export function getVolumeOptions(volume: boolean | CandlestickVolumeOptions | undefined): Required<CandlestickVolumeOptions> | null {
  if (volume === undefined || volume === false) {
    return null;
  }
  const options = volume === true ? {} : volume;
  return {
    heightPercent: options.heightPercent ?? DEFAULT_VOLUME_HEIGHT_PERCENT,
    gapPercent: options.gapPercent ?? DEFAULT_VOLUME_GAP_PERCENT,
    valueLabel: options.valueLabel ?? DEFAULT_VOLUME_LABEL
  };
}

// The pane split is pure domain margins, so it adapts to every data update:
// the volume axis pins its minimum at 0 and inflates its maximum until the
// bars only reach `heightPercent` of the plot, while the price axis pads its
// minimum until the price data sits above the volume band and the gap.
// Margins are relative to the pre-margin extent, so a band fraction `f`
// needs a margin of (1 - f) / f.
export function buildVolumeSeriesAxisConfigs(volumeOptions: Required<CandlestickVolumeOptions>): Partial<SeriesAxisConfig>[] {
  const { heightPercent, gapPercent } = volumeOptions;
  const priceHeightPercent = 1 - heightPercent - gapPercent;
  return [
    {
      id: PRICE_AXIS_ID,
      minMarginPercent: (heightPercent + gapPercent) / priceHeightPercent
    },
    {
      id: VOLUME_AXIS_ID,
      min: 0,
      maxMarginPercent: (1 - heightPercent) / heightPercent,
      visible: false
    }
  ];
}

// One volume bar series per direction, mirroring the price series' split:
// out of the legend but following their direction series, so filtering and
// focusing a direction takes its volume bars along, and the tooltip shows a
// single volume row per group.
export function buildVolumeSeriesConfigs(volumeOptions: Required<CandlestickVolumeOptions>, colors: Partial<Record<CandlestickDirection, string>> | undefined): DeepPartial<SeriesConfig>[] {
  return DIRECTIONS.map((direction) => {
    const color = colors?.[direction] ?? DEFAULT_COLORS[direction];
    return {
      id: direction + 'Volume',
      property: direction + 'Volume',
      axis: VOLUME_AXIS_ID,
      renderer: 'bar',
      skipMissing: true,
      group: null,
      stack: null,
      showInLegend: false,
      followSeries: direction,
      valueLabel: volumeOptions.valueLabel,
      shapeStyle: { normal: { strokeColor: color, fillColor: color, fillOpacity: 1 } }
    } as DeepPartial<SeriesConfig>;
  });
}

export function createCandlestick(items: readonly CandlestickItem[], options: CreateCandlestickOptions = {}): CandlestickData {
  const candles = computeCandlesticks(items);
  const wickWidthPercent = options.wickWidthPercent ?? DEFAULT_WICK_WIDTH_PERCENT;
  const bodyWidthPercent = options.bodyWidthPercent ?? 1;
  const rangeTitle = options.rangeTitle ?? DEFAULT_RANGE_TITLE;
  const hollow = options.hollow ?? false;
  const volumeOptions = getVolumeOptions(options.volume);

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
    ...(volumeOptions !== null ? {
      volume: candle.volume,
      upVolume: candle.direction === 'up' ? candle.volume : undefined,
      downVolume: candle.direction === 'down' ? candle.volume : undefined
    } : {}),
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
      ...(volumeOptions !== null ? { axis: PRICE_AXIS_ID } : {}),
      renderer: hollow ? 'none' : 'bar',
      barWidthPercent: wickWidthPercent,
      skipMissing: true,
      skipPartialRange: true,
      group: null,
      stack: null,
      showInLegend: false,
      followSeries: direction,
      valueLabel: rangeTitle,
      // the shape's strokeColor matches its fill: focused bars grow a 1px
      // outline, and the default strokeColor is the palette color for the
      // series *index*, which would rim the wick in an unrelated color.
      shapeStyle: { normal: { strokeColor: color, fillColor: color, fillOpacity: 1 } },
      // markerShape null overrides the renderer-none default (circle
      // markers), and the label fill color/opacity color the tooltip icon,
      // which falls back to them for shapeless series.
      ...(hollow ? { markerShape: null, labelTextStyle: { normal: { fillColor: color, fillOpacity: 1 } } } : {})
    } as DeepPartial<SeriesConfig>;
  });

  // The visible wick in hollow mode: a segment above the body (body top →
  // high) and one below (low → body bottom), gated to one direction per row
  // by skipPartialRange — an up body's top/bottom are the close (`up`) and
  // the open (`upOpen`), a down body's the open and the close (`down`).
  // Segments stay out of the tooltip; the shapeless wick series above carries
  // the single low – high range row.
  const wickSegmentConfigs = hollow ? DIRECTIONS.flatMap((direction) => {
    const shared = {
      ...(volumeOptions !== null ? { axis: PRICE_AXIS_ID } : {}),
      renderer: 'bar',
      barWidthPercent: wickWidthPercent,
      skipMissing: true,
      skipPartialRange: true,
      group: null,
      stack: null,
      showInLegend: false,
      showInTooltip: false,
      followSeries: direction,
      shapeStyle: {
        normal: {
          strokeColor: options.colors?.[direction] ?? DEFAULT_COLORS[direction],
          fillColor: options.colors?.[direction] ?? DEFAULT_COLORS[direction],
          fillOpacity: 1
        }
      }
    };
    return [
      { id: direction + 'WickUpper', property: direction + 'High', rangeProperty: direction === 'up' ? 'up' : 'open', ...shared } as DeepPartial<SeriesConfig>,
      { id: direction + 'WickLower', property: direction === 'up' ? 'upOpen' : 'down', rangeProperty: 'low', ...shared } as DeepPartial<SeriesConfig>
    ];
  }) : [];

  const bodyConfigs = DIRECTIONS.map((direction) => {
    const color = options.colors?.[direction] ?? DEFAULT_COLORS[direction];
    const hollowBody = hollow && direction === 'up';
    return {
      id: direction,
      property: direction,
      rangeProperty: 'open',
      ...(volumeOptions !== null ? { axis: PRICE_AXIS_ID } : {}),
      renderer: 'bar',
      barWidthPercent: bodyWidthPercent,
      skipMissing: true,
      skipPartialRange: true,
      group: null,
      stack: null,
      title: options.seriesTitles?.[direction] ?? DEFAULT_TITLES[direction],
      // Outline only for a hollow body: the fill stays transparent in every
      // focus state, and focus thickens the outline instead of the default bar
      // behavior of thinning it back to 1px.
      shapeStyle: hollowBody ? {
        normal: { strokeColor: color, strokeOpacity: 1, strokeWidth: 2, fillColor: color, fillOpacity: 0 },
        focused: { strokeWidth: 3, fillOpacity: 0 },
        defocused: { strokeWidth: 2, fillOpacity: 0 }
      } : {
        normal: { strokeColor: color, fillColor: color, fillOpacity: 1 }
      }
    } as DeepPartial<SeriesConfig>;
  });

  return {
    candles,
    data,
    groupAxisConfig,
    seriesConfigs: [
      ...wickConfigs,
      ...wickSegmentConfigs,
      ...bodyConfigs,
      ...(volumeOptions !== null ? buildVolumeSeriesConfigs(volumeOptions, options.colors) : [])
    ],
    ...(volumeOptions !== null ? { seriesAxisConfigs: buildVolumeSeriesAxisConfigs(volumeOptions) } : {})
  };
}
