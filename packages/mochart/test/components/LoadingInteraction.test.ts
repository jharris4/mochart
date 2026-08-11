/**
 * What stays interactive while `loading` is true.
 *
 * The rule: the chart reports but does not commit. Anything keyed to a series or axis id keeps
 * working, since ids survive a data change; anything keyed to a category position is suppressed,
 * since it may name something that no longer exists once the new data lands; and whatever is
 * already open can still be dismissed.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { ChartEventPayload, ChartFocus, ChartSeriesClickPayload, DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const WIDTH = 800;
const HEIGHT = 600;
const rows = [{ month: 'Jan', sales: 10 }, { month: 'Feb', sales: 20 }, { month: 'Mar', sales: 30 }];

function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ id: 'S0', property: 'sales' }],
    ...overrides
  } as unknown as MochartInputConfig;
}

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig, extra: Partial<DefaultChartProps> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config, data: rows, width: WIDTH, height: HEIGHT, ...extra
  } as DefaultChartProps);
  handles.push(handle);
  return { container, handle };
}

const root = (container: Element) => container.querySelector('[data-mochart-version]')!;

function mouse(target: Element, type: string, clientX: number, clientY: number): void {
  target.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }));
}

beforeAll(() => {
  installSvgMeasurementShims();
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return { x: 0, y: 0, left: 0, top: 0, right: WIDTH, bottom: HEIGHT, width: WIDTH, height: HEIGHT, toJSON: () => ({}) } as DOMRect;
  });
});

afterEach(() => {
  for (const handle of handles) { handle.destroy(); }
  handles = [];
  document.body.innerHTML = '';
});

describe('while loading, the chart still reports pointer movement', () => {
  it('fires enter and leave, so the two stay paired', () => {
    const enters: ChartEventPayload[] = [];
    const leaves: ChartEventPayload[] = [];
    const { container, handle } = mountChart(makeConfig(), {
      onChartMouseEnter: payload => { enters.push(payload); },
      onChartMouseLeave: payload => { leaves.push(payload); }
    });
    handle.update({ loading: true } as Partial<DefaultChartProps>);

    mouse(root(container), 'mouseenter', 100, 100);
    expect(enters.length).toBe(1);
    mouse(root(container), 'mousemove', -10, 100);
    expect(leaves.length).toBe(1);
  });

  it('notices the pointer leaving during a load', () => {
    // this is the leave the old code never saw: with the handlers detached the "pointer is
    // inside" flag latched on, and every later entry arrived as a move instead of an entry
    const enters: ChartEventPayload[] = [];
    const leaves: ChartEventPayload[] = [];
    const { container, handle } = mountChart(makeConfig(), {
      onChartMouseEnter: payload => { enters.push(payload); },
      onChartMouseLeave: payload => { leaves.push(payload); }
    });

    mouse(root(container), 'mouseenter', 100, 100);
    expect(enters.length).toBe(1);

    handle.update({ loading: true } as Partial<DefaultChartProps>);
    mouse(root(container), 'mousemove', -10, 100);
    expect(leaves.length).toBe(1);
    handle.update({ loading: false } as Partial<DefaultChartProps>);

    mouse(root(container), 'mouseenter', 100, 100);
    expect(enters.length).toBe(2);
  });
});

describe('while loading, the chart does not commit', () => {
  it('ignores clicks on the plot', () => {
    const clicks: ChartEventPayload[] = [];
    const { container, handle } = mountChart(makeConfig(), { onChartClick: payload => { clicks.push(payload); } });
    handle.update({ loading: true } as Partial<DefaultChartProps>);

    mouse(root(container), 'mouseenter', 100, 100);
    mouse(root(container), 'click', 100, 100);
    expect(clicks.length).toBe(0);
  });

  it('ignores series activation, which names a category that may not survive', () => {
    const clicks: ChartSeriesClickPayload[] = [];
    const { container, handle } = mountChart(makeConfig(), { onSeriesClick: payload => { clicks.push(payload); } });
    const shape = container.querySelector('.mochart-series-bar, .mochart-series-marker, .mochart-series-line')!;
    handle.update({ loading: true } as Partial<DefaultChartProps>);

    shape.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clicks.length).toBe(0);
  });

  it('does not open a follow-pointer tooltip on entry', () => {
    const { container, handle } = mountChart(makeConfig({ tooltip: { followPointer: true } }));
    handle.update({ loading: true } as Partial<DefaultChartProps>);

    mouse(root(container), 'mouseenter', 100, 100);
    expect(container.querySelector('.mochart-tooltip')).toBeNull();
  });
});

describe('while loading, ids keep working', () => {
  it('still focuses a value axis on hover', () => {
    const focuses: ChartFocus[] = [];
    const { container, handle } = mountChart(makeConfig(), { onFocus: focus => { focuses.push(focus); } });
    handle.update({ loading: true } as Partial<DefaultChartProps>);

    const axisInner = container.querySelector('.mochart-value-axis > g')!;
    mouse(axisInner, 'mouseenter', 40, 300);
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedValueAxisId: 'VA0' });
  });
});
