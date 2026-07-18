import { hasConfigStructureChange } from '../config/core/mochartConfig';
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

/**
 * Focus and series-filter state machine for a managed chart (was
 * ManagedChart): tracks the focused group/series/axis and the filtered
 * series, remaps or resets them when the config structure or data provider
 * changes, and reports changes through the host callbacks.
 */
export class FocusController {
  focusedGroupIndex = -1;
  focusedSeriesAxisId: string | null = null;
  focusedSeriesId: string | null = null;
  filteredSeriesIds: Record<string, boolean> = {};

  private reset(): void {
    this.focusedGroupIndex = -1;
    this.focusedSeriesAxisId = null;
    this.focusedSeriesId = null;
    this.filteredSeriesIds = {};
  }

  focus(): ChartFocus {
    const { focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex } = this;
    return { focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex };
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
    const { focusedSeriesAxisId: oldFocusedSeriesAxisId, focusedSeriesId: oldFocusedSeriesId,
      focusedGroupIndex: oldFocusedGroupIndex, filteredSeriesIds: oldFilteredSeriesIds } = this;

    if (mochartConfig !== oldMochartConfig && hasConfigStructureChange(oldMochartConfig, mochartConfig)) {
      this.reset();
    }
    else if (dataProvider !== oldDataProvider) {
      if (oldDataProvider && dataProvider) {
        if (this.focusedGroupIndex >= 0) {
          let oldGroupValues = oldDataProvider.getGroupValues();
          let newGroupValues = dataProvider.getGroupValues();
          if (oldGroupValues && newGroupValues) {
            let groupValue = oldGroupValues[this.focusedGroupIndex];
            this.focusedGroupIndex = newGroupValues.indexOf(groupValue);
          }
          else {
            this.focusedGroupIndex = -1;
          }
        }
      }
      else {
        this.reset();
      }
    }
    const { focusedSeriesAxisId, focusedSeriesId, focusedGroupIndex, filteredSeriesIds } = this;
    const focusChanged = focusedSeriesAxisId !== oldFocusedSeriesAxisId || focusedSeriesId !== oldFocusedSeriesId || focusedGroupIndex !== oldFocusedGroupIndex;
    const seriesFilterChanged = filteredSeriesIds !== oldFilteredSeriesIds;
    if (focusChanged) {
      callbacks.onFocus?.(this.focus());
    }
    if (seriesFilterChanged) {
      callbacks.onSeriesFilter?.({ filteredSeriesIds });
    }
  }

  /** Apply a partial focus update raised from inside the chart. */
  applyFocus(focus: InternalFocus): ChartFocus {
    const { seriesAxisId, seriesId, groupIndex } = focus;
    if (seriesAxisId !== void 0) {
      this.focusedSeriesAxisId = seriesAxisId;
    }
    if (seriesId !== void 0) {
      this.focusedSeriesId = seriesId;
    }
    if (groupIndex !== void 0) {
      this.focusedGroupIndex = groupIndex ?? -1;
    }
    return this.focus();
  }

  /** Toggle a series in/out of the filtered set. */
  toggleSeriesFilter(seriesId: string): ChartSeriesFilter {
    // copy before mutating so snapshots handed to host callbacks stay frozen
    const filteredSeriesIds = { ...this.filteredSeriesIds };
    if (filteredSeriesIds[seriesId] === true) {
      delete filteredSeriesIds[seriesId];
    }
    else {
      filteredSeriesIds[seriesId] = true;
    }
    this.filteredSeriesIds = filteredSeriesIds;
    return { filteredSeriesIds };
  }
}
