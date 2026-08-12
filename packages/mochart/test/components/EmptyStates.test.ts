/**
 * TEST-3 regression: the "No Data" and "No Series" states, and five of the six ChartFactories
 * props, were never exercised. They are documented, publicly overridable states with their own
 * CSS classes and their own props on all five bindings, and the overlay positions itself from
 * `seriesLayoutInfo` — so a layout regression would put the message outside the plot with
 * nothing failing.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createChart, createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { ChartFactoryContext, DefaultChartProps, ManagedChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getCssSelector } from '../../src/utils/ChartDom';

const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { month: 'Jan', sales: 10 },
  { month: 'Feb', sales: 20 }
];

function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales' }],
    ...overrides
  } as unknown as MochartInputConfig;
}

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(props: Partial<DefaultChartProps> = {}, config = makeConfig(), data: readonly unknown[] = rows): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  handles.push(createDefaultChart(container, {
    config, data, width: WIDTH, height: HEIGHT, ...props
  } as DefaultChartProps));
  return container;
}

function marker(text: string) {
  return () => {
    const node = document.createElement('div');
    node.className = 'factory-marker';
    node.textContent = text;
    return node;
  };
}

beforeAll(() => {
  installSvgMeasurementShims();
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return {
      x: 0, y: 0, left: 0, top: 0, right: WIDTH, bottom: HEIGHT,
      width: WIDTH, height: HEIGHT, toJSON: () => ({})
    } as DOMRect;
  });
});

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
});

describe('no-data state', () => {
  it('renders the default message for a zero-row provider', () => {
    const container = mountChart({}, makeConfig(), []);
    const noData = container.querySelector(getCssSelector('noData'));
    expect(noData).not.toBeNull();
    expect(noData!.textContent).toContain('No Data');
  });

  it('positions the overlay inside the chart rather than at the origin', () => {
    const container = mountChart({}, makeConfig(), []);
    const overlay = container.querySelector<HTMLElement>(getCssSelector('noData'))!;

    // absolutely positioned from seriesLayoutInfo: a layout regression would park it at 0,0
    // or size it past the chart, and nothing else in the suite would notice
    const left = Number.parseFloat(overlay.style.left);
    const top = Number.parseFloat(overlay.style.top);
    const width = Number.parseFloat(overlay.style.width);
    expect(left).toBeGreaterThan(0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(width).toBeGreaterThan(0);
    expect(left + width).toBeLessThanOrEqual(WIDTH);
  });

  it('goes away when rows arrive', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = createDefaultChart(container, {
      config: makeConfig(), data: [], width: WIDTH, height: HEIGHT
    } as DefaultChartProps);
    handles.push(handle);
    expect(container.querySelector(getCssSelector('noData'))).not.toBeNull();

    handle.update({ config: makeConfig(), data: rows, width: WIDTH, height: HEIGHT } as DefaultChartProps);
    expect(container.querySelector(getCssSelector('noData'))).toBeNull();
  });
});

describe('no-series state', () => {
  it('renders the default message when the config declares no series', () => {
    const container = mountChart({}, makeConfig({ series: [] }));
    const noSeries = container.querySelector(getCssSelector('noSeries'));
    expect(noSeries).not.toBeNull();
    expect(noSeries!.textContent).toContain('No Series');
  });

  it('draws no series groups in that state', () => {
    const container = mountChart({}, makeConfig({ series: [] }));
    expect(container.querySelectorAll(getCssSelector('series')).length).toBe(0);
  });
});

describe('ChartFactories overrides', () => {
  it('uses getNoDataComponent', () => {
    const container = mountChart({ getNoDataComponent: marker('custom empty') }, makeConfig(), []);
    expect(container.querySelector('.factory-marker')!.textContent).toBe('custom empty');
  });

  it('uses getNoSeriesComponent', () => {
    const container = mountChart({ getNoSeriesComponent: marker('custom no series') }, makeConfig({ series: [] }));
    expect(container.querySelector('.factory-marker')!.textContent).toBe('custom no series');
  });

  it('uses getLoadingComponent', () => {
    const container = mountChart({ loading: true, getLoadingComponent: marker('custom loading') });
    expect(container.querySelector('.factory-marker')!.textContent).toBe('custom loading');
  });

  it('uses getErrorComponent', () => {
    const container = mountChart({ error: 'boom', getErrorComponent: marker('custom error') });
    expect(container.querySelector('.factory-marker')!.textContent).toBe('custom error');
  });

  it('uses getNoSizeComponent', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    handles.push(createDefaultChart(container, {
      config: makeConfig(), data: rows, width: 0, height: 0,
      getNoSizeComponent: marker('custom no size')
    } as DefaultChartProps));
    expect(container.querySelector('.factory-marker')!.textContent).toBe('custom no size');
  });

  it('uses getConfigErrorComponent, and hands it the invalid config', () => {
    const seen: ChartFactoryContext[] = [];
    const container = mountChart({
      getConfigErrorComponent: (context: ChartFactoryContext) => {
        seen.push(context);
        return marker('custom config error')();
      }
    }, makeConfig({ series: [{ property: 'sales', renderer: 'nope' }] }));
    expect(container.querySelector('.factory-marker')!.textContent).toBe('custom config error');
    // the config as supplied, so the factory can report on what failed
    expect(seen[0].mochartConfig).not.toBeNull();
  });
});

/**
 * API-9: the six members used to arrive per code path — hasData reached only the loading factory,
 * mochartConfig skipped two call sites — so a factory reading one got undefined with no warning.
 * Every factory now gets all six; only width/height differ, per the box the content fills.
 */
