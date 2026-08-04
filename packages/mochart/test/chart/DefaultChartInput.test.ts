/**
 * Unit tests for the createDefaultChart input adapter (previously exercised
 * through the DefaultChart component; now a plain class, no DOM required).
 */
import { describe, it, expect } from 'vitest';
import { DefaultChartInput } from '../../src/chart/DefaultChartInput';
import { isDataProviderValid } from '../../src/data/ChartData';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const VERSION = '1.0.0';

/** config whose single series reads numeric values — valid against `rows` */
function salesConfig(): MochartInputConfig {
  return {
    version: VERSION,
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales' }]
  } as unknown as MochartInputConfig;
}

/** config whose single series reads string values — invalid against `rows` */
function labelConfig(): MochartInputConfig {
  return {
    version: VERSION,
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'label' }]
  } as unknown as MochartInputConfig;
}

const rows = [
  { month: 'Jan', sales: 10, label: 'ten' },
  { month: 'Feb', sales: 20, label: 'twenty' },
  { month: 'Mar', sales: 30, label: 'thirty' }
];

function props(config: MochartInputConfig, data: readonly unknown[]): DefaultChartProps {
  return { config, data, width: 800, height: 600 } as DefaultChartProps;
}

function startInput(config: MochartInputConfig, data: readonly unknown[]): { input: DefaultChartInput; props: DefaultChartProps } {
  const input = new DefaultChartInput();
  const initial = props(config, data);
  input.start(initial);
  return { input, props: initial };
}

describe('DefaultChartInput data validation', () => {
  it('exposes a valid provider for matching config and data', () => {
    const { input } = startInput(salesConfig(), rows);
    expect(isDataProviderValid(input.dataProvider)).toBe(true);
    expect(input.dataProvider!.getCategoryValues()).toEqual(['Jan', 'Feb', 'Mar']);
  });

  it('exposes an error provider when the data does not satisfy the config', () => {
    const { input } = startInput(labelConfig(), rows);
    expect(isDataProviderValid(input.dataProvider)).toBe(false);
  });

  it('re-validates when only the config changes and invalidates the data', () => {
    const { input, props: prev } = startInput(salesConfig(), rows);
    expect(isDataProviderValid(input.dataProvider)).toBe(true);

    input.update(prev, props(labelConfig(), rows));
    expect(isDataProviderValid(input.dataProvider)).toBe(false);
  });

  it('re-validates when only the config changes and restores validity, reusing the provider', () => {
    const { input, props: first } = startInput(salesConfig(), rows);
    const validProvider = input.dataProvider;

    const second = props(labelConfig(), rows);
    input.update(first, second);
    expect(isDataProviderValid(input.dataProvider)).toBe(false);

    input.update(second, props(salesConfig(), rows));
    expect(input.dataProvider).toBe(validProvider);
  });

  it('keeps a stable error provider identity while the data stays invalid', () => {
    const { input, props: prev } = startInput(labelConfig(), rows);
    const errorProvider = input.dataProvider;

    input.update(prev, props(labelConfig(), rows));
    expect(input.dataProvider).toBe(errorProvider);
  });

  it('rebuilds the provider when the data changes', () => {
    const { input, props: prev } = startInput(salesConfig(), rows);
    const firstProvider = input.dataProvider;

    const nextRows = [...rows, { month: 'Apr', sales: 40, label: 'forty' }];
    input.update(prev, props(salesConfig(), nextRows));
    expect(input.dataProvider).not.toBe(firstProvider);
    expect(input.dataProvider!.getCategoryValues()).toEqual(['Jan', 'Feb', 'Mar', 'Apr']);
  });

  it('exposes an error provider for data that is not an array of objects', () => {
    const { input } = startInput(salesConfig(), [1, 2, 3]);
    expect(isDataProviderValid(input.dataProvider)).toBe(false);
  });
});
