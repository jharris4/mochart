// Pie-mode (pie/donut/gauge) demo helpers. Slices are series and the data is
// a single row, so the group-editing machinery of the xy demos has nothing to
// operate on; these helpers back the pie-specific UI instead: the single-mode
// slice panel (select a slice, edit its value, play a suppress/restore
// sequence) and the multi-mode suppression stepper.

import type { MochartConfig } from '@mochart/core';

import type { DataRow, FilteredSeriesIds } from './types';

export interface PieSliceInfo {
  /** The series id — what focus, legend filtering and suppression key on. */
  id: string;
  /** The display title (legend text). */
  title: string;
  /** The data property holding the slice's value. */
  property: string;
}

/** The editable slices of a pie-mode config: one per series, in config order. */
export function getPieSlices(mochartConfig: MochartConfig): PieSliceInfo[] {
  return mochartConfig.seriesConfigs.map(seriesConfig => ({
    id: seriesConfig.id,
    title: seriesConfig.title ?? seriesConfig.id,
    property: seriesConfig.property as string
  }));
}

/**
 * Apply a slice value edit to the working row. The single write path for slice
 * edits: percent labels and tooltip shares are derived by the chart from the
 * current slice values (pieConfig.labelType / tooltipValues), so an edit only
 * has to set the value it edits.
 */
export function applyPieSliceValue(row: DataRow, property: string, value: number): void {
  row[property] = value;
}

/**
 * The step cycle of the multi-mode pie stepper: one step per slice, so
 * suppression runs from none up to all but one — at least one slice always
 * remains.
 */
export function getPieStepCycle(sliceIds: string[]): number {
  return Math.max(1, sliceIds.length);
}

/**
 * The multi-mode pie stepper: chart `chartIndex` at step `step` suppresses the
 * last `(step + chartIndex) mod cycle` slices, so every chart in the grid
 * shows a different-sized view of the same pie and stepping/playing animates
 * them all concurrently. The cycle caps suppression so at least one slice
 * always remains.
 */
export function getPieStepSuppressedIds(sliceIds: string[], chartIndex: number, step: number): FilteredSeriesIds {
  const cycle = getPieStepCycle(sliceIds);
  const count = (((step + chartIndex) % cycle) + cycle) % cycle;
  const suppressed: FilteredSeriesIds = {};
  for (let i = sliceIds.length - count; i < sliceIds.length; i++) {
    suppressed[sliceIds[i]] = true;
  }
  return suppressed;
}

/**
 * The single-mode slice sequence: suppress the slices one at a time from the
 * last down to one remaining, then restore them in reverse, ending fully
 * restored. Returned as the filter map to show at each 2s tick.
 */
export function getPieSequenceSteps(sliceIds: string[]): FilteredSeriesIds[] {
  const maxSuppressed = Math.max(0, sliceIds.length - 1);
  const steps: FilteredSeriesIds[] = [];
  const cumulative = (count: number): FilteredSeriesIds => {
    const suppressed: FilteredSeriesIds = {};
    for (let i = sliceIds.length - count; i < sliceIds.length; i++) {
      suppressed[sliceIds[i]] = true;
    }
    return suppressed;
  };
  for (let count = 1; count <= maxSuppressed; count++) {
    steps.push(cumulative(count));
  }
  for (let count = maxSuppressed - 1; count >= 0; count--) {
    steps.push(cumulative(count));
  }
  return steps;
}
