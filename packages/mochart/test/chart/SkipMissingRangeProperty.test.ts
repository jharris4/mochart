/**
 * skipPartialRange: a ranged bar series treats a group missing either of
 * property/rangeProperty as missing, so skipMissing drops it instead of
 * collapsing it to a zero-extent bar at the defined value. The waterfall
 * helper relies on this — every row carries the shared `start` range
 * property but a value for only one direction series, and without the
 * option the two off-direction series kept invisible zero-extent bars at
 * `start` (visible as stray bar lines during suppression animations).
 *
 * The default (false) intentionally keeps the collapse behavior, so ranged
 * shapes stay connected through half-defined groups.
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

function renderWaterfall(skipPartialRange: boolean | undefined) {
  const { createChart, enhanceConfig, ArrayOfObjectsDataProvider, createWaterfall } = mochart;
  const waterfall = createWaterfall([
    { label: 'Opening', value: 100, total: true },
    { label: 'Up', value: 30 },
    { label: 'Down', value: -20 },
    { label: 'Closing', total: true }
  ]);
  const mochartConfig = enhanceConfig({
    version: '1.0.0',
    groupAxisConfig: waterfall.groupAxisConfig,
    seriesAxisConfigs: [{ id: 'sa' }],
    seriesConfigs: waterfall.seriesConfigs.map((seriesConfig) => ({
      ...seriesConfig,
      axis: 'sa',
      ...(skipPartialRange === undefined ? {} : { skipPartialRange })
    }))
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const chart = createChart(container, {
    mochartConfig,
    // The direction properties are undefined off their own rows, so the row
    // type needs narrowing to satisfy the provider's group-value constraint.
    dataProvider: new ArrayOfObjectsDataProvider(waterfall.data as Record<string, string | number>[], 'label'),
    width: 400,
    height: 200
  });
  runFrames();
  return { chart, container };
}

describe('skipPartialRange on a skipMissing bar series with a rangeProperty', () => {
  it('renders one bar per step across the waterfall direction series (helper default)', () => {
    const { chart, container } = renderWaterfall(undefined);

    // Each step belongs to exactly one direction series; the other two series
    // must skip the group rather than draw a zero-extent bar at `start`.
    const bars = container.querySelectorAll('path.mochart-series-bar');
    expect(bars.length).toBe(4);

    chart.destroy();
  });

  it('collapses half-defined groups to zero-extent bars when disabled', () => {
    const { chart, container } = renderWaterfall(false);

    // Every series keeps every group: the missing direction value is
    // back-filled from the shared `start` range value.
    const bars = container.querySelectorAll('path.mochart-series-bar');
    expect(bars.length).toBe(12);

    chart.destroy();
  });
});
