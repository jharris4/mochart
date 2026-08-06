import type { MochartConfig, MochartInputConfig } from './config';
import type { Bounds } from './geometry';
import type { DataProvider, DataRow } from './data';

/** Pointer event details reported by the plot-area callbacks. */
export interface ChartEventPayload {
  /** Pointer x relative to the chart container, in pixels. */
  chartX: number;
  /** Pointer y relative to the chart container, in pixels. */
  chartY: number;
  /** Pointer position along the category axis, in plot pixels. */
  categoryPosition: number;
  /** Pointer position along the value axis, in plot pixels. */
  valuePosition: number;
  /** Pointer position along the category axis as a 0–1 fraction of the plot. */
  categoryPercentage: number;
  /** Pointer position along the value axis as a 0–1 fraction of the plot. */
  valuePercentage: number;
  /** Index of the category nearest the pointer, -1 when none. */
  categoryIndex: number;
}

/** The chart's current focus, reported by `onFocus`. */
export interface ChartFocus {
  /** Id of the focused value axis, or null when no axis is focused. */
  focusedValueAxisId: string | null;
  /** Id of the focused series, or null when no series is focused. */
  focusedSeriesId: string | null;
  /** Index of the focused category, -1 when no category is focused. */
  focusedCategoryIndex: number;
}

/** Partial focus update raised from inside the chart (undefined = leave unchanged, null = clear). */
export interface InternalFocus {
  valueAxisId?: string | null;
  seriesId?: string | null;
  categoryIndex?: number | null;
}

/** The legend filtering state, reported by `onSeriesFilter`. */
export interface ChartSeriesFilter {
  /** Map of series id → true for every series currently filtered out. */
  filteredSeriesIds: Record<string, boolean>;
}

export interface ChartDomAccessors {
  getTitleTextDomElement(): SVGGraphicsElement | null;
  getTitleTextRawDomElement(): SVGGraphicsElement | null;
  getTitlePrefixDomElement(): SVGGraphicsElement | null;
  getTitleSuffixDomElement(): SVGGraphicsElement | null;
  getCategoryAxisTicksDomElements(): NodeListOf<SVGGraphicsElement>;
  getCategoryAxisSizeTickDomElement(): SVGGraphicsElement | null;
  getCategoryAxisTitleDomElement(): SVGGraphicsElement | null;
  getCategoryAxisThresholdTitleDomElements(): NodeListOf<SVGGraphicsElement>;
  getValueAxisTicksDomElementsForId(axisId: string): NodeListOf<SVGGraphicsElement>;
  getValueAxisTitleDomElementForId(axisId: string): SVGGraphicsElement | null;
  getValueAxisThresholdTitleDomElementsForId(axisId: string): NodeListOf<SVGGraphicsElement>;
  getLegendDomElement(): HTMLElement | null;
  getLegendItemTextDomElements(): NodeListOf<SVGGraphicsElement>;
  getLegendItemTextRawDomElements(): NodeListOf<SVGGraphicsElement>;
  getTooltipDomElement(): HTMLElement | null;
}

export interface ChartFactoryContext {
  /** The chart's current width in pixels. */
  width?: number;
  /** The chart's current height in pixels. */
  height?: number;
  /** The enhanced config, or null when the config failed validation. */
  mochartConfig?: MochartConfig | null;
  /** The current data provider, or null when there is none. */
  dataProvider?: DataProvider | null;
  /** The `error` prop, when the chart is in its error state. */
  error?: unknown;
  /** False when the dataset has no categories. */
  hasData?: boolean;
}

/** Content accepted from loading, error, and empty-state factories. */
export type ChartFactoryContent = Node | string | number | false | null | undefined;
export type ChartContentFactory = (context: ChartFactoryContext) => ChartFactoryContent;

/** A pie/donut/gauge slice click, reported by `onSliceClick`. */
export interface ChartSliceClickPayload {
  /** Id of the clicked slice's series (the leader for follower series). */
  seriesId: string;
}

