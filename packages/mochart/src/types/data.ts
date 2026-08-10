/** Values supported by a chart's category axis. */
export type CategoryValue = string | number | Date;
export type DomainValue = number | Date;
export type NullableDomain<T extends DomainValue = number> = [T | null, T | null];
export type CategoryAxisDomain = NullableDomain<number | Date>;
export type NumericValue = number | undefined;
export type NumericValues = NumericValue[];
export type AxisDomains = Record<string, NullableDomain>;

export interface SeriesValueObject {
  [key: string]: NumericValues | string | null | undefined;
  plain: NumericValues | null;
  range: NumericValues | null;
  errorLow: NumericValues | null;
  errorHigh: NumericValues | null;
  stack: NumericValues | null;
  prior: NumericValues | null;
  marker: NumericValues | null;
  label: NumericValues | null;
  color: NumericValues | null;
  tooltip: NumericValues | null;
  markerCopyKey: string | null;
  labelCopyKey: string | null;
  colorCopyKey: string | null;
  tooltipCopyKey: string | null;
  min: NumericValues | null;
  max: NumericValues | null;
}

export type SeriesValueObjects = Record<string, SeriesValueObject>;
export type SeriesDomainObject = Record<string, NullableDomain>;
export type SeriesDomainObjects = Record<string, SeriesDomainObject>;

export interface SeriesDataSet {
  axisDomains: AxisDomains;
  domains: SeriesDomainObjects;
  values: SeriesValueObjects;
  /** Added by animation transitions while aligning old and new category values. */
  priorIndices?: number[];
}

export interface SeriesData {
  axisBases: Record<string, number | null>;
  axisSeriesCounts: Record<string, number>;
  stackSeriesCounts: Record<string, number>;
  groupSeriesCounts: Record<string, number>;
  raw: SeriesDataSet;
  filteredFlags: Record<string, boolean>;
  filtered: SeriesDataSet;
}

export interface ChartData {
  categoryData: CategoryData;
  seriesData: SeriesData;
}

export interface StackData {
  outerPositiveSeriesIds: Record<string, (string | undefined)[]>;
  filteredOuterPositiveSeriesIds: Record<string, (string | undefined)[]>;
  outerNegativeSeriesIds: Record<string, (string | undefined)[]>;
  filteredOuterNegativeSeriesIds: Record<string, (string | undefined)[]>;
}

export type AxisValue = number | Date;
export type TickLabel = CategoryValue;
export type TickLabelFormatter = (value: CategoryValue) => TickLabel;

export interface AxisScale {
  (value: AxisValue): number;
  domain(): AxisValue[];
  domain(values: readonly (AxisValue | null)[]): AxisScale;
  range(): number[];
  range(values: readonly number[]): AxisScale;
  ticks(count?: number): AxisValue[];
  tickFormat(count?: number, specifier?: string): TickLabelFormatter;
}

export interface AxisTick {
  label: TickLabel;
  position: number;
  value: CategoryValue;
  hidden: boolean;
}

export interface CategorySpacingInfo {
  categoryRange: [number, number];
  categoryValueExtent: number;
  categoryValueOffset: number;
}

export interface CategoryAxisData {
  axisScale: AxisScale;
  axisTickData: AxisTick[];
  maxTickLabelLength: number;
  valueData: {
    spacingInfo: CategorySpacingInfo;
    positions: number[];
  };
}

export type SeriesPosition = number | undefined;
export type SeriesPositionAccessor = (_datum: unknown, index: number) => SeriesPosition;

export interface SeriesPositionData extends ArrayLike<unknown> {
  readonly length: number;
  /** True when positions were compacted (missingValues "connect"). */
  skipped: boolean;
  skipCategoryIndexMap: Record<number, number>;
  getDefined: (_datum: unknown, index: number) => boolean;
  categoryPositions: number[];
  categoryDefinedPositions: number[] | null;
  getCategoryPosition: SeriesPositionAccessor;
  getOffsetCategoryPosition: SeriesPositionAccessor;
  categoryValueExtent: number;
  categoryValueOffset: number;
  seriesPositions: SeriesPosition[];
  seriesDefinedPositions: number[] | null;
  seriesPriorPositions: SeriesPosition[] | null;
  seriesPriorDefinedPositions: number[] | null;
  getSeriesPosition: SeriesPositionAccessor;
  getCurrentSeriesPosition: SeriesPositionAccessor;
  getPriorSeriesPosition: SeriesPositionAccessor;
  getSeriesExtent: (_datum: unknown, index: number) => number;
}

export interface ValueAxisData {
  axisScales: Record<string, AxisScale>;
  axisTickData: Record<string, AxisTick[]>;
}

export interface AxisData {
  category: CategoryAxisData | null;
  value: ValueAxisData | null;
}

export interface CategoryValues {
  raw: readonly CategoryValue[];
  display: readonly CategoryValue[];
  parsed: readonly CategoryValue[];
  numeric: number[];
}

/** Which plot edges have data hidden behind them, one flag per screen edge (see data/ClipData.ts). */
export interface ClippedEdges {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export interface CategoryData {
  axisDomain: CategoryAxisDomain;
  values: CategoryValues;
}

export interface CategoryValueObject {
  axisDomain: CategoryAxisDomain;
  values: {
    raw: CategoryValue | undefined;
    display: CategoryValue | undefined;
    parsed: CategoryValue | undefined;
    numeric: number | undefined;
  };
}

/**
 * The interface charts read data through. `ArrayOfObjectsDataProvider` and
 * `ObjectOfArraysDataProvider` cover the common dataset shapes; implement
 * this to read straight from an existing store without copying.
 *
 * Providers may expose loading and error state in addition to the two data
 * accessors. Series values remain unknown until the chart config selects and
 * validates a property.
 */
export interface DataProvider<TCategoryValue = CategoryValue, TSeriesValue = unknown> {
  /** The category values, one per category, in display order. */
  getCategoryValues(): readonly TCategoryValue[];
  /** The value of `seriesProperty` for the given category (numeric or undefined for series values). */
  getSeriesValue(categoryValue: TCategoryValue, categoryIndex: number, seriesProperty: string): TSeriesValue;
  /** The data property the category values come from; when present, `getDataErrors` flags a mismatch with `categoryAxis.property`. */
  getCategoryProperty?(): string;
  /** When it returns anything but null/undefined, the chart shows its error state — `''` and `0` count. */
  getError?(): unknown;
  /** When set and true, the chart shows its loading state. */
  getLoading?(): boolean;
  /** Re-index anything cached off the source dataset; the chart handle's `refresh` calls it before re-reading. */
  refresh?(): void;
}

export type DataRow = Record<string, unknown>;
