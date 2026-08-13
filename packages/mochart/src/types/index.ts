// The public type surface: config.ts is wildcarded (all config-model types); every other name is a deliberate export reachable from a published signature
export type * from './config';

export type { Size, Bounds, MarginPadding, InnerOuter } from './geometry';

// The DataProvider contract, plus the ChartData chain a ChartDataSource emits.
export type {
  CategoryValue, DomainValue, NullableDomain, CategoryAxisDomain,
  NumericValue, NumericValues, AxisDomains,
  SeriesValueObject, SeriesValueObjects, SeriesDomainObject, SeriesDomainObjects,
  SeriesDataSet, SeriesData, CategoryValues, CategoryData, ChartData,
  DataProvider, DataRow
} from './data';

// InternalFocus is published from chart/ChartDataSource, alongside the interface that raises it.
export type {
  ChartEventPayload, ChartFocus, ChartSeriesFilter, ChartSliceClickPayload,
  ChartSeriesClickPayload, ChartCallbacks, ChartFactories, ChartFactoryContext,
  ChartFactoryContent, ChartContentFactory, BaseChartProps, ManagedChartProps,
  DefaultChartProps
} from './chart';

// The focus half of a ChartDataSource's output; the tween deltas stay internal.
export type { FocusPercentage, FocusPercentageMap, FocusData } from './animation';
