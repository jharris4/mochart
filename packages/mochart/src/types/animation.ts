export type FocusPercentage = number | null;
export type FocusPercentageMap = Record<string, FocusPercentage>;

export interface FocusData {
  focusedGroupIndex: number;
  focusedSeriesAxisId: string | null;
  focusedSeriesId: string | null;
  groupFocusPercentages: FocusPercentage[];
  seriesAxisFocusPercentages: FocusPercentageMap;
  seriesFocusPercentages: FocusPercentageMap;
  groupFocusDomainPercentages?: number[];
  seriesAxisFocusDomainPercentages?: Record<string, number[]>;
  seriesFocusDomainPercentages?: Record<string, number[]>;
  seriesAxisComputedFocusDomainPercentages?: Record<string, number[]>;
}

export interface ArrayFocusDeltaData {
  start: FocusPercentage[];
  deltas: number[];
  deltaPercentage: number;
  deltaPercentages: number[] | null;
  deltaFactors: number[] | null;
  end: FocusPercentage[];
}

export interface MapFocusDeltaData {
  start: FocusPercentageMap;
  deltas: Record<string, number>;
  deltaPercentage: number;
  deltaPercentages: Record<string, number> | null;
  deltaFactors: Record<string, number> | null;
  end: FocusPercentageMap;
}

export interface FocusAnimationData {
  start: FocusData;
  deltaPercentage: number;
  group: ArrayFocusDeltaData;
  seriesAxis: MapFocusDeltaData;
  series: MapFocusDeltaData;
  end: FocusData;
  final: FocusData;
}

export type NumericDomain = [number, number];
export type DateDomain = [Date, Date];
export type AxisDomain = NumericDomain | DateDomain;
export type NumericValues = (number | undefined)[];

export interface AnimationGroupData {
  axisDomain: AxisDomain;
  values: {
    raw: unknown[];
    display: unknown[];
    parsed: unknown[];
    numeric: number[];
  };
}

export type SeriesValueObject = Record<string, NumericValues | string | null | undefined>;
export type SeriesValueObjects = Record<string, SeriesValueObject>;
export type SeriesDomainObject = Record<string, NumericDomain>;
export type SeriesDomainObjects = Record<string, SeriesDomainObject>;
export type AxisDomains = Record<string, NumericDomain>;

export interface AnimationSeriesDataSet {
  axisDomains: AxisDomains;
  domains: SeriesDomainObjects;
  values: SeriesValueObjects;
}

export interface AnimationSeriesData {
  raw: AnimationSeriesDataSet;
  filtered: AnimationSeriesDataSet;
  [key: string]: unknown;
}

export interface AnimationChartData {
  groupData: AnimationGroupData;
  seriesData: AnimationSeriesData;
}

export interface DomainDelta {
  deltaPercentage: number;
  delta: NumericDomain | null;
  deltaFactor?: number;
}

export interface DomainDeltaMap {
  deltaPercentage: number;
  deltas: Record<string, DomainDelta> | null;
  deltaFactor?: number;
}

export type SeriesDomainDelta = Record<string, DomainDelta> & { deltaPercentage: number };

export interface SeriesDomainDeltaMap {
  deltaPercentage: number;
  deltas: Record<string, SeriesDomainDelta> | null;
  deltaFactor?: number;
}

export interface NumericValuesDelta {
  deltaPercentage: number;
  deltas: number[];
  deltaFactor: number;
  deltaCopied?: boolean;
}

export type SeriesValueDelta = Record<string, NumericValuesDelta | boolean | number> & {
  deltaPercentage: number;
  deltaCopied?: boolean;
};

export interface SeriesValueDeltaMap {
  deltaPercentage: number;
  deltas: Record<string, SeriesValueDelta>;
  deltaCopied?: boolean;
}

export interface NumericArrayDelta {
  start?: number[];
  deltas: number[];
  end?: number[];
  deltaPercentage: number;
  deltaFactor: number;
}

export interface CompleteNumericArrayDelta extends NumericArrayDelta {
  start: number[];
  end: number[];
}

export interface AxisDeltaData {
  start: AnimationChartData;
  deltaPercentage: number;
  deltas: {
    domain: {
      axis: {
        group: DomainDelta;
        series: { raw: DomainDeltaMap; filtered: DomainDeltaMap };
      };
      series: { raw: SeriesDomainDeltaMap; filtered: SeriesDomainDeltaMap };
    };
    values: { group: CompleteNumericArrayDelta | null };
  };
  end: AnimationChartData;
  final: AnimationChartData;
}

export interface EmptyAxisDeltaData {
  start: null;
  deltaPercentage: 0;
  deltas: null;
  end: null;
  final?: null;
}

export type AxisTransitionData = AxisDeltaData | EmptyAxisDeltaData;

export interface ValueChangeData {
  start: AnimationChartData;
  deltaPercentage: number;
  deltas: {
    groupOrder: NumericArrayDelta;
    raw: SeriesValueDeltaMap;
    filtered: SeriesValueDeltaMap;
  };
  end: AnimationChartData;
  final: AnimationChartData;
}

export interface ChartAnimationData {
  initialAnimation: boolean;
  groupDeltaData: unknown;
  axisExpansionData: AxisTransitionData;
  valueChangeData: ValueChangeData;
  axisCollapseData: AxisTransitionData;
}
