import type { Component } from 'svelte';

/** Props mochart passes to placeholder components (loading, error, and empty states). */
export interface PlaceholderProps {
  width?: number;
  height?: number;
  mochartConfig?: any;
  dataProvider?: any;
  error?: any;
  hasData?: boolean;
}

/** A Svelte component rendered for one of the chart's placeholder states. */
export type PlaceholderComponent = Component<PlaceholderProps>;

export interface ChartCallbackProps {
  onChartClick?: (eventPayload: any) => void;
  onChartMouseEnter?: (eventPayload: any) => void;
  onChartMouseMove?: (eventPayload: any) => void;
  onChartMouseLeave?: (eventPayload: any) => void;
  onTitleClick?: (eventPayload: any) => void;
  onFocus?: (focusData: any) => void;
  onSeriesFilter?: (filterData: any) => void;
  onSeriesLayoutInfoChange?: (bounds: any) => void;
  loadingComponent?: PlaceholderComponent;
  errorComponent?: PlaceholderComponent;
  noDataComponent?: PlaceholderComponent;
  noSizeComponent?: PlaceholderComponent;
  noSeriesComponent?: PlaceholderComponent;
}

export interface BaseChartProps extends ChartCallbackProps {
  /** Explicit pixel width; omit to track the container element's width. */
  width?: number;
  /** Explicit pixel height; omit to track the container element's height. */
  height?: number;
  /** Class applied to the container div the chart mounts into. */
  class?: string;
  /** Style applied to the container div the chart mounts into. */
  style?: string;
}

/** Props for `Chart`: a pre-enhanced config plus a data provider. */
export interface ChartProps extends BaseChartProps {
  mochartConfig: any;
  dataProvider: any;
  loading?: boolean;
  error?: any;
}

/** Props for `DefaultChart`: a raw config plus a plain array-of-objects dataset. */
export interface DefaultChartProps extends BaseChartProps {
  config: any;
  data: any[];
}
