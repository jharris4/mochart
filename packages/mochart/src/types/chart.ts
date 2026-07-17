import type { MochartConfig, MochartInputConfig } from './config';
import type { Bounds } from './geometry';
import type { DataProvider, DataRow } from './data';

export interface ChartEventPayload {
  chartX: number;
  chartY: number;
  groupPosition: number;
  seriesPosition: number;
  groupPercentage: number;
  seriesPercentage: number;
  groupIndex: number;
}

export interface ChartFocus {
  focusedSeriesAxisId: string | null;
  focusedSeriesId: string | null;
  focusedGroupIndex: number;
}

/** Partial focus update raised from inside the chart (undefined = leave unchanged, null = clear). */
export interface InternalFocus {
  seriesAxisId?: string | null;
  seriesId?: string | null;
  groupIndex?: number | null;
}

export interface ChartSeriesFilter {
  filteredSeriesIds: Record<string, boolean>;
}

export interface ChartDomAccessors {
  getTitleTextDomElement(): SVGGraphicsElement | null;
  getTitleTextRawDomElement(): SVGGraphicsElement | null;
  getTitlePrefixDomElement(): SVGGraphicsElement | null;
  getTitleSuffixDomElement(): SVGGraphicsElement | null;
  getGroupAxisTicksDomElements(): NodeListOf<SVGGraphicsElement>;
  getGroupAxisSizeTickDomElement(): SVGGraphicsElement | null;
  getGroupAxisTitleDomElement(): SVGGraphicsElement | null;
  getGroupAxisThresholdTitleDomElement(): SVGGraphicsElement | null;
  getSeriesAxisTicksDomElementsForId(axisId: string): NodeListOf<SVGGraphicsElement>;
  getSeriesAxisTitleDomElementForId(axisId: string): SVGGraphicsElement | null;
  getSeriesAxisThresholdTitleDomElementForId(axisId: string): SVGGraphicsElement | null;
  getLegendDomElement(): HTMLElement | null;
  getLegendItemTextDomElements(): NodeListOf<SVGGraphicsElement>;
  getLegendItemTextRawDomElements(): NodeListOf<SVGGraphicsElement>;
  getTooltipDomElement(): HTMLElement | null;
}

export interface ChartFactoryContext {
  width?: number;
  height?: number;
  mochartConfig?: MochartConfig | null;
  dataProvider?: DataProvider | null;
  error?: unknown;
  hasData?: boolean;
}

/** Content accepted from loading, error, and empty-state factories. */
export type ChartFactoryContent = Node | string | number | false | null | undefined;
export type ChartContentFactory = (context: ChartFactoryContext) => ChartFactoryContent;

export interface ChartCallbacks {
  onChartClick?: (event: ChartEventPayload) => void;
  onChartMouseEnter?: (event: ChartEventPayload) => void;
  onChartMouseMove?: (event: ChartEventPayload) => void;
  onChartMouseLeave?: (event: ChartEventPayload) => void;
  onTitleClick?: () => void;
  onFocus?: (focus: ChartFocus) => void;
  onSeriesFilter?: (filter: ChartSeriesFilter) => void;
  onSeriesLayoutInfoChange?: (bounds: Bounds) => void;
}

export interface ChartFactories {
  getLoadingComponent?: ChartContentFactory;
  getErrorComponent?: ChartContentFactory;
  getNoDataComponent?: ChartContentFactory;
  getNoSizeComponent?: ChartContentFactory;
  getNoSeriesComponent?: ChartContentFactory;
  getConfigErrorComponent?: ChartContentFactory;
}

export interface BaseChartProps extends ChartCallbacks, ChartFactories {
  width: number;
  height: number;
  style?: string | Record<string, string | number | null | undefined>;
  loading?: boolean;
  error?: unknown;
}

/** Props accepted by createChart, which takes an already enhanced config. */
export interface ManagedChartProps extends BaseChartProps {
  mochartConfig: MochartConfig;
  dataProvider: DataProvider;
}

/** Props accepted by createDefaultChart, which enhances a raw config. */
export interface DefaultChartProps extends BaseChartProps {
  config: MochartInputConfig;
  data: readonly DataRow[];
}
