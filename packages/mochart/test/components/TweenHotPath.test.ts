/**
 * Hot-path regression tests for data tweens. A value-only data update (same
 * categories, same domains) must not remeasure text from the DOM on every tween
 * frame — rendered text only changes when the config or axisData changes.
 *
 * Unlike the other suites these shims return non-zero sizes, so measured
 * bounds are real (hasDefault false) and the remeasure-retry path stays quiet.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;
const FRAME_MS = 16;
const MAX_FRAMES = 500;

let textMeasureCalls = 0;

function installCountingMeasurementShims(): void {
  // Cast: these text-measurement methods live on SVGTextContentElement in the
  // DOM lib, not the SVGElement base prototype we shim here.
  const svgProto = globalThis.SVGElement.prototype as any;
  svgProto.getComputedTextLength = () => { textMeasureCalls++; return 40; };
  svgProto.getSubStringLength = () => { textMeasureCalls++; return 40; };
  svgProto.getBBox = () => { textMeasureCalls++; return { x: 0, y: 0, width: 40, height: 12 }; };
}

const rows = [
  { month: 'Jan', sales: 10 },
  { month: 'Feb', sales: 20 },
  { month: 'Mar', sales: 30 }
];

// same months, same min/max — value-only change with identical domains
const reversedRows = [
  { month: 'Jan', sales: 30 },
  { month: 'Feb', sales: 20 },
  { month: 'Mar', sales: 10 }
];

// different category labels — tick text changes, so a remeasure is required
const renamedRows = [
  { month: 'April', sales: 10 },
  { month: 'May', sales: 20 },
  { month: 'June', sales: 30 }
];

function makeConfig(): MochartInputConfig {
  return {
    version: VERSION,
    animation: { animate: true },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales' }]
  } as unknown as MochartInputConfig;
}

let mochart: typeof import('../../src');

beforeAll(async () => {
  installCountingMeasurementShims();
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

function mountChart(data: readonly unknown[] = rows) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = mochart.createDefaultChart(container, {
    config: makeConfig(), data, width: WIDTH, height: HEIGHT
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

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
  vi.clearAllTimers();
});

describe('data tween hot path', () => {
  it('does not remeasure text during a value-only data tween', () => {
    const { container, handle } = mountChart();
    runFrames();
    expect(vi.getTimerCount()).toBe(0);
    const settledHtml = container.innerHTML;

    textMeasureCalls = 0;
    handle.update({ data: reversedRows } as Partial<DefaultChartProps>);
    const frames = runFrames();

    expect(frames).toBeGreaterThan(0);
    expect(vi.getTimerCount()).toBe(0);
    // the tween re-rendered the series with the new values...
    expect(container.innerHTML).not.toBe(settledHtml);
    // ...without a single per-frame DOM text measurement
    expect(textMeasureCalls).toBe(0);
  });

  it('still remeasures when a data change alters the rendered tick text', () => {
    const { handle } = mountChart();
    runFrames();

    textMeasureCalls = 0;
    handle.update({ data: renamedRows } as Partial<DefaultChartProps>);
    runFrames();

    expect(textMeasureCalls).toBeGreaterThan(0);
  });
});
