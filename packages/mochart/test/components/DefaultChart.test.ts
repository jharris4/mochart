import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import DefaultChart from '../../src/components/DefaultChart';
import { isDataProviderValid } from '../../src/data/ChartData';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const VERSION = '1.0.3';

/** config whose single series reads numeric values — valid against `rows` */
function salesConfig(): MochartInputConfig {
  return {
    version: VERSION,
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
    seriesConfigs: [{ property: 'sales' }]
  } as unknown as MochartInputConfig;
}

/** config whose single series reads string values — invalid against `rows` */
function labelConfig(): MochartInputConfig {
  return {
    version: VERSION,
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
    seriesConfigs: [{ property: 'label' }]
  } as unknown as MochartInputConfig;
}

const rows = [
  { month: 'Jan', sales: 10, label: 'ten' },
  { month: 'Feb', sales: 20, label: 'twenty' },
  { month: 'Mar', sales: 30, label: 'thirty' }
];

beforeAll(() => {
  installSvgMeasurementShims();
});

let mounted: DefaultChart[] = [];

function mountChart(config: MochartInputConfig, data: readonly unknown[]): DefaultChart {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const chart = new DefaultChart();
  chart.mount(host, null, { config, data, width: 800, height: 600 } as DefaultChartProps);
  mounted.push(chart);
  return chart;
}

afterEach(() => {
  for (const chart of mounted) {
    chart.destroy();
  }
  mounted = [];
  document.body.innerHTML = '';
});

describe('DefaultChart data validation', () => {
  it('exposes a valid provider for matching config and data', () => {
    const chart = mountChart(salesConfig(), rows);
    expect(isDataProviderValid(chart.state.dataProvider)).toBe(true);
    expect(chart.state.dataProvider!.getGroupValues()).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('exposes an error provider when the data does not satisfy the config', () => {
    const chart = mountChart(labelConfig(), rows);
    expect(isDataProviderValid(chart.state.dataProvider)).toBe(false);
  });

  it('re-validates when only the config changes and invalidates the data', () => {
    const chart = mountChart(salesConfig(), rows);
    expect(isDataProviderValid(chart.state.dataProvider)).toBe(true);

    chart.update({ config: labelConfig(), data: rows, width: 800, height: 600 } as DefaultChartProps);
    expect(isDataProviderValid(chart.state.dataProvider)).toBe(false);
  });

  it('re-validates when only the config changes and restores validity, reusing the provider', () => {
    const chart = mountChart(salesConfig(), rows);
    const validProvider = chart.state.dataProvider;

    chart.update({ config: labelConfig(), data: rows, width: 800, height: 600 } as DefaultChartProps);
    expect(isDataProviderValid(chart.state.dataProvider)).toBe(false);

    chart.update({ config: salesConfig(), data: rows, width: 800, height: 600 } as DefaultChartProps);
    expect(chart.state.dataProvider).toBe(validProvider);
  });

  it('keeps a stable error provider identity while the data stays invalid', () => {
    const chart = mountChart(labelConfig(), rows);
    const errorProvider = chart.state.dataProvider;

    chart.update({ config: labelConfig(), data: rows, width: 700, height: 500 } as DefaultChartProps);
    expect(chart.state.dataProvider).toBe(errorProvider);
  });

  it('rebuilds the provider when the data changes', () => {
    const chart = mountChart(salesConfig(), rows);
    const firstProvider = chart.state.dataProvider;

    const nextRows = [...rows, { month: 'Apr', sales: 40, label: 'forty' }];
    chart.update({ config: salesConfig(), data: nextRows, width: 800, height: 600 } as DefaultChartProps);
    expect(chart.state.dataProvider).not.toBe(firstProvider);
    expect(chart.state.dataProvider!.getGroupValues()).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
  });

  it('exposes an error provider for data that is not an array of objects', () => {
    const chart = mountChart(salesConfig(), [1, 2, 3]);
    expect(isDataProviderValid(chart.state.dataProvider)).toBe(false);
  });
});
