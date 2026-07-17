/**
 * Interaction tests for the pointer-driven chart pipeline: mouse events on
 * the chart drive the tooltip, tooltip controls, crosshair, and focus/event
 * callbacks. Charts are mounted through the public createDefaultChart() API
 * with animation disabled so everything runs synchronously in jsdom.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { ChartEventPayload, ChartFocus, DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const VERSION = '1.0.3';
const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { month: 'Jan', sales: 10, costs: 5 },
  { month: 'Feb', sales: 20, costs: 8 },
  { month: 'Mar', sales: 30, costs: 13 }
];

function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: VERSION,
    animationConfig: { animate: false },
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal' },
    seriesConfigs: [{ property: 'sales' }],
    ...overrides
  } as unknown as MochartInputConfig;
}

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig, callbacks: Partial<DefaultChartProps> = {}): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config, data: rows, width: WIDTH, height: HEIGHT, ...callbacks
  } as DefaultChartProps);
  handles.push(handle);
  return container;
}

function chartRoot(container: Element): Element {
  const root = container.querySelector('[data-mochart-version]');
  expect(root).not.toBeNull();
  return root!;
}

function mouse(target: Element, type: string, clientX: number, clientY: number): void {
  target.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }));
}

beforeAll(() => {
  installSvgMeasurementShims();
  // jsdom reports zero-size rects; report the mounted chart size instead so
  // the chart's pointer hit-testing (clientX/Y relative to the plot rect) works
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
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

describe('chart mouse events', () => {
  it('fires enter, move, leave and click callbacks with a group index payload', () => {
    const enters: ChartEventPayload[] = [];
    const moves: ChartEventPayload[] = [];
    const leaves: ChartEventPayload[] = [];
    const clicks: ChartEventPayload[] = [];
    const container = mountChart(makeConfig(), {
      onChartMouseEnter: payload => { enters.push(payload); },
      onChartMouseMove: payload => { moves.push(payload); },
      onChartMouseLeave: payload => { leaves.push(payload); },
      onChartClick: payload => { clicks.push(payload); }
    });
    const root = chartRoot(container);

    // first in-bounds motion event is the enter, later ones are moves
    mouse(root, 'mouseenter', 100, 100);
    expect(enters.length).toBe(1);
    mouse(root, 'mousemove', 400, 100);
    expect(moves.length).toBe(1);

    // an out-of-bounds move while inside is the leave
    mouse(root, 'mousemove', -10, 100);
    expect(leaves.length).toBe(1);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(clicks.length).toBe(1);

    // payloads carry the nearest group: far left resolves to the first group,
    // far right to the last
    expect(enters[0].groupIndex).toBe(0);
    const rightClicks: ChartEventPayload[] = [];
    mouse(root, 'mousemove', 790, 100);
    expect(moves[moves.length - 1].groupIndex).toBe(rows.length - 1);
    expect(rightClicks.length).toBe(0);
  });
});

describe('tooltip', () => {
  it('opens on click, closes on the next click, and applies group focus', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(makeConfig(), {
      onFocus: focus => { focuses.push(focus); }
    });
    const root = chartRoot(container);

    expect(container.querySelector('.mochart-tooltip')).toBeNull();

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();
    // tooltip content shows the group and the formatted series line
    const tooltipText = container.querySelector('.mochart-tooltip-content')!.textContent;
    expect(tooltipText).toContain('Jan');
    expect(tooltipText).toContain('10');
    // applyFocus (default true) focused the clicked group
    expect(focuses.length).toBeGreaterThan(0);
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(0);

    mouse(root, 'click', 100, 100);
    expect(container.querySelector('.mochart-tooltip')).toBeNull();
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(-1);
  });

  it('shows crosshair lines while the tooltip is open', () => {
    const container = mountChart(makeConfig());
    const root = chartRoot(container);

    // the crosshair root group is always mounted; its lines appear on toggle
    expect(container.querySelectorAll('.crosshair-line').length).toBe(0);
    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(container.querySelectorAll('.crosshair-line').length).toBeGreaterThan(0);

    mouse(root, 'click', 100, 100);
    expect(container.querySelectorAll('.crosshair-line').length).toBe(0);
  });

  it('opens on hover and closes on leave when mouseOver is enabled', () => {
    const container = mountChart(makeConfig({ tooltipConfig: { mouseOver: true } }));
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();

    // moving within the chart keeps it open and tracks the group
    mouse(root, 'mousemove', 790, 100);
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();

    // leaving the chart closes it
    mouse(root, 'mousemove', -10, 100);
    expect(container.querySelector('.mochart-tooltip')).toBeNull();
  });

  it('steps between groups with the tooltip controls', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(makeConfig({ tooltipConfig: { showControls: true } }), {
      onFocus: focus => { focuses.push(focus); }
    });
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);

    // the content is rendered twice (hidden sizer + visible tooltip); drive
    // the visible copy. Handlers live on the button containers, so bubble.
    const visibleButtons = () => Array.from(container.querySelectorAll('.mochart-tooltip button'));
    const prev = visibleButtons().find(button => button.textContent === 'p')!;
    const next = visibleButtons().find(button => button.textContent === 'n')!;
    expect(prev).toBeDefined();
    expect(next).toBeDefined();
    const visibleText = () => container.querySelector('.mochart-tooltip .mochart-tooltip-content')!.textContent;
    expect(visibleText()).toContain('Jan');

    next.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(visibleText()).toContain('Feb');
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(1);

    prev.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(visibleText()).toContain('Jan');
    expect(focuses[focuses.length - 1].focusedGroupIndex).toBe(0);

    // prev at the first group is a no-op
    prev.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(visibleText()).toContain('Jan');
  });

  it('toggles series filtering from a legend item click', () => {
    const filters: Array<{ filteredSeriesIds: Record<string, boolean> }> = [];
    const container = mountChart(makeConfig({
      legendConfig: { visible: true },
      seriesConfigs: [{ property: 'sales' }, { property: 'costs' }]
    }), {
      onSeriesFilter: filter => { filters.push(filter); }
    });

    const item = container.querySelector('[class*="mochart-legend-item-S1"]');
    expect(item).not.toBeNull();

    item!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(filters.length).toBe(1);
    expect(filters[0].filteredSeriesIds).toEqual({ S1: true });

    item!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(filters.length).toBe(2);
    expect(filters[1].filteredSeriesIds).toEqual({});
  });

  it('does not open when tooltip and crosshair are both hidden', () => {
    const container = mountChart(makeConfig({
      tooltipConfig: { visible: false },
      crosshairConfig: { visible: false }
    }));
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(container.querySelector('.mochart-tooltip')).toBeNull();
    expect(container.querySelector('.mochart-crosshair')).toBeNull();
  });
});