/** Optional interaction callbacks accepted by both chart entry points. */
export interface ChartCallbacks {
  /** The plot area was clicked. */
  onChartClick?: (event: ChartEventPayload) => void;
  /**
   * A slice of a pie-type chart was clicked. Unlike `onFocus` (which pointer
   * hover also drives), this fires only on click, so it can anchor selection.
   */
  onSliceClick?: (payload: ChartSliceClickPayload) => void;
  /** The pointer entered the plot area. */
  onChartMouseEnter?: (event: ChartEventPayload) => void;
  /** The pointer moved within the plot area. */
  onChartMouseMove?: (event: ChartEventPayload) => void;
  /** The pointer left the plot area. */
  onChartMouseLeave?: (event: ChartEventPayload) => void;
  /** The chart title was clicked (see `titleConfig.link`/`linkDisabled`). */
  onTitleClick?: () => void;
  /**
   * The focused series/category/value axis — via pointer over/click on the
   * plot or the legend, per the `focusOnMouseOver`/`focusOnClick` config.
   */
  onFocus?: (focus: ChartFocus) => void;
  /**
   * A legend click toggled a series in or out of the filtered set
   * (requires `legendConfig.filterOnClick`).
   */
  onSeriesFilter?: (filter: ChartSeriesFilter) => void;
  /** The plot area was re-laid-out; reports its new bounds. */
  onSeriesLayoutBoundsChange?: (bounds: Bounds) => void;
}

/**
 * Factories customizing what renders in each non-chart state. Each is called
 * with a {@link ChartFactoryContext} and returns a DOM node or string.
 */
export interface ChartFactories {
  /** Rendered while the `loading` prop is true. */
  getLoadingComponent?: ChartContentFactory;
  /** Rendered while the `error` prop is set. */
  getErrorComponent?: ChartContentFactory;
  /** Rendered when the dataset has no categories. */
  getNoDataComponent?: ChartContentFactory;
  /** Rendered when width or height is 0. */
  getNoSizeComponent?: ChartContentFactory;
  /** Rendered when the config declares no series. */
  getNoSeriesComponent?: ChartContentFactory;
  /** Rendered when the config fails validation. */
  getConfigErrorComponent?: ChartContentFactory;
}

/** Props shared by both chart entry points. */
export interface BaseChartProps extends ChartCallbacks, ChartFactories {
  /** Chart width in pixels (the framework bindings can derive it from the container). */
  width: number;
  /** Chart height in pixels (the framework bindings can derive it from the container). */
  height: number;
  /** Inline style applied to the chart's root element. */
  style?: string | Record<string, string | number | null | undefined>;
  /** Switches the chart into its loading state (see `getLoadingComponent`). */
  loading?: boolean;
  /** Switches the chart into its error state when set to anything but null/undefined — `''` and `0` count (see `getErrorComponent`). */
  error?: unknown;
  /**
   * Externally-controlled focused category index (-1 = none). When set (not
   * undefined) it overrides the chart's internal focus state on every update;
   * pass back the value reported by `onFocus` to keep several charts in sync.
   * Leave undefined to let the chart manage focus internally.
   */
  focusedCategoryIndex?: number;
  /** Externally-controlled focused value-axis id (null = none). See `focusedCategoryIndex`. */
  focusedValueAxisId?: string | null;
  /** Externally-controlled focused series id (null = none). See `focusedCategoryIndex`. */
  focusedSeriesId?: string | null;
  /**
   * Externally-controlled filter map (series id → true = filtered out).
   * When set it overrides the chart's internal filter state on every update;
   * pass back the map reported by `onSeriesFilter` to sync legend filtering.
   */
  filteredSeriesIds?: Record<string, boolean>;
}

/** Props accepted by createChart, which takes an already enhanced config. */
export interface ManagedChartProps extends BaseChartProps {
  /** The enhanced config produced by `enhanceConfig` (validated, defaults applied). */
  mochartConfig: MochartConfig;
  /** The data source; use a built-in provider or any `DataProvider` implementation. */
  dataProvider: DataProvider;
}

/** Props accepted by createDefaultChart, which enhances a raw config. */
export interface DefaultChartProps extends BaseChartProps {
  /** The raw config; validated and enhanced internally on every change. */
  config: MochartInputConfig;
  /**
   * The dataset as one object per category; wrapped in an
   * `ArrayOfObjectsDataProvider` keyed by `categoryAxisConfig.property`.
   */
  data: readonly DataRow[];
}
