/**
 * ANIM-7: flipping a series' showInLegend must not be treated as a structural
 * config change. It decides only whether a series appears in the legend, so the
 * chart must keep animating from where it is rather than being torn down and
 * replaying its opening animation from the baseline.
 *
 * Uses the golden suite's fake-clock harness: timers are faked before the
 * library import and frames are driven manually.
 */
import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest';
import { getCssClass, getIdCssClass } from '../../src/utils/ChartDom';

const seriesIdClass = (seriesId: string) => getIdCssClass('series', seriesId);
const seriesBarClass = getCssClass('seriesBar');
const legendItemClass = getCssClass('legendItem');

const WIDTH = 800;
const HEIGHT = 600;
const FRAME_MS = 16;
const MAX_FRAMES = 500;

const ITEMS = [
  { label: 'Mon', sales: 10, costs: 4 },
  { label: 'Tue', sales: 20, costs: 8 }
];

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

function runFrames(maxFrames = MAX_FRAMES) {
  let frames = 0;
  while (vi.getTimerCount() > 0 && frames < maxFrames) {
    vi.advanceTimersByTime(FRAME_MS);
    frames++;
  }
  return frames;
}

function makeConfig(costsShowInLegend: boolean) {
  return mochart.enhanceConfig({
    version: '1.0.0',
    animation: { animate: true },
    legend: { visible: true },
    categoryAxis: { property: 'label', type: 'string', scale: 'ordinal' },
    series: [
      { id: 'sales', property: 'sales', renderer: 'bar' },
      { id: 'costs', property: 'costs', renderer: 'bar', showInLegend: costsShowInLegend }
    ]
  } as never);
}

function mountChart(costsShowInLegend: boolean) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const chart = mochart.createChart(container, {
    mochartConfig: makeConfig(costsShowInLegend),
    dataProvider: new mochart.ArrayOfObjectsDataProvider(ITEMS, 'label') as never,
    width: WIDTH,
    height: HEIGHT
  });
  return { container, chart };
}

function barHeights(container: Element, seriesId: string): number[] {
  const paths = container.querySelectorAll(`.${seriesIdClass(seriesId)} path[class*="${seriesBarClass}"]`);
  return Array.from(paths).map((path) => {
    const d = path.getAttribute('d') ?? '';
    const match = /^M(-?[\d.]+),(-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)/.exec(d);
    expect(match, `unexpected bar path: ${d}`).not.toBeNull();
    return Math.abs(Number(match![4]));
  });
}

function legendItemCount(container: Element): number {
  return container.querySelectorAll(`.${legendItemClass}`).length;
}

describe('showInLegend updates on a mounted animated chart', () => {
  it('adds the legend item without replaying the opening animation', () => {
    const { container, chart } = mountChart(false);
    runFrames();
    const settled = barHeights(container, 'sales');
    expect(settled.every(height => height > 0)).toBe(true);
    expect(legendItemCount(container)).toBe(1);

    chart.update({ mochartConfig: makeConfig(true) });
    // the frame straight after the flip is where a rebuild shows: it restarts the opening
    // animation from the baseline, so the bars collapse before growing back
    vi.advanceTimersByTime(FRAME_MS);
    expect(legendItemCount(container)).toBe(2);
    expect(barHeights(container, 'sales')).toEqual(settled);

    runFrames();
    expect(barHeights(container, 'sales')).toEqual(settled);
    chart.destroy();
  });

  it('removes the legend item without replaying the opening animation', () => {
    const { container, chart } = mountChart(true);
    runFrames();
    const settled = barHeights(container, 'sales');
    expect(legendItemCount(container)).toBe(2);

    chart.update({ mochartConfig: makeConfig(false) });
    vi.advanceTimersByTime(FRAME_MS);
    expect(legendItemCount(container)).toBe(1);
    expect(barHeights(container, 'sales')).toEqual(settled);

    runFrames();
    expect(barHeights(container, 'sales')).toEqual(settled);
    chart.destroy();
  });

  // The legend's measured sizes are read a frame after the legend draws. Before ANIM-7 the flag
  // was structural so the mismatch could not arise; keyed by series id, the frame right after the
  // flip simply has no entry for the series that just joined.
  it('survives the frame straight after the flip, before the new item is measured', () => {
    const { container, chart } = mountChart(false);
    runFrames();

    chart.update({ mochartConfig: makeConfig(true) });
    vi.advanceTimersByTime(FRAME_MS);
    expect(legendItemCount(container)).toBe(2);
    expect(() => runFrames()).not.toThrow();
    expect(legendItemCount(container)).toBe(2);
    chart.destroy();
  });
});
