import type {
  AxisDomains as DataAxisDomains, ChartData, GroupData, GroupValue,
  NumericValues as DataNumericValues, SeriesData, SeriesDataSet,
  SeriesDomainObject as DataSeriesDomainObject, SeriesDomainObjects as DataSeriesDomainObjects,
  SeriesValueObject as DataSeriesValueObject, SeriesValueObjects as DataSeriesValueObjects
} from './data';

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
  seriesAxisFocusDomainPercentages?: number[];
  seriesFocusDomainPercentages?: number[];
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
export type NumericValues = DataNumericValues;
export type SeriesValueObject = DataSeriesValueObject;
export type SeriesValueObjects = DataSeriesValueObjects;
export type SeriesDomainObject = DataSeriesDomainObject;
export type SeriesDomainObjects = DataSeriesDomainObjects;
export type AxisDomains = DataAxisDomains;

export type AnimationGroupData = GroupData;
export type AnimationSeriesDataSet = SeriesDataSet;
export type AnimationSeriesData = SeriesData;
export type AnimationChartData = ChartData;

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
  deltas: number[] | null;
  deltaFactor?: number;
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
  deltaFactor?: number;
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
  groupDeltaData: GroupDeltaData;
  axisExpansionData: AxisTransitionData;
  valueChangeData: ValueChangeData;
  axisCollapseData: AxisTransitionData;
}

export interface GroupMergedValuesData {
  old: readonly GroupValue[];
  merged: readonly GroupValue[];
  added: readonly GroupValue[];
  removed: readonly GroupValue[];
  new: readonly GroupValue[];
  displayMerged: readonly GroupValue[];
}

export interface GroupMergedIndicesData {
  old: number[];
  new: number[];
  added: number[];
  removed: number[];
  reordered: boolean;
}

export interface OuterChangeCounts {
  before: number;
  after: number;
}

export interface GroupDeltaData {
  values: GroupMergedValuesData;
  indices: GroupMergedIndicesData;
  outerCounts: {
    added: OuterChangeCounts;
    removed: OuterChangeCounts;
  };
}
