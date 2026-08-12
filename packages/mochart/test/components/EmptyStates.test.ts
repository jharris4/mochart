/**
 * TEST-3 regression: the "No Data" and "No Series" states, and five of the six ChartFactories
 * props, were never exercised. They are documented, publicly overridable states with their own
 * CSS classes and their own props on all five bindings, and the overlay positions itself from
 * `seriesLayoutInfo` — so a layout regression would put the message outside the plot with
 * nothing failing.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { ChartFactoryContext, DefaultChartProps } from '../../src/types/chart';
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
    // API-9: documented as null when validation fails, actually the invalid config
    expect(seen[0].mochartConfig).not.toBeNull();
  });
});
