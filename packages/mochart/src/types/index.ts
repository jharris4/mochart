// The package's public type surface. Only config.ts is wildcarded: every type
// it declares is a config-model type, covered by the generated config
// reference. The other files mix the published surface with pipeline
// internals, so each name here is a deliberate export — a name reachable from
// a published signature (a prop, a callback payload, a documented extension
// point, or a binding's prop type).
//
// Deliberately absent, and so documented only by the shipped .d.ts, like
// types/enhanced.ts: the whole of types/layout.ts (the measure/layout
// pipeline), the tween delta types in types/animation.ts, types/chart.ts's
// ChartDomAccessors, geometry.ts's TextBounds, and data.ts's scale/tick, axis,
// series-position, stack and clip types. The retained-mode components
// (`Chart`, `Legend`, `Crosshair`, `Tooltip`) name them in their props, so the
// .d.ts still references them; a host embedding those components passes object
// literals rather than naming the types, and nothing else in the published
// surface reaches them.
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
