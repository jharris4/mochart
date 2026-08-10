/**
 * ANIM-1 regression: an explicit value-axis `min` above the data (or `max` below it)
 * inverts the domain, giving it a negative extent. The phase-duration weight is
 * `deltaExtent / (deltaExtent + domainExtent)`, so a growth delta of the same magnitude
 * used to cancel the denominator to zero — Infinity duration, a tween whose percentage
 * is 0 forever, and a requestAnimationFrame loop that never terminates.
 *
 * Both tests drive real frames on a fake clock and assert the animation actually settles.
 */
import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest';

const WIDTH = 800;
const HEIGHT = 600;
const FRAME_MS = 16;
// far beyond any real phase chain here (400ms + 200ms + 400ms ≈ 63 frames)
const RUNAWAY_FRAMES = 2000;

let mochart: typeof import('../../src');

beforeAll(async () => {
  const svgProto = globalThis.SVGElement.prototype as unknown as Record<string, unknown>;
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

function runFrames(maxFrames: number) {
  let frames = 0;
  while (vi.getTimerCount() > 0 && frames < maxFrames) {
    vi.advanceTimersByTime(FRAME_MS);
    frames++;
  }
  return frames;
}

interface Row { [key: string]: string | number; c: string; v: number }

function mount(valueAxis: Record<string, unknown>, rows: Row[]) {
  const mochartConfig = mochart.enhanceConfig({
    version: '1.0.0',
    animation: { animate: true, expansionDuration: 400, valueChangeDuration: 200, contractionDuration: 400 },
    categoryAxis: { property: 'c', type: 'string', scale: 'ordinal' },
    valueAxes: [valueAxis],
    series: [{ id: 'S0', property: 'v', renderer: 'bar' }]
  } as never);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const chart = mochart.createChart(container, {
    mochartConfig,
    dataProvider: new mochart.ArrayOfObjectsDataProvider(rows, 'c') as never,
    width: WIDTH,
    height: HEIGHT
  });
  return { container, chart, mochartConfig };
}

function updateRows(chart: ReturnType<typeof mount>['chart'], mochartConfig: unknown, rows: Row[]) {
  chart.update({
    mochartConfig,
    dataProvider: new mochart.ArrayOfObjectsDataProvider(rows, 'c') as never,
    width: WIDTH,
    height: HEIGHT
  } as never);
}

describe('inverted value-axis domain pacing', () => {
  it('settles when `min` sits above all-negative data and the values grow back to it', () => {
    // domain [0, -5]: extent -5, and a growth delta of +5 cancels the denominator exactly
    const { chart, mochartConfig } = mount({ min: 0 }, [{ c: 'a', v: -5 }, { c: 'b', v: -5 }]);
    runFrames(RUNAWAY_FRAMES);

    updateRows(chart, mochartConfig, [{ c: 'a', v: 0 }, { c: 'b', v: 0 }]);

    const frames = runFrames(RUNAWAY_FRAMES);
    expect(frames, 'animation never completed').toBeLessThan(RUNAWAY_FRAMES);
    expect(vi.getTimerCount(), 'a frame request outlived the animation').toBe(0);
  });

  it('settles when `max` sits below all-positive data and the values fall back to it', () => {
    const { chart, mochartConfig } = mount({ max: 0 }, [{ c: 'a', v: 5 }, { c: 'b', v: 5 }]);
    runFrames(RUNAWAY_FRAMES);

    updateRows(chart, mochartConfig, [{ c: 'a', v: 0 }, { c: 'b', v: 0 }]);

    const frames = runFrames(RUNAWAY_FRAMES);
    expect(frames, 'animation never completed').toBeLessThan(RUNAWAY_FRAMES);
    expect(vi.getTimerCount(), 'a frame request outlived the animation').toBe(0);
  });
});
