// The pie tooltip's aria-live announcement speaks the same renormalized percentages the visible rows show
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import { createPie } from '../../src/data/Pie';
import { getCssClass, getCssSelector, getIdCssSelector, getCssClassMatchSelector } from '../../src/utils/ChartDom';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import type { DataRow } from '../../src/types/data';
import type { PieItem, CreatePieOptions } from '../../src/data/Pie';

const WIDTH = 800;
const HEIGHT = 600;

const ITEMS: PieItem[] = [
  { label: 'Chrome', value: 62 },
  { label: 'Safari', value: 20 },
  { label: 'Firefox', value: 18 }
];

// base class plus id prefix: the series-* and legend-item-* classes carry both
const PLOT_RECT_SELECTOR = getCssSelector('seriesBackground') + ' rect';
const LIVE_REGION_SELECTOR = '[role="status"]';

function pieConfigAndData(options: CreatePieOptions, configOverrides: Record<string, unknown> = {}): { config: MochartInputConfig; data: readonly DataRow[] } {
  const pie = createPie(ITEMS, options);
  const config = {
    version: '1.0.0',
    animation: { animate: false },
    chart: pie.chart,
    pie: pie.pie,
    categoryAxis: pie.categoryAxis,
    series: pie.series,
    ...configOverrides
  } as unknown as MochartInputConfig;
  return { config, data: pie.data };
}

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig, data: readonly DataRow[]): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  handles.push(createDefaultChart(container, { config, data, width: WIDTH, height: HEIGHT }));
  return container;
}

function plotRect(container: Element): SVGElement {
  const rect = container.querySelector<SVGElement>(PLOT_RECT_SELECTOR);
  expect(rect).not.toBeNull();
  return rect!;
}

function liveText(container: Element): string {
  return container.querySelector(LIVE_REGION_SELECTOR)?.textContent ?? '';
}

function tooltipRows(container: Element): string[] {
  return Array.from(container.querySelectorAll(getCssSelector('tooltip') + ' ' + getCssClassMatchSelector(getCssClass('tooltipSeriesLine'))))
    .map(line => line.textContent ?? '');
}

function filterSeries(container: Element, seriesId: string): void {
  container.querySelector(getIdCssSelector('legendItem', seriesId))!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function key(target: Element, keyValue: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: keyValue, bubbles: true, cancelable: true }));
}

beforeAll(() => {
  installSvgMeasurementShims();
  // jsdom lacks focus() on SVG elements; route it through the shared focus bookkeeping
  const svgProto = SVGElement.prototype as unknown as { focus?: () => void };
  if (typeof svgProto.focus !== 'function') {
    svgProto.focus = HTMLElement.prototype.focus;
  }
});

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
});

describe('pie tooltip announcement', () => {
  it('speaks the slice percentages the visible rows show', () => {
    const { config, data } = pieConfigAndData({ tooltipValues: 'valuePercent', valueFormat: ',.0f' });
    const container = mountChart(config, data);
    expect(liveText(container)).toBe('');

    key(plotRect(container), 'Enter');
    expect(liveText(container)).toBe('Chrome: 62 (62.0%), Safari: 20 (20.0%), Firefox: 18 (18.0%)');
    expect(tooltipRows(container)).toEqual(['Chrome: 62 (62.0%)', 'Safari: 20 (20.0%)', 'Firefox: 18 (18.0%)']);

    key(plotRect(container), 'Escape');
    expect(liveText(container)).toBe('');
  });

  it('speaks percent-only values without falling back to the raw slice values', () => {
    const { config, data } = pieConfigAndData({ tooltipValues: 'percent' });
    const container = mountChart(config, data);

    key(plotRect(container), 'Enter');
    expect(liveText(container)).toBe('Chrome: 62.0%, Safari: 20.0%, Firefox: 18.0%');
  });

  it('renormalizes the announced percentages against the unfiltered slices', () => {
    const { config, data } = pieConfigAndData({ tooltipValues: 'percent' }, { tooltip: { hideFiltered: true } });
    const container = mountChart(config, data);
    filterSeries(container, 'slice0');
    expect(container.querySelectorAll(getIdCssSelector('series', 'slice0'))).toHaveLength(0);

    key(plotRect(container), 'Enter');
    // Safari 20 and Firefox 18 now split the whole circle, as PieRender asserts for the visible rows
    expect(liveText(container)).toBe('Safari: 52.6%, Firefox: 47.4%');
    expect(tooltipRows(container)).toEqual(['Safari: 52.6%', 'Firefox: 47.4%']);
  });

  it('speaks the full-total shares when adjustForFiltering is off', () => {
    const { config, data } = pieConfigAndData({ tooltipValues: 'percent' },
      { tooltip: { hideFiltered: true, adjustForFiltering: false } });
    const container = mountChart(config, data);
    filterSeries(container, 'slice0');

    key(plotRect(container), 'Enter');
    expect(liveText(container)).toBe('Safari: 20.0%, Firefox: 18.0%');
  });
});
