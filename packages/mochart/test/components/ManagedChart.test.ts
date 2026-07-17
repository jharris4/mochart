import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import ManagedChart from '../../src/components/ManagedChart';
import { enhanceConfig } from '../../src/config/helper';
import { ArrayOfObjectsDataProvider } from '../../src/data/DataProvider';
import type { ChartFocus, ChartSeriesFilter, ManagedChartProps } from '../../src/types/chart';
import type { DataProvider } from '../../src/types/data';
import type { MochartInputConfig } from '../../src/types/config';

const VERSION = '1.0.3';

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

beforeAll(() => {
  installSvgMeasurementShims();
});

let mounted: ManagedChart[] = [];

interface MountResult {
  chart: ManagedChart;
  focuses: ChartFocus[];
  filters: ChartSeriesFilter[];
  props: ManagedChartProps;
}

function mountChart(overrides: Partial<ManagedChartProps> = {}): MountResult {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const focuses: ChartFocus[] = [];
  const filters: ChartSeriesFilter[] = [];
  const props = {
    mochartConfig: makeConfig(),
    dataProvider: makeProvider(rows),
    width: 800,
    height: 600,
    onFocus: (focus: ChartFocus) => { focuses.push(focus); },
    onSeriesFilter: (filter: ChartSeriesFilter) => { filters.push(filter); },
    ...overrides
  } as ManagedChartProps;
  const chart = new ManagedChart();
  chart.mount(host, null, props);
  mounted.push(chart);
  return { chart, focuses, filters, props };
}

afterEach(() => {
  for (const chart of mounted) {
    chart.destroy();
  }
  mounted = [];
  document.body.innerHTML = '';
});

describe('ManagedChart focus handling', () => {
  it('tracks group, series and series axis focus independently', () => {
    const { chart, focuses } = mountChart();

    chart.onFocus({ groupIndex: 1 });
    expect(focuses[focuses.length - 1]).toEqual({ focusedGroupIndex: 1, focusedSeriesAxisId: null, focusedSeriesId: null });

    chart.onFocus({ seriesId: 'S0' });
    expect(focuses[focuses.length - 1]).toEqual({ focusedGroupIndex: 1, focusedSeriesAxisId: null, focusedSeriesId: 'S0' });

    chart.onFocus({ seriesAxisId: 'SA0' });
    expect(focuses[focuses.length - 1]).toEqual({ focusedGroupIndex: 1, focusedSeriesAxisId: 'SA0', focusedSeriesId: 'S0' });

    // null group index clears back to -1; null ids clear the id focus
    chart.onFocus({ groupIndex: null, seriesId: null, seriesAxisId: null });
    expect(focuses[focuses.length - 1]).toEqual({ focusedGroupIndex: -1, focusedSeriesAxisId: null, focusedSeriesId: null });
  });

  it('remaps the focused group index when the data provider changes', () => {
    const { chart, focuses, props } = mountChart();
    chart.onFocus({ groupIndex: 1 }); // Feb

    // Feb moves to index 2 in the new data
    const nextRows = [
      { month: 'Jan', sales: 10 },
      { month: 'Apr', sales: 40 },
      { month: 'Feb', sales: 20 }
    ];
    chart.update({ ...props, dataProvider: makeProvider(nextRows) });
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(2);
  });

  it('drops group focus when the focused group disappears from the data', () => {
    const { chart, focuses, props } = mountChart();
    chart.onFocus({ groupIndex: 1 }); // Feb

    const nextRows = [
      { month: 'Jan', sales: 10 },
      { month: 'Mar', sales: 30 }
    ];
    chart.update({ ...props, dataProvider: makeProvider(nextRows) });
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(-1);
  });

  it('keeps focus and filters when the data changes without a focused group', () => {
    const { chart, focuses, props } = mountChart();
    chart.onFocus({ seriesId: 'S0' });
    const focusCount = focuses.length;

    chart.update({ ...props, dataProvider: makeProvider([...rows]) });
    // no focus change events fired, series focus untouched
    expect(focuses.length).toBe(focusCount);
    expect(chart.focusedSeriesId).toBe('S0');
  });

  it('resets focus and filters when the config structure changes', () => {
    const { chart, focuses, filters, props } = mountChart();
    chart.onFocus({ groupIndex: 1, seriesId: 'S0' });
    chart.onSeriesFilter('S0');
    expect(filters[filters.length - 1].filteredSeriesIds).toEqual({ S0: true });

    const structurallyDifferent = makeConfig({ seriesConfigs: [{ property: 'sales' }, { property: 'other' }] });
    chart.update({ ...props, mochartConfig: structurallyDifferent });

    expect(focuses[focuses.length - 1]).toEqual({ focusedGroupIndex: -1, focusedSeriesAxisId: null, focusedSeriesId: null });
    expect(filters[filters.length - 1].filteredSeriesIds).toEqual({});
  });

  it('resets focus when the data provider becomes unavailable', () => {
    const { chart, focuses, props } = mountChart();
    chart.onFocus({ groupIndex: 2 });

    chart.update({ ...props, dataProvider: null as unknown as DataProvider });
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(-1);
  });

  it('toggles series filters on and off', () => {
    const { chart, filters } = mountChart();

    chart.onSeriesFilter('S0');
    expect(filters[filters.length - 1].filteredSeriesIds).toEqual({ S0: true });

    chart.onSeriesFilter('S1');
    expect(filters[filters.length - 1].filteredSeriesIds).toEqual({ S0: true, S1: true });

    chart.onSeriesFilter('S0');
    expect(filters[filters.length - 1].filteredSeriesIds).toEqual({ S1: true });
  });
});
