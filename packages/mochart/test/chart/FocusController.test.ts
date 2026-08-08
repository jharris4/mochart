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
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales' }],
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
  const harness: Harness = {
    controller,
    input: { mochartConfig: makeConfig(), dataProvider: makeProvider(rows) },
    focuses,
    filters,
    reconcileWith(next: Partial<FocusControllerInput>) {
      const nextInput = { ...harness.input, ...next };
      // what ChartController snapshots at commit: the ordering last read from the provider
      const renderedCategoryValues = harness.input.dataProvider
        ? [...harness.input.dataProvider.getCategoryValues()]
        : null;
      const changes = controller.reconcile(harness.input, nextInput, renderedCategoryValues);
      if (changes.focus) {
        focuses.push(changes.focus);
      }
      if (changes.seriesFilter) {
        filters.push(changes.seriesFilter);
      }
      harness.input = nextInput;
    }
  };
  return harness;
}

describe('FocusController focus handling', () => {
  it('tracks category, series and value axis focus independently', () => {
    const { controller } = makeHarness();

    expect(controller.applyFocus({ categoryIndex: 1 }))
      .toEqual({ focusedCategoryIndex: 1, focusedValueAxisId: null, focusedSeriesId: null });

    expect(controller.applyFocus({ seriesId: 'S0' }))
      .toEqual({ focusedCategoryIndex: 1, focusedValueAxisId: null, focusedSeriesId: 'S0' });

    expect(controller.applyFocus({ valueAxisId: 'VA0' }))
      .toEqual({ focusedCategoryIndex: 1, focusedValueAxisId: 'VA0', focusedSeriesId: 'S0' });

    // null category index clears back to -1; null ids clear the id focus
    expect(controller.applyFocus({ categoryIndex: null, seriesId: null, valueAxisId: null }))
      .toEqual({ focusedCategoryIndex: -1, focusedValueAxisId: null, focusedSeriesId: null });
  });

  it('remaps the focused category index when the data provider changes', () => {
    const harness = makeHarness();
    harness.controller.applyFocus({ categoryIndex: 1 }); // Feb

    // Feb moves to index 2 in the new data
    const nextRows = [
      { month: 'Jan', sales: 10 },
      { month: 'Apr', sales: 40 },
      { month: 'Feb', sales: 20 }
    ];
    harness.reconcileWith({ dataProvider: makeProvider(nextRows) });
    expect(harness.focuses[harness.focuses.length - 1].focusedCategoryIndex).toBe(2);
  });

  // Regression: the remap compared Date category values by object identity, so a
  // data update with fresh Date instances for the same dates dropped the focus.
  it('remaps Date category values by value, not object identity', () => {
    const harness = makeHarness();
    const dateRows = (offset: number) => [
      { month: new Date(2026, 0, 1), sales: 10 + offset },
      { month: new Date(2026, 1, 1), sales: 20 + offset },
      { month: new Date(2026, 2, 1), sales: 30 + offset }
    ] as unknown as typeof rows;
    harness.reconcileWith({ dataProvider: makeProvider(dateRows(0)) });
    harness.controller.applyFocus({ categoryIndex: 1 });

    // same dates as fresh instances, February reordered to the front
    const next = [
      { month: new Date(2026, 1, 1), sales: 25 },
      { month: new Date(2026, 0, 1), sales: 15 },
      { month: new Date(2026, 2, 1), sales: 35 }
    ] as unknown as typeof rows;
    harness.reconcileWith({ dataProvider: makeProvider(next) });
    expect(harness.focuses[harness.focuses.length - 1].focusedCategoryIndex).toBe(0);
  });

  it('drops category focus when the focused category disappears from the data', () => {
    const harness = makeHarness();
    harness.controller.applyFocus({ categoryIndex: 1 }); // Feb

    const nextRows = [
      { month: 'Jan', sales: 10 },
      { month: 'Mar', sales: 30 }
    ];
    harness.reconcileWith({ dataProvider: makeProvider(nextRows) });
    expect(harness.focuses[harness.focuses.length - 1].focusedCategoryIndex).toBe(-1);
  });

  it('keeps focus and filters when the data changes without a focused category', () => {
    const harness = makeHarness();
    harness.controller.applyFocus({ seriesId: 'S0' });

    harness.reconcileWith({ dataProvider: makeProvider([...rows]) });
    // no focus change events fired, series focus untouched
    expect(harness.focuses.length).toBe(0);
    expect(harness.controller.focusedSeriesId).toBe('S0');
  });

  it('unfilters an ex-follower when its followSeries link is removed in place', () => {
    const harness = makeHarness();
    const series = (followers: boolean) => [
      { id: 'S0', property: 'sales' },
      { id: 'S1', property: 'other', showInLegend: false, ...(followers ? { followSeries: 'S0' } : {}) }
    ];
    harness.reconcileWith({ mochartConfig: makeConfig({ series: series(true) }) }); // structural vs base, resets nothing set
    harness.controller.toggleSeriesFilter('S0', ['S1']);
    expect(harness.controller.filteredSeriesIds).toEqual({ S0: true, S1: true });

    harness.reconcileWith({ mochartConfig: makeConfig({ series: series(false) }) }); // followSeries-only change
    expect(harness.controller.filteredSeriesIds).toEqual({ S0: true });
    expect(harness.filters[harness.filters.length - 1].filteredSeriesIds).toEqual({ S0: true });
  });

  it('filters a series that starts following an already-filtered leader', () => {
    const harness = makeHarness();
    const series = (followers: boolean) => [
      { id: 'S0', property: 'sales' },
      { id: 'S1', property: 'other', ...(followers ? { followSeries: 'S0' } : {}) }
    ];
    harness.reconcileWith({ mochartConfig: makeConfig({ series: series(false) }) });
    harness.controller.toggleSeriesFilter('S0');
    harness.controller.applyFocus({ seriesId: 'S1' });

    harness.reconcileWith({ mochartConfig: makeConfig({ series: series(true) }) });
    expect(harness.controller.filteredSeriesIds).toEqual({ S0: true, S1: true });
    // the new follower was focused; a filtered series cannot stay focused
    expect(harness.controller.focusedSeriesId).toBe(null);
    expect(harness.focuses[harness.focuses.length - 1].focusedSeriesId).toBe(null);
  });

  it('reports no filter change for a non-structural update without a followSeries delta', () => {
    const harness = makeHarness();
    harness.controller.toggleSeriesFilter('S0');

    harness.reconcileWith({ mochartConfig: makeConfig() }); // same values, new identity
    expect(harness.filters.length).toBe(0);
    expect(harness.controller.filteredSeriesIds).toEqual({ S0: true });
  });

  it('resets focus and filters when the config structure changes', () => {
    const harness = makeHarness();
    harness.controller.applyFocus({ categoryIndex: 1, seriesId: 'S0' });
    expect(harness.controller.toggleSeriesFilter('S0').filteredSeriesIds).toEqual({ S0: true });

    const structurallyDifferent = makeConfig({ series: [{ property: 'sales' }, { property: 'other' }] });
    harness.reconcileWith({ mochartConfig: structurallyDifferent });

    expect(harness.focuses[harness.focuses.length - 1]).toEqual({ focusedCategoryIndex: -1, focusedValueAxisId: null, focusedSeriesId: null });
    expect(harness.filters[harness.filters.length - 1].filteredSeriesIds).toEqual({});
  });

  // Regression: filter-change detection was by identity, so a structural reset
  // with nothing filtered still reported a series-filter "change".
  it('does not report a series-filter change when a structural reset finds no filters', () => {
    const harness = makeHarness();
    harness.controller.applyFocus({ categoryIndex: 1 });

    const structurallyDifferent = makeConfig({ series: [{ property: 'sales' }, { property: 'other' }] });
    harness.reconcileWith({ mochartConfig: structurallyDifferent });

    expect(harness.focuses.length).toBe(1); // the focus reset still reports
    expect(harness.filters.length).toBe(0);
  });

  it('resets focus when the data provider becomes unavailable', () => {
    const harness = makeHarness();
    harness.controller.applyFocus({ categoryIndex: 2 });

    harness.reconcileWith({ dataProvider: null as unknown as DataProvider });
    expect(harness.focuses[harness.focuses.length - 1].focusedCategoryIndex).toBe(-1);
  });

  it('toggles series filters on and off', () => {
    const { controller } = makeHarness();

    expect(controller.toggleSeriesFilter('S0').filteredSeriesIds).toEqual({ S0: true });
    expect(controller.toggleSeriesFilter('S1').filteredSeriesIds).toEqual({ S0: true, S1: true });
    expect(controller.toggleSeriesFilter('S0').filteredSeriesIds).toEqual({ S1: true });
  });

  it('toggles follower series (followSeries) together with their series', () => {
    const { controller } = makeHarness();

    expect(controller.toggleSeriesFilter('S0', ['S0Wick']).filteredSeriesIds).toEqual({ S0: true, S0Wick: true });
    expect(controller.toggleSeriesFilter('S1').filteredSeriesIds).toEqual({ S0: true, S0Wick: true, S1: true });
    expect(controller.toggleSeriesFilter('S0', ['S0Wick']).filteredSeriesIds).toEqual({ S1: true });
  });

  it('snaps followers to the toggled series state even when they diverged', () => {
    const { controller } = makeHarness();
    controller.applyExternal({ filteredSeriesIds: { S0Wick: true } });

    // the primary was unfiltered, so toggling filters it — and the follower
    // stays filtered with it rather than toggling independently
    expect(controller.toggleSeriesFilter('S0', ['S0Wick']).filteredSeriesIds).toEqual({ S0: true, S0Wick: true });
    expect(controller.toggleSeriesFilter('S0', ['S0Wick']).filteredSeriesIds).toEqual({});
  });

  it('applies external controlled values, leaving undefined fields untouched', () => {
    const { controller } = makeHarness();
    controller.applyFocus({ categoryIndex: 2, seriesId: 'S0' });

    controller.applyExternal({ focusedCategoryIndex: 0, filteredSeriesIds: { S1: true } });
    expect(controller.focusedCategoryIndex).toBe(0);
    expect(controller.focusedSeriesId).toBe('S0'); // undefined = uncontrolled, kept
    expect(controller.filteredSeriesIds).toEqual({ S1: true });

    controller.applyExternal({ focusedSeriesId: null, focusedValueAxisId: 'VA0' });
    expect(controller.focusedSeriesId).toBe(null);
    expect(controller.focusedValueAxisId).toBe('VA0');
    expect(controller.focusedCategoryIndex).toBe(0);
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

  // Regression: the filter map was a plain {}, so assigning a __proto__ id hit
  // the prototype setter instead of creating a key — the series could never be filtered.
  it('toggles a series whose id is a prototype member name', () => {
    const { controller } = makeHarness();

    const filtered = controller.toggleSeriesFilter('__proto__').filteredSeriesIds;
    expect(Object.prototype.hasOwnProperty.call(filtered, '__proto__')).toBe(true);
    expect(filtered['__proto__']).toBe(true);

    const cleared = controller.toggleSeriesFilter('__proto__').filteredSeriesIds;
    expect(Object.prototype.hasOwnProperty.call(cleared, '__proto__')).toBe(false);

    expect(controller.toggleSeriesFilter('constructor').filteredSeriesIds['constructor']).toBe(true);
    expect(Object.keys(controller.toggleSeriesFilter('constructor').filteredSeriesIds)).toEqual([]);
  });
});
