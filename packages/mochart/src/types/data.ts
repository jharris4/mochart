/** Values supported by a chart's group axis. */
export type GroupValue = string | number | Date;
export type DomainValue = number | Date;
export type NullableDomain<T extends DomainValue = number> = [T | null, T | null];
export type GroupAxisDomain = NullableDomain<number | Date>;
export type NumericValue = number | undefined;
export type NumericValues = NumericValue[];
export type AxisDomains = Record<string, NullableDomain>;

export interface SeriesValueObject {
  [key: string]: NumericValues | string | null | undefined;
  plain: NumericValues | null;
  range: NumericValues | null;
  stack: NumericValues | null;
  prior: NumericValues | null;
  marker: NumericValues | null;
  label: NumericValues | null;
  color: NumericValues | null;
  markerCopyKey: string | null;
  labelCopyKey: string | null;
  colorCopyKey: string | null;
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
  /** Added by animation transitions while aligning old and new group values. */
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
  groupData: GroupData;
  seriesData: SeriesData;
}

export interface StackData {
  outerPositiveSeriesIds: Record<string, (string | undefined)[]>;
  filteredOuterPositiveSeriesIds: Record<string, (string | undefined)[]>;
  outerNegativeSeriesIds: Record<string, (string | undefined)[]>;
  filteredOuterNegativeSeriesIds: Record<string, (string | undefined)[]>;
}

export type AxisValue = number | Date;
export type TickLabel = GroupValue;
export type TickLabelFormatter = (value: GroupValue) => TickLabel;

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
  value: GroupValue;
  hidden: boolean;
}

export interface GroupSpacingInfo {
  groupRange: [number, number];
  groupValueExtent: number;
  groupValueOffset: number;
}

export interface GroupAxisData {
  axisScale: AxisScale;
  axisTickData: AxisTick[];
  maxTickLabelLength: number;
  valueData: {
    spacingInfo: GroupSpacingInfo;
    positions: number[];
  };
}

export type SeriesPosition = number | undefined;
export type SeriesPositionAccessor = (_datum: unknown, index: number) => SeriesPosition;

export interface SeriesPositionData extends ArrayLike<unknown> {
  readonly length: number;
  skipGroupIndexMap: Record<number, number>;
  getDefined: (_datum: unknown, index: number) => boolean;
  groupPositions: number[];
  groupDefinedPositions: number[] | null;
  getGroupPosition: SeriesPositionAccessor;
  getOffsetGroupPosition: SeriesPositionAccessor;
  groupValueExtent: number;
  groupValueOffset: number;
  seriesPositions: SeriesPosition[];
  seriesDefinedPositions: number[] | null;
  seriesPriorPositions: SeriesPosition[] | null;
  seriesPriorDefinedPositions: number[] | null;
  getSeriesPosition: SeriesPositionAccessor;
  getCurrentSeriesPosition: SeriesPositionAccessor;
  getPriorSeriesPosition: SeriesPositionAccessor;
  getSeriesExtent: (_datum: unknown, index: number) => number;
}

export interface SeriesAxisData {
  axisScales: Record<string, AxisScale>;
  axisTickData: Record<string, AxisTick[]>;
}

export interface AxisData {
  group: GroupAxisData | null;
  series: SeriesAxisData | null;
}

export interface GroupValues {
  raw: readonly GroupValue[];
  display: readonly GroupValue[];
  parsed: readonly GroupValue[];
  numeric: number[];
}

export interface GroupData {
  axisDomain: GroupAxisDomain;
  values: GroupValues;
}

export interface GroupValueObject {
  axisDomain: GroupAxisDomain;
  values: {
    raw: GroupValue | undefined;
    display: GroupValue | undefined;
    parsed: GroupValue | undefined;
    numeric: number | undefined;
  };
}

/**
 * The data contract consumed by mochart.
 *
 * Providers may expose loading and error state in addition to the two data
 * accessors. Series values remain unknown until the chart config selects and
 * validates a property.
 */
export interface DataProvider<TGroupValue = GroupValue, TSeriesValue = unknown> {
  getGroupValues(): readonly TGroupValue[];
  getSeriesValue(groupValue: TGroupValue, groupIndex: number, seriesProperty: string): TSeriesValue;
  getError?(): unknown;
  getLoading?(): boolean;
}

export type DataRow = Record<string, unknown>;
