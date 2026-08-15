// Pointer handlers on cartesian series shapes: focusOnMouseOver and focusCategoryOnMouseOver decide whether
// hovering focuses the series, the category, both or neither, and the shapes carry the resulting handlers.
import { describe, it, expect, beforeAll } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { mountContainer, trackHandle, mockBoundingClientRect } from './helpers';
import { createDefaultChart } from '../../src/createChart';
import type { ChartFocus, DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getCssSelector, getIdCssSelector } from '../../src/utils/ChartDom';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { month: 'Jan', sales: 10 },
  { month: 'Feb', sales: 20 },
  { month: 'Mar', sales: 30 }
];

function mountChart(seriesOverrides: Record<string, unknown>, callbacks: Partial<DefaultChartProps> = {}): Element {
  const container = mountContainer();
  const config = {
    version: VERSION,
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'sales', renderer: 'bar', ...seriesOverrides }]
  } as unknown as MochartInputConfig;
  trackHandle(createDefaultChart(container, {
    config, data: rows, width: WIDTH, height: HEIGHT, ...callbacks
  } as DefaultChartProps));
  return container;
}

function bar(container: Element, index: number): Element {
  const shape = container.querySelector(getIdCssSelector('seriesBar', index));
  expect(shape, 'bar ' + index).not.toBeNull();
  return shape!;
}

function mouse(target: Element, type: string): void {
  target.dispatchEvent(new MouseEvent(type, { bubbles: true }));
}

beforeAll(() => {
  installSvgMeasurementShims();
  mockBoundingClientRect(WIDTH, HEIGHT);
});

describe('series shape hover focus', () => {
  it('reports no focus when neither focus-on-hover config is set', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart({}, { onFocus: focus => focuses.push(focus) });

    mouse(bar(container, 1), 'mouseenter');
    mouse(bar(container, 1), 'mouseleave');

    expect(focuses).toEqual([]);
  });

  it('reports no focus from a line series path either', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart({ renderer: 'line' }, { onFocus: focus => focuses.push(focus) });
    const line = container.querySelector(getCssSelector('seriesLine'))!;

    mouse(line, 'mouseenter');
    mouse(line, 'mouseleave');
    mouse(line, 'click');

    expect(focuses).toEqual([]);
  });

  it('focuses the series and the category when both configs are set', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(
      { id: 'sales', focusOnMouseOver: true, focusCategoryOnMouseOver: true },
      { onFocus: focus => focuses.push(focus) });

    mouse(bar(container, 1), 'mouseenter');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedSeriesId: 'sales', focusedCategoryIndex: 1 });

    mouse(bar(container, 1), 'mouseleave');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedSeriesId: null, focusedCategoryIndex: -1 });
  });

  it('focuses only the series when the category config is off', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(
      { id: 'sales', focusOnMouseOver: true, focusCategoryOnMouseOver: false },
      { onFocus: focus => focuses.push(focus) });

    mouse(bar(container, 2), 'mouseenter');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedSeriesId: 'sales', focusedCategoryIndex: -1 });

    mouse(bar(container, 2), 'mouseleave');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedSeriesId: null });
  });

  it('focuses only the category when the series config is off', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(
      { id: 'sales', focusOnMouseOver: false, focusCategoryOnMouseOver: true },
      { onFocus: focus => focuses.push(focus) });

    mouse(bar(container, 0), 'mouseenter');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedSeriesId: null, focusedCategoryIndex: 0 });

    mouse(bar(container, 0), 'mouseleave');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedCategoryIndex: -1 });
  });

  // markers carry the same per-category handlers as bars
  it('focuses a category from a marker, and clicks it', () => {
    const focuses: ChartFocus[] = [];
    const clicks: string[] = [];
    const container = mountChart(
      { id: 'sales', renderer: 'line', markerShape: 'circle', focusCategoryOnMouseOver: true, focusCategoryOnClick: true },
      { onFocus: focus => focuses.push(focus), onSeriesClick: payload => clicks.push(payload.seriesId) });
    const marker = container.querySelector(getIdCssSelector('seriesMarker', '1'))!;
    expect(marker).not.toBeNull();

    mouse(marker, 'mouseenter');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedCategoryIndex: 1 });

    mouse(marker, 'mouseleave');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedCategoryIndex: -1 });

    mouse(marker, 'click');
    expect(clicks).toEqual(['sales']);
  });

  // labels carry the same per-category handlers as bars and markers
  it('focuses a category from a label, and clicks it', () => {
    const focuses: ChartFocus[] = [];
    const clicks: string[] = [];
    const container = mountChart(
      { id: 'sales', labelProperty: 'sales', focusCategoryOnMouseOver: true, focusCategoryOnClick: true },
      { onFocus: focus => focuses.push(focus), onSeriesClick: payload => clicks.push(payload.seriesId) });
    const label = container.querySelector(getIdCssSelector('seriesLabel', '2'))!;
    expect(label).not.toBeNull();

    mouse(label, 'mouseenter');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedCategoryIndex: 2 });

    mouse(label, 'mouseleave');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedCategoryIndex: -1 });

    mouse(label, 'click');
    expect(clicks).toEqual(['sales']);
  });

  // only line/area series have a whole-series shape; bars carry per-category handlers
  it('focuses the series from a line series path', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(
      { id: 'sales', renderer: 'line', focusOnMouseOver: true },
      { onFocus: focus => focuses.push(focus) });
    const line = container.querySelector(getCssSelector('seriesLine'))!;
    expect(line).not.toBeNull();

    mouse(line, 'mouseenter');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedSeriesId: 'sales' });

    mouse(line, 'mouseleave');
    expect(focuses[focuses.length - 1]).toMatchObject({ focusedSeriesId: null });
  });
});
