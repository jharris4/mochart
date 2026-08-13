/**
 * followSeries animation-sync tests: a leader and its followers — a hollow
 * candlestick body and its wick segments — render one visual mark, so their
 * value animations share a duration and the segments stay glued to the body
 * edges through every frame, the same way stacked series stay gapless. Both
 * delta paths are covered: a legend filtering (filtered) and a data update
 * (raw). Uses the golden suite's fake-clock harness: timers are faked before
 * the library import and frames are driven manually.
 */
import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest';
import { getCssClass, getIdCssClass, getIdCssSelector, getCssClassMatchSelector } from '../../src/utils/ChartDom';

const WIDTH = 800;
const HEIGHT = 600;
const FRAME_MS = 16;
const MAX_FRAMES = 500;

// Mon is an up candle (body open 1 → close 2), Tue a down candle.
const ITEMS = [
  { label: 'Mon', open: 1, high: 3, low: 0, close: 2 },
  { label: 'Tue', open: 2, high: 4, low: 1, close: 1.5 }
];

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

function runFrames(maxFrames = MAX_FRAMES) {
  let frames = 0;
  while (vi.getTimerCount() > 0 && frames < maxFrames) {
    vi.advanceTimersByTime(FRAME_MS);
    frames++;
  }
  return frames;
}

function advanceFrames(count: number) {
  for (let i = 0; i < count && vi.getTimerCount() > 0; i++) {
    vi.advanceTimersByTime(FRAME_MS);
  }
}

function mountHollowCandlestick(items: typeof ITEMS) {
  const { data, categoryAxis: categoryAxisConfig, series: seriesConfigs } = mochart.createCandlestick(items, { hollow: true });
  const mochartConfig = mochart.enhanceConfig({
    version: '1.0.0',
    animation: { animate: true },
    legend: { visible: true },
    categoryAxis: categoryAxisConfig,
    series: seriesConfigs
  } as never);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const chart = mochart.createChart(container, {
    mochartConfig,
    dataProvider: new mochart.ArrayOfObjectsDataProvider(data) as never,
    width: WIDTH,
    height: HEIGHT
  });
  return { container, chart, mochartConfig };
}

interface BarRect { y: number; height: number }

function barRects(container: Element, seriesId: string): BarRect[] {
  const paths = container.querySelectorAll(getIdCssSelector('series', seriesId) + ' path' + getCssClassMatchSelector(getCssClass('seriesBar')));
  return Array.from(paths).map((path) => {
    const d = path.getAttribute('d') ?? '';
    const match = /^M(-?[\d.]+),(-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)/.exec(d);
    expect(match, `unexpected bar path: ${d}`).not.toBeNull();
    return { y: Number(match![2]), height: Number(match![4]) };
  });
}

function barOpacity(container: Element, seriesId: string): string {
  const opacity = container.querySelector(getIdCssSelector('series', seriesId) + ' path')!.getAttribute('fill-opacity');
  expect(opacity, `no fill-opacity on ${seriesId}`).not.toBeNull();
  return opacity!;
}

/** The wick segments' inner edges must sit exactly on the body's edges. */
function expectSegmentsGluedToBody(container: Element, frameLabel: string) {
  const [body] = barRects(container, 'up');
  const [upper] = barRects(container, 'upWickUpper');
  const [lower] = barRects(container, 'upWickLower');
  expect(upper.y + upper.height, `upper segment bottom vs body top (${frameLabel})`).toBeCloseTo(body.y, 6);
  expect(lower.y, `lower segment top vs body bottom (${frameLabel})`).toBeCloseTo(body.y + body.height, 6);
}

