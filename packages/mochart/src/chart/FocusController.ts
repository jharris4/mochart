import { hasConfigStructureChange } from '../config/core/mochartConfig';
import { indexOfCategoryValue } from '../animation/CategoryAnimationData';
import type { ChartFocus, ChartSeriesFilter } from '../types/chart';
import type { MochartConfig } from '../types/config';
import type { CategoryValue, DataProvider } from '../types/data';
import type { InternalFocus } from './ChartDataSource';

export interface FocusControllerInput {
  mochartConfig: MochartConfig;
  dataProvider: DataProvider;
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

/** Externally-controlled focus/filter values (undefined = uncontrolled). */
export interface ExternalFocusInput {
  focusedCategoryIndex?: number;
  focusedValueAxisId?: string | null;
  focusedSeriesId?: string | null;
  filteredSeriesIds?: Record<string, boolean>;
}

/**
 * Focus and series-filter state machine for a managed chart (was
 * ManagedChart): tracks the focused category/series/axis and the filtered
 * series, remaps or resets them when the config structure or data provider
 * changes, and reports changes through the host callbacks.
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
   * Reconcile focus/filter state with a config or data-provider change:
   * a structural config change resets everything, a followSeries change
   * re-derives follower filtering, a data change remaps the focused category
   * by value (dropping it when the category disappeared).
   * `renderedCategoryValues` is the ordering the chart last committed — the
   * old provider can't be re-read for it, since a refresh() may already have
   * mutated it in place. Returns what changed; no callbacks fire here, so
   * the caller can commit its own state first and notify re-entrancy-safely.
   */
  reconcile(prev: FocusControllerInput, next: FocusControllerInput,
    renderedCategoryValues: readonly CategoryValue[] | null): FocusReconcileResult {
    const { mochartConfig, dataProvider } = next;
    const { mochartConfig: oldMochartConfig, dataProvider: oldDataProvider } = prev;
    const { focusedValueAxisId: oldFocusedValueAxisId, focusedSeriesId: oldFocusedSeriesId,
      focusedCategoryIndex: oldFocusedCategoryIndex, filteredSeriesIds: oldFilteredSeriesIds } = this;

    if (mochartConfig !== oldMochartConfig && hasConfigStructureChange(oldMochartConfig, mochartConfig)) {
      this.reset();
    }
    else {
      if (mochartConfig !== oldMochartConfig) {
        this.reconcileFollowerFilters(oldMochartConfig, mochartConfig);
      }
      if (dataProvider !== oldDataProvider) {
        if (oldDataProvider && dataProvider) {
          if (this.focusedCategoryIndex >= 0) {
            const newCategoryValues = dataProvider.getCategoryValues();
            if (renderedCategoryValues && newCategoryValues) {
              const categoryValue = renderedCategoryValues[this.focusedCategoryIndex];
              this.focusedCategoryIndex = indexOfCategoryValue(newCategoryValues, categoryValue);
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
    const { focusedValueAxisId, focusedSeriesId, focusedCategoryIndex, filteredSeriesIds } = this;
    const focusChanged = focusedValueAxisId !== oldFocusedValueAxisId || focusedSeriesId !== oldFocusedSeriesId || focusedCategoryIndex !== oldFocusedCategoryIndex;
    const result: FocusReconcileResult = {};
    if (focusChanged) {
      result.focus = this.focus();
    }
    // by value, not identity: a reset that finds no filters is not a change
    if (!sameFilteredSeriesIds(filteredSeriesIds, oldFilteredSeriesIds)) {
      result.seriesFilter = { filteredSeriesIds };
    }
    return result;
  }

  /**
   * Re-derive filtered states after a non-structural `followSeries` change:
   * a series that gained a leader takes the leader's filtered state, an
   * ex-follower unfilters. Filtering baked in the old grouping at legend-click
   * time, so without this an unlinked follower could stay filtered forever.
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
   * Apply the host's controlled focus/filter props. Each field set (not
   * undefined) overrides the internal state; undefined fields stay
   * chart-managed. No callbacks fire — the values came from the host.
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
    if (filteredSeriesIds !== undefined) {
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

  /**
   * Toggle a series in/out of the filtered set, along with any follower
   * series (`followSeries` pointing at it), which take the same state.
   */
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
