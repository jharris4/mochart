/**
 * Controlled focus/filter props on createChart: when the host passes
 * focusedCategoryIndex / focusedValueAxisId / focusedSeriesId /
 * filteredSeriesIds, they override the chart's internal focus state on every
 * update (the controlled-chart contract, used by the demos to
 * sync focus across several charts). Undefined leaves the chart uncontrolled.
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

const data = [
  { month: 'Jan', sales: 10, costs: 4 },
  { month: 'Feb', sales: 20, costs: 8 },
  { month: 'Mar', sales: 30, costs: 12 }
];

function mountChart() {
  const { createChart, enhanceConfig, ArrayOfObjectsDataProvider } = mochart;
  const mochartConfig = enhanceConfig({
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [
      { id: 'sales', property: 'sales', renderer: 'line' },
      { id: 'costs', property: 'costs', renderer: 'line' }
    ]
  });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const chart = createChart(container, {
    mochartConfig,
    dataProvider: new ArrayOfObjectsDataProvider(data, 'month'),
    width: 300,
    height: 200
  });
  runFrames();
  return { chart, container };
}

/** Strip the per-instance numeric suffix from generated element/clipPath ids. */
function normalizedHtml(container: Element): string {
  return container.innerHTML.replace(/__(\d+)/g, '__X');
}

function seriesIds(container: Element): string[] {
  return Array.from(container.querySelectorAll('.mochart-series'))
    .map(el => Array.from(el.classList).find(c => c.startsWith('mochart-series-'))!);
}

describe('controlled filteredSeriesIds', () => {
  it('filters and restores series through the prop alone', () => {
    const { chart, container } = mountChart();
    expect(seriesIds(container)).toEqual(['mochart-series-sales', 'mochart-series-costs']);

    chart.update({ filteredSeriesIds: { costs: true } });
    runFrames();
    expect(seriesIds(container)).toEqual(['mochart-series-sales']);

    chart.update({ filteredSeriesIds: {} });
    runFrames();
    expect(seriesIds(container)).toEqual(['mochart-series-sales', 'mochart-series-costs']);
  });

  // Regression: the map was read as "present" rather than "true", so a host
  // that spelled out the unfiltered series hid every one of them.
  it('treats an explicit false as not filtered', () => {
    const { chart, container } = mountChart();

    chart.update({ filteredSeriesIds: { sales: false, costs: false } });
    runFrames();
    expect(seriesIds(container)).toEqual(['mochart-series-sales', 'mochart-series-costs']);

    chart.update({ filteredSeriesIds: { sales: false, costs: true } });
    runFrames();
    expect(seriesIds(container)).toEqual(['mochart-series-sales']);
  });
});

describe('synchronous host re-entrancy', () => {
  // Regression: reconcile fired onSeriesFilter before the new props were
  // committed, so a host that synchronously re-entered update() from the
  // callback (the vanilla demo) re-detected the same structural change forever.
  it('survives a host that re-enters update() from onSeriesFilter on a structural config change', () => {
    const { createChart, enhanceConfig, ArrayOfObjectsDataProvider } = mochart;
    const makeConfig = (categoryProperty: string) => enhanceConfig({
      version: '1.0.0',
      animation: { animate: false },
      categoryAxis: { property: categoryProperty, type: 'string', scale: 'ordinal' },
      series: [
        { id: 'sales', property: 'sales', renderer: 'line' },
        { id: 'costs', property: 'costs', renderer: 'line' }
      ]
    });
    const rows = data.map((row, index) => ({ ...row, week: 'W' + index }));
    const container = document.createElement('div');
    document.body.appendChild(container);

    const reported: Record<string, boolean>[] = [];
    const host = {
      chart: null as ReturnType<typeof createChart> | null,
      onSeriesFilter(filter: { filteredSeriesIds: Record<string, boolean> }) {
        reported.push(filter.filteredSeriesIds);
        // the demo pattern: clone (new identity) and synchronously push back
        host.chart!.update({ filteredSeriesIds: { ...filter.filteredSeriesIds } });
      }
    };
    host.chart = createChart(container, {
      mochartConfig: makeConfig('month'),
      dataProvider: new ArrayOfObjectsDataProvider(rows, 'month'),
      width: 300, height: 200,
      filteredSeriesIds: {},
      onSeriesFilter: host.onSeriesFilter
    });
    runFrames();

    host.chart.update({ filteredSeriesIds: { costs: true } });
    runFrames();
    expect(seriesIds(container)).toEqual(['mochart-series-sales']);

    // structural change (new category property) while a series is filtered:
    // the reset must be reported exactly once, to a host that re-enters
    host.chart.update({
      mochartConfig: makeConfig('week'),
      dataProvider: new ArrayOfObjectsDataProvider(rows, 'week'),
      filteredSeriesIds: {}
    });
    runFrames();

    expect(reported).toEqual([{}]);
    expect(seriesIds(container)).toEqual(['mochart-series-sales', 'mochart-series-costs']);
  });
});

