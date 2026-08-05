import { hasConfigStructureChange } from '../config/core/mochartConfig';
import { indexOfCategoryValue } from '../animation/CategoryAnimationData';
import type { ChartFocus, ChartSeriesFilter } from '../types/chart';
import type { MochartConfig } from '../types/config';
import type { DataProvider } from '../types/data';
import type { InternalFocus } from './ChartDataSource';

export interface FocusControllerInput {
  mochartConfig: MochartConfig;
  dataProvider: DataProvider;
}

export interface FocusChangeCallbacks {
  onFocus?: (focus: ChartFocus) => void;
  onSeriesFilter?: (filter: ChartSeriesFilter) => void;
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
 * ManagedChart): tracks the focused group/series/axis and the filtered
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
   * a structural config change resets everything, a data change remaps the
   * focused group by value (dropping it when the group disappeared).
   * Fires the callbacks when anything changed.
   */
  reconcile(prev: FocusControllerInput, next: FocusControllerInput, callbacks: FocusChangeCallbacks): void {
    const { mochartConfig, dataProvider } = next;
    const { mochartConfig: oldMochartConfig, dataProvider: oldDataProvider } = prev;
    const { focusedValueAxisId: oldFocusedValueAxisId, focusedSeriesId: oldFocusedSeriesId,
      focusedCategoryIndex: oldFocusedCategoryIndex, filteredSeriesIds: oldFilteredSeriesIds } = this;

    if (mochartConfig !== oldMochartConfig && hasConfigStructureChange(oldMochartConfig, mochartConfig)) {
      this.reset();
    }
    else if (dataProvider !== oldDataProvider) {
      if (oldDataProvider && dataProvider) {
        if (this.focusedCategoryIndex >= 0) {
          const oldCategoryValues = oldDataProvider.getCategoryValues();
          const newCategoryValues = dataProvider.getCategoryValues();
          if (oldCategoryValues && newCategoryValues) {
            const categoryValue = oldCategoryValues[this.focusedCategoryIndex];
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
    const { focusedValueAxisId, focusedSeriesId, focusedCategoryIndex, filteredSeriesIds } = this;
    const focusChanged = focusedValueAxisId !== oldFocusedValueAxisId || focusedSeriesId !== oldFocusedSeriesId || focusedCategoryIndex !== oldFocusedCategoryIndex;
    const seriesFilterChanged = filteredSeriesIds !== oldFilteredSeriesIds;
    if (focusChanged) {
      callbacks.onFocus?.(this.focus());
    }
    if (seriesFilterChanged) {
      callbacks.onSeriesFilter?.({ filteredSeriesIds });
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
    return { filteredSeriesIds };
  }
}
