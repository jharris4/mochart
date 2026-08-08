/**
 * Pie/donut rendering tests: chartConfig.type 'pie' mounts RadialPlot (slices,
 * no axes/crosshair), slices renormalize when a series is filtered, labels
 * respect labelMinFraction, and animated value updates settle on a fake
 * clock (same technique as the golden suite).
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { DeepPartial, MochartInputConfig, PieConfig } from '../../src/types/config';
import type { PieItem, CreatePieOptions } from '../../src/data/Pie';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;
const FRAME_MS = 16;
const MAX_FRAMES = 500;

const ITEMS: PieItem[] = [
  { label: 'Chrome', value: 62 },
  { label: 'Safari', value: 20 },
  { label: 'Firefox', value: 18 }
];

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

function pieChartProps(items: PieItem[], options: CreatePieOptions = {}, configOverrides: Record<string, unknown> = {}): { config: MochartInputConfig; data: readonly unknown[] } {
  const pie = mochart.createPie(items, options);
  const config = {
    version: VERSION,
    animation: { animate: false },
    chart: pie.chart,
    pie: pie.pie,
    categoryAxis: pie.categoryAxis,
    series: pie.series,
    ...configOverrides
  } as unknown as MochartInputConfig;
  return { config, data: pie.data };
}

function mountChart(config: MochartInputConfig, data: readonly unknown[], extraProps: Partial<DefaultChartProps> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = mochart.createDefaultChart(container, {
    config, data, width: WIDTH, height: HEIGHT, ...extraProps
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

function slicePaths(container: Element): Element[] {
  return Array.from(container.querySelectorAll('.mochart-series-slice'));
}

function mouse(target: Element, type: string, clientX: number, clientY: number): void {
  target.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }));
}

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
  vi.clearAllTimers();
});

describe('pie chart rendering', () => {
  it('mounts a radial plot with one slice path per series and no axes or crosshair', () => {
    const { config, data } = pieChartProps(ITEMS);
    const { container } = mountChart(config, data);
    expect(container.querySelector('.mochart-radial-plot')).not.toBeNull();
    expect(slicePaths(container)).toHaveLength(3);
    expect(container.querySelectorAll('.mochart-series')).toHaveLength(3);
    expect(container.querySelector('.mochart-crosshair')).toBeNull();
    expect(container.querySelector('.mochart-axis-line')).toBeNull();
    expect(container.querySelector('.mochart-legend')).not.toBeNull();
  });

  it('sets the pointer cursor on a slice series root only when configured', () => {
    const { config, data } = pieChartProps(ITEMS);
    (config.series as Array<Record<string, unknown>>)[0]!.showPointer = true;
    const { container } = mountChart(config, data);
    const roots = container.querySelectorAll('.mochart-series');
    expect(roots).toHaveLength(3);
    expect(roots[0]!.getAttribute('cursor')).toBe('pointer');
    expect(roots[1]!.getAttribute('cursor')).toBeNull();
  });

  it('renders a donut with a different arc path than a pie', () => {
    const pie = mountChart(...Object.values(pieChartProps(ITEMS)) as [MochartInputConfig, readonly unknown[]]);
    const { config, data } = pieChartProps(ITEMS, { donut: true });
    const donut = mountChart(config, data);
    const pieD = slicePaths(pie.container)[0]!.getAttribute('d');
    const donutD = slicePaths(donut.container)[0]!.getAttribute('d');
    expect(pieD).toBeTruthy();
    expect(donutD).toBeTruthy();
    expect(donutD).not.toBe(pieD);
  });

  it('shows labels when enabled and hides those under labelMinFraction', () => {
    const items: PieItem[] = [
      { label: 'Big', value: 98 },
      { label: 'Tiny', value: 2 }
    ];
    const { config, data } = pieChartProps(items, {}, {
      pie: { showLabels: true, labelType: 'percent', labelMinFraction: 0.05 } as Partial<PieConfig>
    });
    const { container } = mountChart(config, data);
    const labels = Array.from(container.querySelectorAll('.mochart-series-slice-label'));
    expect(labels).toHaveLength(1);
    expect(labels[0]!.textContent).toBe('98%');
  });

  it('removes a filtered slice and renormalizes the remaining slices', () => {
    const { config, data } = pieChartProps(ITEMS);
    const unfiltered = mountChart(config, data);
    const filtered = mountChart(config, data, { filteredSeriesIds: { slice0: true } });
    expect(slicePaths(unfiltered.container)).toHaveLength(3);
    const remaining = slicePaths(filtered.container);
    expect(remaining).toHaveLength(2);
    // with slice0 (62) gone, safari (20) + firefox (18) split the full circle,
    // so their paths must differ from the unfiltered render
    const before = slicePaths(unfiltered.container).map((path) => path.getAttribute('d'));
    const after = remaining.map((path) => path.getAttribute('d'));
    expect(after[0]).not.toBe(before[1]);
  });

  it('filters a slice via a legend item click', () => {
    const { config, data } = pieChartProps(ITEMS);
    const { container } = mountChart(config, data);
    expect(slicePaths(container)).toHaveLength(3);
    const legendItem = container.querySelector('[class*="mochart-legend-item-slice0"]');
    expect(legendItem).not.toBeNull();
    legendItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    runFrames();
    expect(slicePaths(container)).toHaveLength(2);
    legendItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    runFrames();
    expect(slicePaths(container)).toHaveLength(3);
  });

  it('opens a tooltip on click with one row per slice', () => {
    const { config, data } = pieChartProps(ITEMS);
    const { container } = mountChart(config, data);
    const root = container.querySelector('[data-mochart-version]')!;
    expect(container.querySelector('.mochart-tooltip')).toBeNull();
    mouse(root, 'mousemove', WIDTH / 2, HEIGHT / 2);
    mouse(root, 'click', WIDTH / 2, HEIGHT / 2);
    const tooltip = container.querySelector('.mochart-tooltip');
    expect(tooltip).not.toBeNull();
    expect(tooltip!.querySelectorAll('[class*="mochart-tooltip-series-line"]')).toHaveLength(3);
    mouse(root, 'click', WIDTH / 2, HEIGHT / 2);
    expect(container.querySelector('.mochart-tooltip')).toBeNull();
  });

  describe('tooltip values (pieConfig.tooltipValues)', () => {
    function tooltipRows(items: PieItem[], options: CreatePieOptions, extraProps: Partial<DefaultChartProps> = {}): string[] {
      const { config, data } = pieChartProps(items, options);
      const { container } = mountChart(config, data, extraProps);
      const root = container.querySelector('[data-mochart-version]')!;
      mouse(root, 'mousemove', WIDTH / 2, HEIGHT / 2);
      mouse(root, 'click', WIDTH / 2, HEIGHT / 2);
      return Array.from(container.querySelectorAll('.mochart-tooltip [class*="mochart-tooltip-series-line"]'))
        .map(line => line.textContent ?? '');
    }

    it('shows the slice values by default', () => {
      expect(tooltipRows(ITEMS, { valueFormat: ',.0f' })).toEqual(['Chrome: 62', 'Safari: 20', 'Firefox: 18']);
    });

    it('shows each slice\'s share for percent, and both parts for the combinations', () => {
      expect(tooltipRows(ITEMS, { tooltipValues: 'percent' }))
        .toEqual(['Chrome: 62.0%', 'Safari: 20.0%', 'Firefox: 18.0%']);
      expect(tooltipRows(ITEMS, { tooltipValues: 'valuePercent', valueFormat: ',.0f' }))
        .toEqual(['Chrome: 62 (62.0%)', 'Safari: 20 (20.0%)', 'Firefox: 18 (18.0%)']);
      expect(tooltipRows(ITEMS, { tooltipValues: 'percentValue', valueFormat: ',.0f' }))
        .toEqual(['Chrome: 62.0% (62)', 'Safari: 20.0% (20)', 'Firefox: 18.0% (18)']);
    });

    // The inconsistency this option exists to remove: percent slice labels
    // renormalize when a slice is filtered, so the tooltip must too.
    it('renormalizes the percentages against the unfiltered slices, like the labels', () => {
      const rows = tooltipRows(ITEMS, { tooltipValues: 'percent' }, { filteredSeriesIds: { slice0: true } });
      // Safari 20 and Firefox 18 now split the whole circle
      expect(rows[1]).toBe('Safari: 52.6%');
      expect(rows[2]).toBe('Firefox: 47.4%');
    });

    it('freezes the percentages at the full-total shares when adjustForFiltering is off', () => {
      const { config, data } = pieChartProps(ITEMS, { tooltipValues: 'percent' },
        { tooltip: { adjustForFiltering: false } });
      const { container } = mountChart(config, data, { filteredSeriesIds: { slice0: true } });
      const root = container.querySelector('[data-mochart-version]')!;
      mouse(root, 'mousemove', WIDTH / 2, HEIGHT / 2);
      mouse(root, 'click', WIDTH / 2, HEIGHT / 2);
      const rows = Array.from(container.querySelectorAll('.mochart-tooltip [class*="mochart-tooltip-series-line"]'))
        .map(line => line.textContent ?? '');
      expect(rows).toEqual(['Chrome: 62.0%', 'Safari: 20.0%', 'Firefox: 18.0%']);
    });

    it('masks a filtered slice\'s own row with the filtered placeholder', () => {
      const { config, data } = pieChartProps(ITEMS, { tooltipValues: 'percent' },
        { tooltip: { filteredValueText: '--' } });
      const { container } = mountChart(config, data, { filteredSeriesIds: { slice0: true } });
      const root = container.querySelector('[data-mochart-version]')!;
      mouse(root, 'mousemove', WIDTH / 2, HEIGHT / 2);
      mouse(root, 'click', WIDTH / 2, HEIGHT / 2);
      const rows = Array.from(container.querySelectorAll('.mochart-tooltip [class*="mochart-tooltip-series-line"]'))
        .map(line => line.textContent ?? '');
      expect(rows[0]).toBe('Chrome: --');
    });

    it('formats the percent part with tooltipPercentFormat and the value part per series', () => {
      const { config, data } = pieChartProps(ITEMS, { tooltipValues: 'percentValue', valueFormat: ',.1f' });
      // merged, not replaced: the helper's fragment carries tooltipValues
      (config as { pie: DeepPartial<PieConfig> }).pie = { ...config.pie, tooltipPercentFormat: '.0%' };
      const { container } = mountChart(config, data);
      const root = container.querySelector('[data-mochart-version]')!;
      mouse(root, 'mousemove', WIDTH / 2, HEIGHT / 2);
      mouse(root, 'click', WIDTH / 2, HEIGHT / 2);
      const rows = Array.from(container.querySelectorAll('.mochart-tooltip [class*="mochart-tooltip-series-line"]'))
        .map(line => line.textContent ?? '');
      expect(rows[0]).toBe('Chrome: 62% (62.0)');
    });

    it('renders label combinations from the same shares', () => {
      const { config, data } = pieChartProps(ITEMS, {}, {
        pie: { showLabels: true, labelType: 'titlePercent' } as Partial<PieConfig>
      });
      const { container } = mountChart(config, data);
      const labels = Array.from(container.querySelectorAll('.mochart-series-slice-label')).map(label => label.textContent);
      expect(labels).toEqual(['Chrome: 62%', 'Safari: 20%', 'Firefox: 18%']);
    });
  });

  it('leaves the single category value out of the tooltip unless showCategory is set', () => {
    const hidden = pieChartProps(ITEMS, { categoryValue: 'all' });
    const hiddenChart = mountChart(hidden.config, hidden.data);
    const hiddenRoot = hiddenChart.container.querySelector('[data-mochart-version]')!;
    mouse(hiddenRoot, 'mousemove', WIDTH / 2, HEIGHT / 2);
    mouse(hiddenRoot, 'click', WIDTH / 2, HEIGHT / 2);
    const hiddenTooltip = hiddenChart.container.querySelector('.mochart-tooltip')!;
    expect(hiddenTooltip.querySelector('.mochart-tooltip-category-line')).toBeNull();
    expect(hiddenTooltip.textContent).not.toContain('all');

    const shown = pieChartProps(ITEMS, { categoryValue: 'all' }, { tooltip: { showCategory: true } });
    const shownChart = mountChart(shown.config, shown.data);
    const shownRoot = shownChart.container.querySelector('[data-mochart-version]')!;
    mouse(shownRoot, 'mousemove', WIDTH / 2, HEIGHT / 2);
    mouse(shownRoot, 'click', WIDTH / 2, HEIGHT / 2);
    const shownTooltip = shownChart.container.querySelector('.mochart-tooltip')!;
    expect(shownTooltip.querySelector('.mochart-tooltip-category-line')!.textContent).toBe('all');
  });

  it('renders a partial span for gauge configs', () => {
    const full = mountChart(...Object.values(pieChartProps(ITEMS)) as [MochartInputConfig, readonly unknown[]]);
    const { config, data } = pieChartProps(ITEMS, {}, {
      pie: { startAngle: -90, endAngle: 90 } as Partial<PieConfig>
    });
    const gauge = mountChart(config, data);
    const fullD = slicePaths(full.container)[0]!.getAttribute('d');
    const gaugeD = slicePaths(gauge.container)[0]!.getAttribute('d');
    expect(gaugeD).toBeTruthy();
    expect(gaugeD).not.toBe(fullD);
  });

  it('explodes the focused slice by focusOffsetFraction', () => {
    const { config, data } = pieChartProps(ITEMS, {}, {
      pie: { focusOffsetFraction: 0.1 } as Partial<PieConfig>
    });
    const plain = mountChart(config, data);
    const focused = mountChart(config, data, { focusedSeriesId: 'slice0' });
    const transformOf = (container: Element) =>
      container.querySelector('[class*="mochart-series-slice0"]')!.getAttribute('transform');
    expect(transformOf(focused.container)).not.toBe(transformOf(plain.container));
    // unfocused slices keep the centered transform
    const otherTransform = (container: Element) =>
      container.querySelector('[class*="mochart-series-slice1"]')!.getAttribute('transform');
    expect(otherTransform(focused.container)).toBe(otherTransform(plain.container));
  });

  it('renders the center label and a filtering-aware total', () => {
    const { config, data } = pieChartProps(ITEMS, { donut: true }, {
      pie: { innerRadiusFraction: 0.6, centerLabel: 'Total', showCenterTotal: true, centerTotalFormat: ',.0f' } as Partial<PieConfig>
    });
    const { container } = mountChart(config, data);
    expect(container.querySelector('.mochart-pie-center-label')!.textContent).toBe('Total');
    expect(container.querySelector('.mochart-pie-center-total')!.textContent).toBe('100');

    const filtered = mountChart(config, data, { filteredSeriesIds: { slice0: true } });
    expect(filtered.container.querySelector('.mochart-pie-center-total')!.textContent).toBe('38');
  });

  it('keeps percent labels on the full total when adjustLabelsForFiltering is off', () => {
    const labelConfig = (adjust: boolean) => pieChartProps(ITEMS, {}, {
      pie: { showLabels: true, labelType: 'percent', labelMinFraction: 0, adjustLabelsForFiltering: adjust } as Partial<PieConfig>
    });
    const filtered = { filteredSeriesIds: { slice2: true } };

    const adjusted = mountChart(labelConfig(true).config, labelConfig(true).data, filtered);
    const adjustedLabels = Array.from(adjusted.container.querySelectorAll('.mochart-series-slice-label')).map((label) => label.textContent);
    expect(adjustedLabels).toEqual(['76%', '24%']); // renormalized against 62 + 20

    const unadjusted = mountChart(labelConfig(false).config, labelConfig(false).data, filtered);
    const unadjustedLabels = Array.from(unadjusted.container.querySelectorAll('.mochart-series-slice-label')).map((label) => label.textContent);
    expect(unadjustedLabels).toEqual(['62%', '20%']); // shares of the full total
  });

  it('keeps the center total on the full total when adjustCenterTotalForFiltering is off', () => {
    const totalConfig = (adjust: boolean) => pieChartProps(ITEMS, {}, {
      pie: { showCenterTotal: true, centerTotalFormat: ',.0f', adjustCenterTotalForFiltering: adjust } as Partial<PieConfig>
    });
    const filtered = { filteredSeriesIds: { slice0: true } };

    const adjusted = mountChart(totalConfig(true).config, totalConfig(true).data, filtered);
    expect(adjusted.container.querySelector('.mochart-pie-center-total')!.textContent).toBe('38');

    const unadjusted = mountChart(totalConfig(false).config, totalConfig(false).data, filtered);
    expect(unadjusted.container.querySelector('.mochart-pie-center-total')!.textContent).toBe('100');
  });

  it('sweeps in on the initial animation, revealing labels only once settled', () => {
    const pie = mochart.createPie(ITEMS);
    const config = {
      version: VERSION,
      animation: { animate: true },
      chart: pie.chart,
      pie: { showLabels: true, labelMinFraction: 0 },
      categoryAxis: pie.categoryAxis,
      series: pie.series
    } as unknown as MochartInputConfig;
    const { container } = mountChart(config, pie.data);
    // a few frames into the initial sweep: slices exist, labels stay hidden
    for (let frame = 0; frame < 4 && vi.getTimerCount() > 0; frame++) {
      vi.advanceTimersByTime(FRAME_MS);
    }
    expect(slicePaths(container).length).toBeGreaterThan(0);
    const midSweepD = slicePaths(container).map((path) => path.getAttribute('d'));
    expect(container.querySelectorAll('.mochart-series-slice-label')).toHaveLength(0);

    runFrames();
    expect(container.querySelectorAll('.mochart-series-slice-label')).toHaveLength(3);
    const settledD = slicePaths(container).map((path) => path.getAttribute('d'));
    expect(settledD).not.toEqual(midSweepD);
  });

  it('settles animated value updates into new slice angles', () => {
    const pie = mochart.createPie(ITEMS);
    const config = {
      version: VERSION,
      animation: { animate: true },
      chart: pie.chart,
      pie: pie.pie,
      categoryAxis: pie.categoryAxis,
      series: pie.series
    } as unknown as MochartInputConfig;
    const { container, handle } = mountChart(config, pie.data);
    runFrames();
    expect(slicePaths(container)).toHaveLength(3);
    const initial = slicePaths(container).map((path) => path.getAttribute('d'));

    const updated = mochart.createPie([
      { label: 'Chrome', value: 20 },
      { label: 'Safari', value: 60 },
      { label: 'Firefox', value: 20 }
    ]);
    handle.update({ data: updated.data } as Partial<DefaultChartProps>);
    runFrames();
    const settled = slicePaths(container).map((path) => path.getAttribute('d'));
    expect(settled).toHaveLength(3);
    expect(settled[0]).not.toBe(initial[0]);
    expect(settled[1]).not.toBe(initial[1]);
  });
});
