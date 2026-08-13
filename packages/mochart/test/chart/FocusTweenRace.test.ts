/**
 * Regression: focus tweens start after a small cancel-window delay, so a
 * series-only focus change landing right after a category focus change (a
 * tooltip row hover firing just after the click that pinned the category)
 * found this.focusData still holding the PRE-pin category index. The series
 * tween's target was built from that stale index, silently dropping the
 * category pin. The target must always derive from the input focus.
 */
import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest';
import { getIdCssSelector } from '../../src/utils/ChartDom';

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

const data = [
  { month: 'Jan', sales: 10, costs: 4 },
  { month: 'Feb', sales: 20, costs: 8 },
  { month: 'Mar', sales: 30, costs: 12 }
];

function mountChart() {
  const { createChart, enhanceConfig, ArrayOfObjectsDataProvider } = mochart;
  const mochartConfig = enhanceConfig({
    version: '1.0.0',
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [
      { id: 'sales', property: 'sales', renderer: 'bar' },
      { id: 'costs', property: 'costs', renderer: 'bar' }
    ]
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const chart = createChart(container, {
    mochartConfig,
    dataProvider: new ArrayOfObjectsDataProvider(data),
    width: 300,
    height: 200
  });
  runFrames();
  return { chart, container };
}

function barOpacities(container: Element, seriesId: string): (string | null)[] {
  return Array.from(container.querySelectorAll(getIdCssSelector('series', seriesId) + ' path'))
    .map(path => path.getAttribute('fill-opacity'));
}

describe('focus tween target', () => {
  it('keeps the category pin when a series focus lands inside the cancel window', () => {
    const { chart, container } = mountChart();

    // pin the category, then focus a series before any frame runs — the
    // category tween is still inside its start delay when it gets canceled
    chart.update({ focusedCategoryIndex: 1 });
    chart.update({ focusedCategoryIndex: 1, focusedSeriesId: 'sales' });
    runFrames();

    // costs is series-defocused (0.5), but its bar at the pinned category
    // still combines in the category focus (1); losing the pin renders 0.5,0.5,0.5
    expect(barOpacities(container, 'costs')).toEqual(['0.5', '1', '0.5']);
    // the focused series is fully focused throughout
    expect(barOpacities(container, 'sales')).toEqual(['1', '1', '1']);

    // clearing the series focus alone leaves the pure category-pinned state
    chart.update({ focusedCategoryIndex: 1, focusedSeriesId: null });
    runFrames();
    expect(barOpacities(container, 'costs')).toEqual(['0.5', '1', '0.5']);
    expect(barOpacities(container, 'sales')).toEqual(['0.5', '1', '0.5']);
  });
});