describe('followSeries animation sync (hollow candlestick)', () => {
  it('recomputes follower focus when followSeries changes in place', () => {
    const makeConfig = (followLeader: boolean) => mochart.enhanceConfig({
      version: '1.0.0',
      animation: { animate: true, focusDuration: 64 },
      categoryAxis: { property: 'label', type: 'string', scale: 'ordinal' },
      series: [
        { id: 'companion', property: 'high', renderer: 'bar', showInLegend: false,
          ...(followLeader ? { followSeries: 'leader' } : {}) },
        { id: 'leader', property: 'close', renderer: 'bar' },
        { id: 'other', property: 'open', renderer: 'bar' }
      ]
    } as never);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const chart = mochart.createChart(container, {
      mochartConfig: makeConfig(false),
      dataProvider: new mochart.ArrayOfObjectsDataProvider(ITEMS) as never,
      focusedSeriesId: 'leader',
      width: WIDTH,
      height: HEIGHT
    });
    runFrames();

    expect(barOpacity(container, 'companion')).toBe(barOpacity(container, 'other'));
    expect(Number(barOpacity(container, 'companion'))).toBeLessThan(Number(barOpacity(container, 'leader')));

    chart.update({ mochartConfig: makeConfig(true) });
    runFrames();
    expect(barOpacity(container, 'companion')).toBe(barOpacity(container, 'leader'));

    chart.update({ mochartConfig: makeConfig(false) });
    runFrames();
    expect(barOpacity(container, 'companion')).toBe(barOpacity(container, 'other'));
    expect(Number(barOpacity(container, 'companion'))).toBeLessThan(Number(barOpacity(container, 'leader')));

    chart.destroy();
  });

  it('keeps the wick segments glued to the body through a filtering animation', () => {
    const { container, chart } = mountHollowCandlestick(ITEMS);
    runFrames();
    expectSegmentsGluedToBody(container, 'settled');

    container.querySelector(getCssClassMatchSelector(getIdCssClass('legendItem', 'up')))!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // sample several mid-animation frames — before the fix the segments'
    // synced-to-high edges lagged the body's and overlapped it here
    let filteringFrames = 0;
    for (const step of [2, 3, 3, 3]) {
      advanceFrames(step);
      if (barRects(container, 'up').length === 0) {
        break; // the filtered candle has finished animating out
      }
      expectSegmentsGluedToBody(container, 'mid-filtering');
      filteringFrames++;
    }
    // the guarded assertion above is the point of this test, so a timing change must not silently skip it
    expect(filteringFrames, 'mid-filtering frames checked').toBeGreaterThanOrEqual(2);
    runFrames();

    // restoring the series animates back in, glued throughout
    container.querySelector(getCssClassMatchSelector(getIdCssClass('legendItem', 'up')))!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    let restoreFrames = 0;
    for (const step of [2, 3, 3, 3]) {
      advanceFrames(step);
      if (barRects(container, 'up').length > 0) {
        expectSegmentsGluedToBody(container, 'mid-restore');
        restoreFrames++;
      }
    }
    expect(restoreFrames, 'mid-restore frames checked').toBeGreaterThanOrEqual(2);
    runFrames();
    expectSegmentsGluedToBody(container, 'restored');

    chart.destroy();
  });

  it('keeps the wick segments glued to the body through a data-update animation', () => {
    const { container, chart } = mountHollowCandlestick(ITEMS);
    runFrames();

    // move every candle value by a different amount so the body and segment
    // edges travel different distances — the case that desynchronizes
    // unsynced constant-speed animations
    const changed = mochart.createCandlestick([
      { label: 'Mon', open: 1.5, high: 6, low: 1, close: 4 },
      { label: 'Tue', open: 3, high: 5, low: 0.5, close: 2 }
    ], { hollow: true });
    chart.update({ dataProvider: new mochart.ArrayOfObjectsDataProvider(changed.data) as never });

    for (const step of [2, 3, 3, 3]) {
      advanceFrames(step);
      expectSegmentsGluedToBody(container, 'mid-update');
    }
    runFrames();
    expectSegmentsGluedToBody(container, 'updated');

    chart.destroy();
  });
});