describe('controlled focus props', () => {
  it('re-renders focus state from focusedSeriesId and focusedCategoryIndex', () => {
    const { chart, container } = mountChart();
    const unfocusedHtml = container.innerHTML;

    chart.update({ focusedSeriesId: 'sales', focusedCategoryIndex: 1 });
    runFrames();
    const focusedHtml = container.innerHTML;
    expect(focusedHtml).not.toBe(unfocusedHtml);

    chart.update({ focusedSeriesId: null, focusedCategoryIndex: -1 });
    runFrames();
    expect(container.innerHTML).toBe(unfocusedHtml);
  });

  it('mirrors one chart\'s reported focus into another chart', () => {
    // The demo pattern: chart A reports focus via onFocus, the host passes the
    // snapshot into chart B as controlled props.
    const a = mountChart();
    const b = mountChart();
    const baseline = normalizedHtml(b.container);

    // drive A internally (as a pointer interaction would) and take the same
    // snapshot the onFocus callback reports
    const directlyFocused = mountChart();
    directlyFocused.chart.update({ focusedSeriesId: 'costs' });
    runFrames();

    b.chart.update({ focusedSeriesId: 'costs' });
    runFrames();
    expect(normalizedHtml(b.container)).not.toBe(baseline);
    expect(normalizedHtml(b.container)).toBe(normalizedHtml(directlyFocused.container));

    a.chart.destroy();
  });

  // Regression: reconcile-driven events fired at the PREVIOUS props' callbacks,
  // so a host replacing its closures in the render that changed the data (the
  // framework-adapter norm) had the stale closure notified and the new one skipped.
  it('notifies the callbacks committed in the same update, not the replaced ones', () => {
    const { createChart, enhanceConfig, ArrayOfObjectsDataProvider } = mochart;
    const mochartConfig = enhanceConfig({
      version: '1.0.0',
      animation: { animate: false },
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
      series: [{ id: 'sales', property: 'sales', renderer: 'line' }]
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const staleFocus = vi.fn();
    const freshFocus = vi.fn();
    const props = {
      mochartConfig,
      dataProvider: new ArrayOfObjectsDataProvider(data, 'month'),
      width: 300,
      height: 200,
      onFocus: staleFocus
    };
    const chart = createChart(container, { ...props, focusedCategoryIndex: 1 });
    runFrames();
    chart.replace(props); // release the controlled value, keeping internal focus on Feb

    // one update swaps the data AND the callback, as a framework re-render does
    const [jan, feb, mar] = data;
    chart.update({
      dataProvider: new ArrayOfObjectsDataProvider([feb, jan, mar], 'month'),
      onFocus: freshFocus
    });
    runFrames();

    expect(staleFocus).not.toHaveBeenCalled();
    expect(freshFocus).toHaveBeenCalledTimes(1);
    expect(freshFocus).toHaveBeenCalledWith(expect.objectContaining({ focusedCategoryIndex: 0 }));
    chart.destroy();
  });
});
