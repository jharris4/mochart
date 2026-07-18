/**
 * Unit tests for the focus/filter state machine (previously exercised through
 * the ManagedChart component; now a plain class, no DOM required).
 */
import { describe, it, expect } from 'vitest';
import { FocusController } from '../../src/chart/FocusController';
import { enhanceConfig } from '../../src/config/helper';
import { ArrayOfObjectsDataProvider } from '../../src/data/DataProvider';
import type { FocusControllerInput } from '../../src/chart/FocusController';
import type { ChartFocus, ChartSeriesFilter } from '../../src/types/chart';
import type { DataProvider } from '../../src/types/data';
import type { MochartInputConfig } from '../../src/types/config';

const VERSION = '1.0.0';

function makeConfig(overrides: Record<string, unknown> = {}) {
  return enhanceConfig({
    version: VERSION,
    animationConfig: { animate: false },
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
    seriesConfigs: [{ property: 'sales' }],
    ...overrides
  } as unknown as MochartInputConfig);
}

const rows = [
  { month: 'Jan', sales: 10 },
  { month: 'Feb', sales: 20 },
  { month: 'Mar', sales: 30 }
];

function makeProvider(data: typeof rows): DataProvider {
  return new ArrayOfObjectsDataProvider(data, 'month') as unknown as DataProvider;
}

interface Harness {
  controller: FocusController;
  input: FocusControllerInput;
  focuses: ChartFocus[];
  filters: ChartSeriesFilter[];
  reconcileWith(next: Partial<FocusControllerInput>): void;
}

function makeHarness(): Harness {
  const controller = new FocusController();
  const focuses: ChartFocus[] = [];
  const filters: ChartSeriesFilter[] = [];
  const callbacks = {
    onFocus: (focus: ChartFocus) => { focuses.push(focus); },
    onSeriesFilter: (filter: ChartSeriesFilter) => { filters.push(filter); }
  };
  const harness: Harness = {
    controller,
    input: { mochartConfig: makeConfig(), dataProvider: makeProvider(rows) },
    focuses,
    filters,
    reconcileWith(next: Partial<FocusControllerInput>) {
      const nextInput = { ...harness.input, ...next };
      controller.reconcile(harness.input, nextInput, callbacks);
      harness.input = nextInput;
    }
  };
  return harness;
}

describe('FocusController focus handling', () => {
  it('tracks group, series and series axis focus independently', () => {
    const { controller } = makeHarness();

    expect(controller.applyFocus({ groupIndex: 1 }))
      .toEqual({ focusedGroupIndex: 1, focusedSeriesAxisId: null, focusedSeriesId: null });

    expect(controller.applyFocus({ seriesId: 'S0' }))
      .toEqual({ focusedGroupIndex: 1, focusedSeriesAxisId: null, focusedSeriesId: 'S0' });

    expect(controller.applyFocus({ seriesAxisId: 'SA0' }))
      .toEqual({ focusedGroupIndex: 1, focusedSeriesAxisId: 'SA0', focusedSeriesId: 'S0' });

    // null group index clears back to -1; null ids clear the id focus
    expect(controller.applyFocus({ groupIndex: null, seriesId: null, seriesAxisId: null }))
      .toEqual({ focusedGroupIndex: -1, focusedSeriesAxisId: null, focusedSeriesId: null });
  });

  it('remaps the focused group index when the data provider changes', () => {
    const harness = makeHarness();
    harness.controller.applyFocus({ groupIndex: 1 }); // Feb

    // Feb moves to index 2 in the new data
    const nextRows = [
      { month: 'Jan', sales: 10 },
      { month: 'Apr', sales: 40 },
      { month: 'Feb', sales: 20 }
    ];
    harness.reconcileWith({ dataProvider: makeProvider(nextRows) });
    expect(harness.focuses[harness.focuses.length - 1].focusedGroupIndex).toBe(2);
  });

  it('drops group focus when the focused group disappears from the data', () => {
    const harness = makeHarness();
    harness.controller.applyFocus({ groupIndex: 1 }); // Feb

    const nextRows = [
      { month: 'Jan', sales: 10 },
      { month: 'Mar', sales: 30 }
    ];
    harness.reconcileWith({ dataProvider: makeProvider(nextRows) });
    expect(harness.focuses[harness.focuses.length - 1].focusedGroupIndex).toBe(-1);
  });

  it('keeps focus and filters when the data changes without a focused group', () => {
    const harness = makeHarness();
    harness.controller.applyFocus({ seriesId: 'S0' });

    harness.reconcileWith({ dataProvider: makeProvider([...rows]) });
    // no focus change events fired, series focus untouched
    expect(harness.focuses.length).toBe(0);
    expect(harness.controller.focusedSeriesId).toBe('S0');
  });

  it('resets focus and filters when the config structure changes', () => {
    const harness = makeHarness();
    harness.controller.applyFocus({ groupIndex: 1, seriesId: 'S0' });
    expect(harness.controller.toggleSeriesFilter('S0').filteredSeriesIds).toEqual({ S0: true });

    const structurallyDifferent = makeConfig({ seriesConfigs: [{ property: 'sales' }, { property: 'other' }] });
    harness.reconcileWith({ mochartConfig: structurallyDifferent });

    expect(harness.focuses[harness.focuses.length - 1]).toEqual({ focusedGroupIndex: -1, focusedSeriesAxisId: null, focusedSeriesId: null });
    expect(harness.filters[harness.filters.length - 1].filteredSeriesIds).toEqual({});
  });

  it('resets focus when the data provider becomes unavailable', () => {
    const harness = makeHarness();
    harness.controller.applyFocus({ groupIndex: 2 });

    harness.reconcileWith({ dataProvider: null as unknown as DataProvider });
    expect(harness.focuses[harness.focuses.length - 1].focusedGroupIndex).toBe(-1);
  });

  it('toggles series filters on and off', () => {
    const { controller } = makeHarness();

    expect(controller.toggleSeriesFilter('S0').filteredSeriesIds).toEqual({ S0: true });
    expect(controller.toggleSeriesFilter('S1').filteredSeriesIds).toEqual({ S0: true, S1: true });
    expect(controller.toggleSeriesFilter('S0').filteredSeriesIds).toEqual({ S1: true });
  });

  it('never mutates a previously returned filter snapshot', () => {
    const { controller } = makeHarness();

    const first = controller.toggleSeriesFilter('S0').filteredSeriesIds;
    const second = controller.toggleSeriesFilter('S1').filteredSeriesIds;
    controller.toggleSeriesFilter('S0');

    expect(first).toEqual({ S0: true });
    expect(second).toEqual({ S0: true, S1: true });
    expect(controller.filteredSeriesIds).toEqual({ S1: true });
  });
});
