import type { CSSProperties } from 'react';

/** Placeholder factories return a DOM Node or string — mochart has no vdom. */
export type NodeFactory = (...args: any[]) => Node | string;

export interface ChartCallbackProps {
  onChartClick?: (eventPayload: any) => void;
  onChartMouseEnter?: (eventPayload: any) => void;
  onChartMouseMove?: (eventPayload: any) => void;
  onChartMouseLeave?: (eventPayload: any) => void;
  onTitleClick?: (eventPayload: any) => void;
  onFocus?: (focusData: any) => void;
  onSeriesFilter?: (filterData: any) => void;
  onSeriesLayoutInfoChange?: (bounds: any) => void;
  getLoadingComponent?: NodeFactory;
  getErrorComponent?: NodeFactory;
  getNoDataComponent?: NodeFactory;
  getNoSizeComponent?: NodeFactory;
  getNoSeriesComponent?: NodeFactory;
}

export interface BaseChartProps extends ChartCallbackProps {
  /** Explicit pixel width; omit to track the container element's width. */
  width?: number;
  /** Explicit pixel height; omit to track the container element's height. */
  height?: number;
  /** Class applied to the container div the chart mounts into. */
  className?: string;
  /** Style applied to the container div the chart mounts into. */
  style?: CSSProperties;
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