describe('the state factory context', () => {
  const contextKeys = ['dataProvider', 'error', 'hasData', 'height', 'mochartConfig', 'width'];

  function capture(seen: ChartFactoryContext[]) {
    return (context: ChartFactoryContext) => {
      seen.push(context);
      return marker('captured')();
    };
  }

  /** Content placed inside a laid-out chart is sized to the plot area, which axes make smaller. */
  function expectPlotBox(context: ChartFactoryContext): void {
    expect(context.width).toBeGreaterThan(0);
    expect(context.width).toBeLessThan(WIDTH);
    expect(context.height).toBeGreaterThan(0);
    expect(context.height).toBeLessThan(HEIGHT);
  }

  function mountManaged(extra: Partial<ManagedChartProps>): void {
    const container = document.createElement('div');
    document.body.appendChild(container);
    handles.push(createChart(container, {
      mochartConfig: null, dataProvider: null, width: WIDTH, height: HEIGHT, ...extra
    } as unknown as ManagedChartProps) as unknown as ChartHandle<DefaultChartProps>);
  }

  it('reaches getNoSizeComponent whole, sized to the chart', () => {
    const seen: ChartFactoryContext[] = [];
    const container = document.createElement('div');
    document.body.appendChild(container);
    handles.push(createDefaultChart(container, {
      config: makeConfig(), data: rows, width: 0, height: 0, getNoSizeComponent: capture(seen)
    } as DefaultChartProps));

    expect(Object.keys(seen[0]).sort()).toEqual(contextKeys);
    expect(seen[0].width).toBe(0);
    expect(seen[0].height).toBe(0);
    expect(seen[0].mochartConfig).not.toBeNull();
    expect(seen[0].dataProvider).not.toBeNull();
    expect(seen[0].error).toBeUndefined();
    expect(seen[0].hasData).toBe(true);
  });

  it('reaches getConfigErrorComponent whole, with the invalid config', () => {
    const seen: ChartFactoryContext[] = [];
    mountChart({ getConfigErrorComponent: capture(seen) }, makeConfig({ series: [{ property: 'sales', renderer: 'nope' }] }));

    expect(Object.keys(seen[0]).sort()).toEqual(contextKeys);
    expect(seen[0].width).toBe(WIDTH);
    expect(seen[0].height).toBe(HEIGHT);
    expect(seen[0].mochartConfig!.validation.valid).toBe(false);
    expect(seen[0].dataProvider).not.toBeNull();
    expect(seen[0].error).toBeUndefined();
    // an invalid config commits no chart data
    expect(seen[0].hasData).toBe(false);
  });

  it('reaches getNoSeriesComponent whole, sized to the plot area', () => {
    const seen: ChartFactoryContext[] = [];
    mountChart({ getNoSeriesComponent: capture(seen) }, makeConfig({ series: [] }));

    expect(Object.keys(seen[0]).sort()).toEqual(contextKeys);
    expectPlotBox(seen[0]);
    expect(seen[0].mochartConfig).not.toBeNull();
    expect(seen[0].dataProvider).not.toBeNull();
    expect(seen[0].error).toBeUndefined();
    expect(seen[0].hasData).toBe(true);
  });

  it('reaches getNoDataComponent whole, with hasData false', () => {
    const seen: ChartFactoryContext[] = [];
    mountChart({ getNoDataComponent: capture(seen) }, makeConfig(), []);

    expect(Object.keys(seen[0]).sort()).toEqual(contextKeys);
    expectPlotBox(seen[0]);
    expect(seen[0].mochartConfig).not.toBeNull();
    expect(seen[0].dataProvider).not.toBeNull();
    expect(seen[0].error).toBeUndefined();
    expect(seen[0].hasData).toBe(false);
  });

  it('reaches getLoadingComponent whole in the laid-out chart', () => {
    const seen: ChartFactoryContext[] = [];
    mountChart({ loading: true, getLoadingComponent: capture(seen) });

    expect(Object.keys(seen[0]).sort()).toEqual(contextKeys);
    expectPlotBox(seen[0]);
    expect(seen[0].mochartConfig).not.toBeNull();
    expect(seen[0].dataProvider).not.toBeNull();
    expect(seen[0].error).toBeUndefined();
    expect(seen[0].hasData).toBe(true);
  });

  it('reaches getErrorComponent whole in the laid-out chart', () => {
    const seen: ChartFactoryContext[] = [];
    mountChart({ error: 'boom', getErrorComponent: capture(seen) });

    expect(Object.keys(seen[0]).sort()).toEqual(contextKeys);
    expectPlotBox(seen[0]);
    expect(seen[0].mochartConfig).not.toBeNull();
    expect(seen[0].dataProvider).not.toBeNull();
    expect(seen[0].error).toBe('boom');
    expect(seen[0].hasData).toBe(true);
  });

  it('reaches getLoadingComponent whole before a config arrives, sized to the chart', () => {
    const seen: ChartFactoryContext[] = [];
    mountManaged({ loading: true, getLoadingComponent: capture(seen) });

    expect(Object.keys(seen[0]).sort()).toEqual(contextKeys);
    expect(seen[0].width).toBe(WIDTH);
    expect(seen[0].height).toBe(HEIGHT);
    expect(seen[0].mochartConfig).toBeNull();
    expect(seen[0].dataProvider).toBeNull();
    expect(seen[0].error).toBeUndefined();
    expect(seen[0].hasData).toBe(false);
  });

  it('reaches getErrorComponent whole before a config arrives, sized to the chart', () => {
    const seen: ChartFactoryContext[] = [];
    mountManaged({ error: 'boom', getErrorComponent: capture(seen) });

    expect(Object.keys(seen[0]).sort()).toEqual(contextKeys);
    expect(seen[0].width).toBe(WIDTH);
    expect(seen[0].height).toBe(HEIGHT);
    expect(seen[0].mochartConfig).toBeNull();
    expect(seen[0].dataProvider).toBeNull();
    expect(seen[0].error).toBe('boom');
    expect(seen[0].hasData).toBe(false);
  });
});
