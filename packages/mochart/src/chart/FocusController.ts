import { hasConfigStructureChange } from '../config/core/mochartConfig';
import { indexOfCategoryValue } from '../animation/CategoryAnimationData';
import type { ChartFocus, ChartSeriesFilter } from '../types/chart';
import type { MochartConfig } from '../types/config';
import type { CategoryValue, DataProvider } from '../types/data';
import type { InternalFocus } from './ChartDataSource';

/** Externally-controlled focus/filter values (undefined = uncontrolled). */
export interface ExternalFocusInput {
  focusedCategoryIndex?: number;
  focusedValueAxisId?: string | null;
  focusedSeriesId?: string | null;
  filteredSeriesIds?: Record<string, boolean>;
}

export interface FocusControllerInput extends ExternalFocusInput {
  // both are null while a host is still loading: the chart renders its loading/error state
  mochartConfig: MochartConfig | null;
  dataProvider: DataProvider | null;
}

/** What a `reconcile` pass changed, for the controller to report after it commits the new props. */
export interface FocusReconcileResult {
  focus?: ChartFocus;
  seriesFilter?: ChartSeriesFilter;
}

function sameFilteredSeriesIds(a: Record<string, boolean>, b: Record<string, boolean>): boolean {
  if (a === b) {
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  return aKeys.length === bKeys.length && aKeys.every(key => a[key] === b[key]);
}

/** Whether the host set a controlled value in this update that differs from the one it passed before. */
function hostChanged<K extends keyof ExternalFocusInput>(prev: ExternalFocusInput, next: ExternalFocusInput, key: K): boolean {
  const nextValue = next[key];
  const prevValue = prev[key];
  if (nextValue === undefined) {
    return false;
  }
  return key === 'filteredSeriesIds'
    ? prevValue === undefined || !sameFilteredSeriesIds(nextValue as Record<string, boolean>, prevValue as Record<string, boolean>)
    : nextValue !== prevValue;
}

/**
 * Focus and series-filter state machine for a managed chart (was ManagedChart): tracks the focused
 * category/series/axis and the filtered series, remapping or resetting them on config/provider changes.
 */
export class FocusController {
  focusedCategoryIndex = -1;
  focusedValueAxisId: string | null = null;
  focusedSeriesId: string | null = null;
  filteredSeriesIds: Record<string, boolean> = {};

  private reset(): void {
    this.focusedCategoryIndex = -1;
    this.focusedValueAxisId = null;
    this.focusedSeriesId = null;
    this.filteredSeriesIds = {};
  }

  focus(): ChartFocus {
    const { focusedValueAxisId, focusedSeriesId, focusedCategoryIndex } = this;
    return { focusedValueAxisId, focusedSeriesId, focusedCategoryIndex };
  }

  /**
   * Reconcile focus/filter state with a config or provider change: structural resets everything, a
   * followSeries change re-derives follower filtering, a data change remaps the focused category by
   * value (dropped when gone). `renderedCategoryValues` is the last committed ordering — the old
   * provider can't be re-read after an in-place refresh(). A controlled value the host changed in
   * this same update supersedes the remap/reset of its field and is not reported back (it came from
   * the host); one carried along unchanged is reported so the host can sync. Fires no callbacks:
   * the caller commits first, then notifies re-entrancy-safely from the returned changes.
   */
  reconcile(prev: FocusControllerInput, next: FocusControllerInput,
    renderedCategoryValues: readonly CategoryValue[] | null): FocusReconcileResult {
    const { mochartConfig, dataProvider } = next;
    const { mochartConfig: oldMochartConfig, dataProvider: oldDataProvider } = prev;
    const { focusedValueAxisId: oldFocusedValueAxisId, focusedSeriesId: oldFocusedSeriesId,
      focusedCategoryIndex: oldFocusedCategoryIndex, filteredSeriesIds: oldFilteredSeriesIds } = this;

    // hasConfigStructureChange counts a config appearing or disappearing (the loading
    // states) as structural, so this resets then, like a provider change does
    if (hasConfigStructureChange(oldMochartConfig, mochartConfig)) {
      this.reset();
    }
    else {
      if (mochartConfig !== oldMochartConfig) {
        this.reconcileFollowerFilters(oldMochartConfig!, mochartConfig!);
      }
      if (dataProvider !== oldDataProvider) {
        if (oldDataProvider && dataProvider) {
          if (this.focusedCategoryIndex >= 0) {
            // the config names the category property; absent values drop the focus like a vanished category
            const categoryProperty = mochartConfig?.categoryAxis.property;
            const newCategoryValues = categoryProperty !== undefined
              ? dataProvider.getPropertyValues(categoryProperty) as readonly CategoryValue[] | undefined
              : undefined;
            if (renderedCategoryValues && newCategoryValues) {
              const categoryValue = renderedCategoryValues[this.focusedCategoryIndex];
              this.focusedCategoryIndex = indexOfCategoryValue(mochartConfig!.categoryAxis, newCategoryValues, categoryValue);
            }
            else {
              this.focusedCategoryIndex = -1;
            }
          }
        }
        else {
          this.reset();
        }
      }
    }
    // the host's newer values, over what was derived from its old ones (the caller's applyExternal restores the unchanged ones)
    const hostChangedCategoryIndex = hostChanged(prev, next, 'focusedCategoryIndex');
    const hostChangedValueAxisId = hostChanged(prev, next, 'focusedValueAxisId');
    const hostChangedSeriesId = hostChanged(prev, next, 'focusedSeriesId');
    const hostChangedFilteredSeriesIds = hostChanged(prev, next, 'filteredSeriesIds');
    if (hostChangedCategoryIndex) {
      this.focusedCategoryIndex = next.focusedCategoryIndex!;
    }
    if (hostChangedValueAxisId) {
      this.focusedValueAxisId = next.focusedValueAxisId!;
    }
    if (hostChangedSeriesId) {
      this.focusedSeriesId = next.focusedSeriesId!;
    }
    // by value: a host echoing the filter it was just told must not hand the data pipeline a new identity
    if (hostChangedFilteredSeriesIds && !sameFilteredSeriesIds(next.filteredSeriesIds!, this.filteredSeriesIds)) {
      this.filteredSeriesIds = next.filteredSeriesIds!;
    }
    const { focusedValueAxisId, focusedSeriesId, focusedCategoryIndex, filteredSeriesIds } = this;
    const focusChanged = (!hostChangedValueAxisId && focusedValueAxisId !== oldFocusedValueAxisId)
      || (!hostChangedSeriesId && focusedSeriesId !== oldFocusedSeriesId)
      || (!hostChangedCategoryIndex && focusedCategoryIndex !== oldFocusedCategoryIndex);
    const result: FocusReconcileResult = {};
    if (focusChanged) {
      result.focus = this.focus();
    }
    // by value, not identity: a reset that finds no filters is not a change
    if (!hostChangedFilteredSeriesIds && !sameFilteredSeriesIds(filteredSeriesIds, oldFilteredSeriesIds)) {
      result.seriesFilter = { filteredSeriesIds };
    }
    return result;
  }

  /**
   * Re-derive filtered states after a non-structural `followSeries` change: a new follower takes its
   * leader's filtered state, an ex-follower unfilters (else it could stay filtered forever).
   */
  private reconcileFollowerFilters(oldMochartConfig: MochartConfig, mochartConfig: MochartConfig): void {
    let filteredSeriesIds: Record<string, boolean> | null = null;
    for (let seriesIndex = 0; seriesIndex < mochartConfig.series.length; seriesIndex++) {
      const seriesConfig = mochartConfig.series[seriesIndex];
      const { followSeries } = seriesConfig;
      if (followSeries === oldMochartConfig.series[seriesIndex]?.followSeries) {
        continue;
      }
      const wasFiltered = this.filteredSeriesIds[seriesConfig.id] === true;
      const filtered = followSeries != null && this.filteredSeriesIds[followSeries] === true;
      if (filtered !== wasFiltered) {
        // copy before mutating so snapshots handed to host callbacks stay frozen
        // null proto: an id of __proto__ must land as an own key, not hit the prototype setter
        filteredSeriesIds ??= Object.assign(Object.create(null), this.filteredSeriesIds) as Record<string, boolean>;
        if (filtered) {
          filteredSeriesIds[seriesConfig.id] = true;
        }
        else {
          delete filteredSeriesIds[seriesConfig.id];
        }
      }
    }
    if (filteredSeriesIds !== null) {
      this.filteredSeriesIds = filteredSeriesIds;
      // a filtered series cannot stay focused
      if (this.focusedSeriesId !== null && filteredSeriesIds[this.focusedSeriesId] === true) {
        this.focusedSeriesId = null;
      }
    }
  }

  /**
   * Apply the host's controlled focus/filter props: set fields override internal state, undefined
   * fields stay chart-managed. No callbacks fire — the values came from the host.
   */
  applyExternal(input: ExternalFocusInput): void {
    const { focusedCategoryIndex, focusedValueAxisId, focusedSeriesId, filteredSeriesIds } = input;
    if (focusedCategoryIndex !== undefined) {
      this.focusedCategoryIndex = focusedCategoryIndex;
    }
    if (focusedValueAxisId !== undefined) {
      this.focusedValueAxisId = focusedValueAxisId;
    }
    if (focusedSeriesId !== undefined) {
      this.focusedSeriesId = focusedSeriesId;
    }
    // by value: a fresh but equal object (the framework norm) must not re-run the data pipeline
    if (filteredSeriesIds !== undefined && !sameFilteredSeriesIds(filteredSeriesIds, this.filteredSeriesIds)) {
      this.filteredSeriesIds = filteredSeriesIds;
    }
  }

  /** Apply a partial focus update raised from inside the chart. */
  applyFocus(focus: InternalFocus): ChartFocus {
    const { valueAxisId, seriesId, categoryIndex } = focus;
    if (valueAxisId !== undefined) {
      this.focusedValueAxisId = valueAxisId;
    }
    if (seriesId !== undefined) {
      this.focusedSeriesId = seriesId;
    }
    if (categoryIndex !== undefined) {
      this.focusedCategoryIndex = categoryIndex ?? -1;
    }
    return this.focus();
  }

  /** Toggle a series in/out of the filtered set; follower series (`followSeries`) take the same state. */
  toggleSeriesFilter(seriesId: string, followerSeriesIds: readonly string[] = []): ChartSeriesFilter {
    // copy before mutating so snapshots handed to host callbacks stay frozen
    // null proto: an id of __proto__ must land as an own key, not hit the prototype setter
    const filteredSeriesIds: Record<string, boolean> = Object.assign(Object.create(null), this.filteredSeriesIds);
    const filtered = filteredSeriesIds[seriesId] !== true;
    for (const id of [seriesId, ...followerSeriesIds]) {
      if (filtered) {
        filteredSeriesIds[id] = true;
      }
      else {
        delete filteredSeriesIds[id];
      }
    }
    this.filteredSeriesIds = filteredSeriesIds;
    // a filtered series cannot stay focused
    if (this.focusedSeriesId !== null && filteredSeriesIds[this.focusedSeriesId] === true) {
      this.focusedSeriesId = null;
    }
    return { filteredSeriesIds };
  }
}
