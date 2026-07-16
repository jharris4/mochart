/** Values supported by a chart's group axis. */
export type GroupValue = string | number | Date;

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

