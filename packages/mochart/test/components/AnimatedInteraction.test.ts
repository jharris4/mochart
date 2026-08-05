/**
 * Interaction tests against the animated chart (animate: true): tooltip focus
 * tweens and data tweens driven deterministically on a fake clock (same
 * technique as the golden suite).
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;
const FRAME_MS = 16;
const MAX_FRAMES = 500;

const rows = [
  { month: 'Jan', sales: 10 },
  { month: 'Feb', sales: 20 },
  { month: 'Mar', sales: 30 }
];

function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: VERSION,
    animation: { animate: true },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales' }],
    ...overrides
  } as unknown as MochartInputConfig;
}

let mochart: typeof import('../../src');

beforeAll(async () => {
  installSvgMeasurementShims();
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return {
      x: 0, y: 0, left: 0, top: 0, right: WIDTH, bottom: HEIGHT,
      width: WIDTH, height: HEIGHT, toJSON: () => ({})
    } as DOMRect;
  });
  if (typeof globalThis.requestAnimationFrame !== 'function') {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), FRAME_MS) as unknown as number;
    globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }
  vi.useFakeTimers({
    toFake: [
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'
    ]
  });
  mochart = await import('../../src');
});

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig, callbacks: Partial<DefaultChartProps> = {}, data: readonly unknown[] = rows) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = mochart.createDefaultChart(container, {
    config, data, width: WIDTH, height: HEIGHT, ...callbacks
  } as DefaultChartProps);
  handles.push(handle);
  return { container, handle };
}

/** Advance the fake clock frame by frame until all tweens/timers settle. */
function runFrames(maxFrames = MAX_FRAMES): number {
  let frames = 0;
  while (vi.getTimerCount() > 0 && frames < maxFrames) {
    vi.advanceTimersByTime(FRAME_MS);
    frames++;
  }
  return frames;
}

function mouse(target: Element, type: string, clientX: number, clientY: number): void {
  target.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }));
}

function chartRoot(container: Element): Element {
  const root = container.querySelector('[data-mochart-version]');
  expect(root).not.toBeNull();
  return root!;
}

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
  vi.clearAllTimers();
});

describe('animated chart interactions', () => {
  it('settles the initial value animation and renders series shapes', () => {
    const { container } = mountChart(makeConfig());
    const frames = runFrames();
    expect(frames).toBeGreaterThan(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(container.querySelectorAll('[class*="mochart-series"]').length).toBeGreaterThan(0);
  });

  it('animates focus when the tooltip opens and settles', () => {
    const { container } = mountChart(makeConfig());
    runFrames();
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    mouse(root, 'click', 100, 100);
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();
    // the focus tween queued frames; run them to completion
    const frames = runFrames();
    expect(frames).toBeGreaterThan(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();

    // closing animates focus back out
    mouse(root, 'click', 100, 100);
    runFrames();
    expect(container.querySelector('.mochart-tooltip')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('interrupts a running focus animation with a new focus target', () => {
    const { container } = mountChart(makeConfig({ tooltip: { followPointer: true } }));
    runFrames();
    const root = chartRoot(container);

    mouse(root, 'mouseenter', 100, 100);
    // advance only a few frames so the focus tween is mid-flight, then refocus
    vi.advanceTimersByTime(FRAME_MS * 3);
    mouse(root, 'mousemove', 790, 100);
    runFrames();
    expect(vi.getTimerCount()).toBe(0);
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();
  });

  it('animates a data update and settles on the new values', () => {
    const { container, handle } = mountChart(makeConfig());
    runFrames();

    const nextRows = [
      { month: 'Jan', sales: 40 },
      { month: 'Feb', sales: 10 },
      { month: 'Mar', sales: 25 },
      { month: 'Apr', sales: 5 }
    ];
    handle.update({ data: nextRows } as Partial<DefaultChartProps>);
    const frames = runFrames();
    expect(frames).toBeGreaterThan(0);
    expect(vi.getTimerCount()).toBe(0);
    // the new category made it into the rendered chart
    expect(chartRoot(container).innerHTML).toContain('Apr');
  });

  it('animates series filtering from the legend', () => {
    const { container } = mountChart(makeConfig({
      legend: { visible: true },
      series: [{ property: 'sales' }, { property: 'costs' }]
    }), {}, rows.map(row => ({ ...row, costs: row.sales / 2 })));
    runFrames();

    const item = container.querySelector('[class*="mochart-legend-item-S1"]')!;
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const frames = runFrames();
    expect(frames).toBeGreaterThan(0);
    expect(vi.getTimerCount()).toBe(0);

    // unfilter and settle again
    item.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    runFrames();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('interrupts a running data animation with another data update', () => {
    const { handle } = mountChart(makeConfig());
    runFrames();

    handle.update({ data: rows.map(row => ({ ...row, sales: row.sales * 2 })) } as Partial<DefaultChartProps>);
    // mid-flight, push another update
    vi.advanceTimersByTime(FRAME_MS * 3);
    handle.update({ data: rows.map(row => ({ ...row, sales: row.sales * 3 })) } as Partial<DefaultChartProps>);
    const frames = runFrames();
    expect(frames).toBeGreaterThan(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
