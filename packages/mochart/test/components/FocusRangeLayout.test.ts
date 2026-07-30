/**
 * Axis title / tick label / focus range box placement for before ("outer left")
 * and after ("outer right") series axes, and for the group axis.
 *
 * These boxes are drawn inside the axis group (translated by the axis bounds)
 * and are offset only across the axis - a vertical axis' boxes always start at
 * y = 0 and span its full height, a horizontal axis' boxes always start at
 * x = 0 and span its full width - so a titled axis on either side must place
 * its focus range at the same position as an untitled one.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { month: 'Jan', sales: 10 },
  { month: 'Feb', sales: 20 },
  { month: 'Mar', sales: 30 }
];

// two mirrored axes carrying the same series values: a titled "before" axis and
// a titled "after" axis. Their focus ranges must land at the same y.
function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: VERSION,
    animationConfig: { animate: false },
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal', title: 'Month', focusRange: true },
    tooltipConfig: { focusOnSeriesMouseOver: true },
    seriesAxisConfigs: [
      { id: 'SA0', before: true, title: 'Left Titled' },
      { id: 'SA1', before: false, title: 'Right Titled' }
    ],
    seriesConfigs: [
      { id: 'S0', property: 'sales', axis: 'SA0' },
      { id: 'S1', property: 'sales', axis: 'SA1' }
    ],
    ...overrides
  } as unknown as MochartInputConfig;
}

interface Rect { x: number; y: number; width: number; height: number }

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config, data: rows, width: WIDTH, height: HEIGHT
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

function axisGroup(container: Element, axisClass: string): Element {
  const group = container.querySelector('.' + axisClass);
  expect(group).not.toBeNull();
  return group!;
}

function rect(group: Element, selector: string): Rect {
  const el = group.querySelector(selector);
  expect(el, selector).not.toBeNull();
  return {
    x: Number(el!.getAttribute('x')),
    y: Number(el!.getAttribute('y')),
    width: Number(el!.getAttribute('width')),
    height: Number(el!.getAttribute('height'))
  };
}

// hovering a tooltip series line focuses that series, which is what draws the
// focus range on its axis
function focusSeries(container: Element, seriesId: string): void {
  const root = chartRoot(container);
  mouse(root, 'mouseenter', 100, 100);
  mouse(root, 'click', 100, 100);
  const line = container.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-' + seriesId + '"]');
  expect(line).not.toBeNull();
  line!.dispatchEvent(new MouseEvent('mouseenter', {}));
}

beforeAll(() => {
  installSvgMeasurementShims();
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

describe('axis box placement along the axis', () => {
  it('starts the title and tick label boxes at the top of a vertical axis', () => {
    const container = mountChart(makeConfig());
    for (const axisId of ['SA0', 'SA1']) {
      const group = axisGroup(container, 'mochart-series-axis-' + axisId);
      expect({ axisId, y: rect(group, '.mochart-axis-title rect').y }).toEqual({ axisId, y: 0 });
      expect({ axisId, y: rect(group, '.mochart-axis-tick-labels rect').y }).toEqual({ axisId, y: 0 });
    }
  });

  it('starts the title and tick label boxes at the left of the group axis', () => {
    const container = mountChart(makeConfig());
    const group = axisGroup(container, 'mochart-group-axis');
    expect(rect(group, '.mochart-axis-title rect').x).toBe(0);
    expect(rect(group, '.mochart-axis-tick-labels rect').x).toBe(0);
  });
});

describe('series axis focus range placement', () => {
  it('places the focus range identically on titled before and after axes', () => {
    const before = mountChart(makeConfig());
    focusSeries(before, 'S0');
    const beforeRange = rect(axisGroup(before, 'mochart-series-axis-SA0'), '.mochart-axis-focus-range rect');

    const after = mountChart(makeConfig());
    focusSeries(after, 'S1');
    const afterRange = rect(axisGroup(after, 'mochart-series-axis-SA1'), '.mochart-axis-focus-range rect');

    expect(afterRange.y).toBe(beforeRange.y);
    expect(afterRange.height).toBe(beforeRange.height);
  });

  it('keeps the focus range within the axis bounds', () => {
    const container = mountChart(makeConfig());
    focusSeries(container, 'S1');
    const group = axisGroup(container, 'mochart-series-axis-SA1');
    const range = rect(group, '.mochart-axis-focus-range rect');
    // the tick label box spans the axis' full length, so it gives the bounds
    const axisHeight = rect(group, '.mochart-axis-tick-labels rect').height;

    expect(range.y).toBeGreaterThan(0);
    // the focused group's value runs down to the axis base, which sits at the
    // bottom of the axis
    expect(range.y + range.height).toBe(axisHeight);
  });
});
