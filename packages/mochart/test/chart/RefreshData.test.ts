/**
 * ChartHandle.refresh(): the escape hatch for in-place data mutation — update() detects changes by
 * object identity only, so mutated arrays/providers need refresh() to be re-read and re-rendered.
 */
import { describe, it, beforeAll, expect } from 'vitest';
import { installSvgMeasurementShims } from '../components/svgShims';
import { installFakeFrameClock, runFrames, mountContainer } from '../components/helpers';

let mochart: typeof import('../../src');

beforeAll(async () => {
  installSvgMeasurementShims();
  installFakeFrameClock();
  mochart = await import('../../src');
});

function getCategoryLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('text'))
    .map(text => text.textContent ?? '')
    .filter(label => ['a', 'b', 'c'].includes(label));
}

import type { MochartInputConfig } from '../../src/types/config';

const config = {
  version: '1.0.0',
  categoryAxis: { property: 'label', type: 'string', scale: 'ordinal' },
  series: [{ property: 'value', renderer: 'bar' }]
} as unknown as MochartInputConfig;

describe('createDefaultChart refresh', () => {
  it('renders a category pushed onto the same data array only after refresh', () => {
    const data = [
      { label: 'a', value: 1 },
      { label: 'b', value: 3 }
    ];
    const container = mountContainer();
    const chart = mochart.createDefaultChart(container, { config, data, width: 300, height: 200 });
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']);

    data.push({ label: 'c', value: 2 });
    chart.update({ data });
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']); // identity unchanged, mutation not seen

    chart.refresh();
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b', 'c']);
    chart.destroy();
  });
});

describe('createChart refresh', () => {
  it('remaps an uncontrolled focused category after an in-place reorder', () => {
    const data = [
      { label: 'a', value: 1 },
      { label: 'b', value: 3 },
      { label: 'c', value: 2 }
    ];
    const dataProvider = new mochart.ArrayOfObjectsDataProvider(data);
    const mochartConfig = mochart.enhanceConfig({
      ...config,
      animation: { animate: false }
    } as never);
    const focuses: { focusedCategoryIndex: number }[] = [];
    const props = {
      mochartConfig,
      dataProvider,
      width: 300,
      height: 200,
      onFocus: (focus: { focusedCategoryIndex: number }) => focuses.push(focus)
    };

    const container = mountContainer();
    const chart = mochart.createChart(container, { ...props, focusedCategoryIndex: 1 });
    runFrames();
    // Release the controlled value while retaining the internally applied focus on b.
    chart.replace(props);

    const [a, b, c] = data;
    data.splice(0, data.length, b, a, c);
    chart.refresh();
    runFrames();

    expect(focuses.map(focus => focus.focusedCategoryIndex)).toEqual([0]);
    chart.destroy();
  });

  it('remaps focus after an in-place reorder of a live provider with no refresh hook', () => {
    const liveCategories = ['a', 'b', 'c'];
    const liveValues: Record<string, number> = { a: 1, b: 3, c: 2 };
    const dataProvider = {
      getPropertyValues: (property: string) =>
        property === 'label' ? [...liveCategories] : liveCategories.map(label => liveValues[label])
    };
    const mochartConfig = mochart.enhanceConfig({
      ...config,
      animation: { animate: false }
    } as never);
    const focuses: { focusedCategoryIndex: number }[] = [];
    const props = {
      mochartConfig,
      dataProvider,
      width: 300,
      height: 200,
      onFocus: (focus: { focusedCategoryIndex: number }) => focuses.push(focus)
    };

    const container = mountContainer();
    const chart = mochart.createChart(container, { ...props, focusedCategoryIndex: 1 });
    runFrames();
    chart.replace(props);

    // The old ordering survives only in the chart's own snapshot: the provider
    // reads live, so by refresh() time the mutation has already happened.
    liveCategories.splice(0, liveCategories.length, 'b', 'a', 'c');
    chart.refresh();
    runFrames();

    expect(focuses.map(focus => focus.focusedCategoryIndex)).toEqual([0]);
    chart.destroy();
  });

  it('tolerates a null provider (loading hosts) across mount, refresh and update', () => {
    const mochartConfig = mochart.enhanceConfig(config as never);
    const container = mountContainer();
    const chart = mochart.createChart(container, {
      mochartConfig, dataProvider: null as never, loading: true, width: 300, height: 200
    });
    runFrames();
    chart.refresh();
    runFrames();
    expect(getCategoryLabels(container)).toEqual([]);

    const data = [{ label: 'a', value: 1 }, { label: 'b', value: 3 }];
    chart.update({ dataProvider: new mochart.ArrayOfObjectsDataProvider(data), loading: false });
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']);
    chart.destroy();
  });

  it('re-reads a stateless built-in row provider on refresh', () => {
    const data = [
      { label: 'a', value: 1 },
      { label: 'b', value: 3 }
    ];
    const dataProvider = new mochart.ArrayOfObjectsDataProvider(data);
    const mochartConfig = mochart.enhanceConfig(config as never);
    expect(mochartConfig.validation.valid).toBe(true);

    const container = mountContainer();
    const chart = mochart.createChart(container, {
      mochartConfig, dataProvider, width: 300, height: 200
    });
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']);

    data.push({ label: 'c', value: 2 });
    chart.refresh();
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b', 'c']);
    chart.destroy();
  });

  it('re-reads a live custom provider on refresh', () => {
    const liveCategories = ['a', 'b'];
    const liveValues: Record<string, number> = { a: 1, b: 3, c: 2 };
    const dataProvider = {
      getPropertyValues: (property: string) =>
        property === 'label' ? [...liveCategories] : liveCategories.map(label => liveValues[label])
    };
    const mochartConfig = mochart.enhanceConfig(config as never);
    expect(mochartConfig.validation.valid).toBe(true);

    const container = mountContainer();
    const chart = mochart.createChart(container, {
      mochartConfig, dataProvider, width: 300, height: 200
    });
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']);

    liveCategories.push('c');
    chart.update({ width: 301 }); // unrelated update: provider identity unchanged, mutation not seen
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b']);

    chart.refresh();
    runFrames();
    expect(getCategoryLabels(container).sort()).toEqual(['a', 'b', 'c']);
    chart.destroy();
  });

  // Regression: with no config the chart's props were identical across refresh(), so the renderer
  // skipped sync and never re-read the provider's getLoading()/getError()
  it('re-reads a provider\'s getLoading() on refresh with no config loaded', () => {
    let loading = true;
    const dataProvider = { getPropertyValues: () => undefined, getLoading: () => loading };
    const container = mountContainer();
    const chart = mochart.createChart(container, { mochartConfig: null as never, dataProvider, width: 300, height: 200 });
    runFrames();
    expect(container.textContent).toContain('Loading...');

    loading = false;
    chart.refresh();
    runFrames();
    expect(container.textContent).not.toContain('Loading...');
    chart.destroy();
  });

  it('re-reads a provider\'s getError() on refresh with no config loaded', () => {
    let error = 'first failure';
    const dataProvider = { getPropertyValues: () => undefined, getError: () => error };
    const container = mountContainer();
    const chart = mochart.createChart(container, { mochartConfig: null as never, dataProvider, width: 300, height: 200 });
    runFrames();
    expect(container.textContent).toContain('first failure');

    error = 'second failure';
    chart.refresh();
    runFrames();
    expect(container.textContent).toContain('second failure');
    expect(container.textContent).not.toContain('first failure');
    chart.destroy();
  });
});
