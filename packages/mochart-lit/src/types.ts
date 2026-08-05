/** Props mochart passes to placeholder templates (loading, error, and empty states). */
export interface PlaceholderProps {
  width?: number;
  height?: number;
  mochartConfig?: any;
  dataProvider?: any;
  error?: any;
  hasData?: boolean;
}

/**
 * A lit-html template function rendered for one of the chart's placeholder
 * states. Returns anything lit-html can render (usually a `TemplateResult`).
 */
export type PlaceholderTemplate = (props: PlaceholderProps) => unknown;

export interface ChartCallbackProps {
  onChartClick?: (eventPayload: any) => void;
  onSliceClick?: (payload: any) => void;
  onChartMouseEnter?: (eventPayload: any) => void;
  onChartMouseMove?: (eventPayload: any) => void;
  onChartMouseLeave?: (eventPayload: any) => void;
  onTitleClick?: () => void; // core calls it with no arguments
  onFocus?: (focusData: any) => void;
  onSeriesFilter?: (filterData: any) => void;
  onSeriesLayoutBoundsChange?: (bounds: any) => void;
  loadingTemplate?: PlaceholderTemplate;
  errorTemplate?: PlaceholderTemplate;
  noDataTemplate?: PlaceholderTemplate;
  noSizeTemplate?: PlaceholderTemplate;
  noSeriesTemplate?: PlaceholderTemplate;
  configErrorTemplate?: PlaceholderTemplate;
}

export interface BaseChartProps extends ChartCallbackProps {
  /** Explicit pixel width; omit to track the container element's width. */
  width?: number;
  /** Explicit pixel height; omit to track the container element's height. */
  height?: number;
  /**
   * CSS class for the container div the chart mounts into — the directive
   * equivalent of the class/style fallthrough the component wrappers get.
   */
  className?: string;
  /** Inline style for the container div; explicit `width`/`height` props win. */
  style?: string;
  loading?: boolean;
  error?: any;
  /**
   * Controlled focused group index (-1 = none). When set it overrides the
   * chart's internal focus on every render; pass back the value reported by
   * `onFocus` to keep several charts in sync. Omit to leave focus
   * chart-managed.
   */
  focusedCategoryIndex?: number;
  /** Controlled focused series-axis id (null = none). See `focusedCategoryIndex`. */
  focusedValueAxisId?: string | null;
  /** Controlled focused series id (null = none). See `focusedCategoryIndex`. */
  focusedSeriesId?: string | null;
  /**
   * Controlled filter map (series id → true = filtered out); pass back the
   * map reported by `onSeriesFilter` to sync legend filtering across charts.
   */
  filteredSeriesIds?: Record<string, boolean>;
}

/** Props for the `chart` directive: a pre-enhanced config plus a data provider. */
export interface ChartProps extends BaseChartProps {
  mochartConfig: any;
  dataProvider: any;
}

/** Props for the `defaultChart` directive: a raw config plus a plain array-of-objects dataset. */
export interface DefaultChartProps extends BaseChartProps {
  config: any;
  data: any[];
}
