/**
 * Regression test: series plotted against a hidden (visible: false) series
 * axis must still get a usable value scale. The axis used to map to plain
 * zero bounds without a seriesExtent, so every series position came out NaN
 * (the sparkline preset hides all axes and hit this).
 */
import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest';

const FRAME_MS = 16;

let mochart: typeof import('../../src');

beforeAll(async () => {
  const svgProto = globalThis.SVGElement.prototype as any;
  if (typeof svgProto.getComputedTextLength !== 'function') {
    svgProto.getComputedTextLength = () => 0;
  }
  if (typeof svgProto.getSubStringLength !== 'function') {
    svgProto.getSubStringLength = () => 0;
  }
  if (typeof svgProto.getBBox !== 'function') {
    svgProto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
  }
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

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllTimers();
});

function runFrames(maxFrames = 500) {
  let frames = 0;
  while (vi.getTimerCount() > 0 && frames < maxFrames) {
    vi.advanceTimersByTime(FRAME_MS);
    frames++;
  }
}

describe('hidden series axis rendering', () => {
  it('renders finite series positions when every axis is hidden', () => {
    const { createChart, enhanceConfig, ArrayOfObjectsDataProvider } = mochart;
    const mochartConfig = enhanceConfig({
      version: '1.0.0',
      groupAxisConfig: { property: 'i', type: 'number', scale: 'linear', visible: false },
      seriesAxisConfigs: [{ id: 'sa', visible: false }],
      seriesConfigs: [{ axis: 'sa', property: 'value', renderer: 'line' }]
    });
    const data = [
      { i: 0, value: 3 },
      { i: 1, value: 7 },
      { i: 2, value: 5 },
      { i: 3, value: 9 }
    ];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const chart = createChart(container, {
      mochartConfig,
      dataProvider: new ArrayOfObjectsDataProvider(data, 'i'),
      width: 150,
      height: 32
    });
    runFrames();

    const html = container.innerHTML;
    expect(html).not.toContain('NaN');
    const seriesPath = container.querySelector('path[d^="M"]');
    expect(seriesPath).not.toBeNull();
    // Hidden axes must not draw any tick labels or axis lines.
    expect(container.querySelectorAll('text').length).toBe(0);

    chart.destroy();
  });
});
