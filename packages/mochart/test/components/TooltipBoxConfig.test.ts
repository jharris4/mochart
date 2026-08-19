// Tooltip box config no test or demo had ever set: adjustSizeForFiltering, border radius, drop shadow colour, row padding, and crosshair.showBehindTooltip.
import { describe, it, expect, beforeAll } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { mountContainer, trackHandle } from './helpers';
import { createDefaultChart } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getCssSelector, getIdCssSelector } from '../../src/utils/ChartDom';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { month: 'Jan', sales: 10, costs: 5 },
  { month: 'Feb', sales: 20, costs: 8 }
];

function mountChart(overrides: Record<string, unknown> = {}): Element {
  const container = mountContainer();
  const config = {
    version: VERSION,
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ id: 'S0', property: 'sales', renderer: 'bar' }, { id: 'S1', property: 'costs', renderer: 'bar' }],
    legend: { visible: true, filterOnClick: true },
    ...overrides
  } as unknown as MochartInputConfig;
  trackHandle(createDefaultChart(container, { config, data: rows, width: WIDTH, height: HEIGHT } as DefaultChartProps));
  return container;
}

function openTooltip(container: Element): void {
  const rect = container.querySelector(getCssSelector('seriesBackground') + ' rect');
  expect(rect).not.toBeNull();
  rect!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
}

function filterSeries(container: Element, seriesId: string): void {
  container.querySelector(getIdCssSelector('legendItem', seriesId))!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** Whether a series has a row in the visible box or in the hidden sizer that reserves its width. */
function hasRow(container: Element, box: 'tooltip' | 'tooltipSizer', seriesId: string): boolean {
  return container.querySelector(getCssSelector(box) + ' ' + getIdCssSelector('tooltipSeriesLine', seriesId)) !== null;
}

function tooltipStyle(container: Element): CSSStyleDeclaration {
  const box = container.querySelector<HTMLElement>(getCssSelector('tooltip'));
  expect(box).not.toBeNull();
  return box!.style;
}

beforeAll(() => {
  installSvgMeasurementShims();
  // jsdom lacks focus() on SVG elements; route it through the shared focus bookkeeping
  const svgProto = SVGElement.prototype as unknown as { focus?: () => void };
  if (typeof svgProto.focus !== 'function') {
    svgProto.focus = HTMLElement.prototype.focus;
  }
});

describe('tooltip size for filtering', () => {
  it('keeps the box sized for a filtered row by default', () => {
    const container = mountChart({ tooltip: { hideFiltered: true } });
    filterSeries(container, 'S0');
    openTooltip(container);

    // the visible box drops the row, but the sizer still reserves the width it had
    expect(hasRow(container, 'tooltip', 'S0')).toBe(false);
    expect(hasRow(container, 'tooltipSizer', 'S0')).toBe(true);
  });

  it('lets the box shrink to the remaining rows when adjustSizeForFiltering is on', () => {
    const container = mountChart({ tooltip: { hideFiltered: true, adjustSizeForFiltering: true } });
    filterSeries(container, 'S0');
    openTooltip(container);

    expect(hasRow(container, 'tooltip', 'S0')).toBe(false);
    expect(hasRow(container, 'tooltipSizer', 'S0')).toBe(false);
    // the rows that are left are in both
    expect(hasRow(container, 'tooltip', 'S1')).toBe(true);
    expect(hasRow(container, 'tooltipSizer', 'S1')).toBe(true);
  });

  it('changes nothing while no series is filtered', () => {
    for (const adjustSizeForFiltering of [false, true]) {
      const container = mountChart({ tooltip: { hideFiltered: true, adjustSizeForFiltering } });
      openTooltip(container);

      expect(hasRow(container, 'tooltipSizer', 'S0')).toBe(true);
      expect(hasRow(container, 'tooltipSizer', 'S1')).toBe(true);
    }
  });
});

describe('tooltip box style', () => {
  it('writes the border radius, drop shadow colour and row padding it is given', () => {
    const container = mountChart({
      tooltip: { borderRadius: 17, dropShadow: { color: 'rgb(1, 2, 3)', offsetX: 4, offsetY: 5, blurRadius: 6 }, linePadding: 19 }
    });
    openTooltip(container);
    const style = tooltipStyle(container);

    expect(style.borderRadius).toBe('17px');
    expect(style.boxShadow).toBe('4px 5px 6px rgb(1, 2, 3)');
    // the last row has no bottom padding, so the gap belongs to every row above it
    const rows = [...container.querySelectorAll<HTMLElement>(getCssSelector('tooltip') + ' ' + getCssSelector('tooltipLines') + ' > *')];
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0].style.paddingBottom).toBe('19px');
    expect(rows[rows.length - 1].style.paddingBottom).not.toBe('19px');
  });

  it('gives a row that becomes the last row the last row bottom padding', () => {
    const container = mountChart({ tooltip: { hideFiltered: true, linePadding: 19 } });
    openTooltip(container);
    const row = container.querySelector<HTMLElement>(getCssSelector('tooltip') + ' ' + getIdCssSelector('tooltipSeriesLine', 'S0'))!;
    expect(row.style.paddingBottom).toBe('19px');
    filterSeries(container, 'S1');
    // the same element is now the last row: it takes a fresh last row's padding, not none
    expect(row.isConnected).toBe(true);
    expect(row.style.paddingBottom).toBe('2px');
  });

  // Regression: minWidth was applied to padded content-box rows, so the visible box was 4px wider than the sizer measured
  it('sizes the visible rows border-box to the measured width', () => {
    const container = mountChart();
    openTooltip(container);
    const rows = [...container.querySelectorAll<HTMLElement>(getCssSelector('tooltip') + ' ' + getCssSelector('tooltipLines') + ' > *')];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.style.boxSizing).toBe('border-box');
      expect(row.style.minWidth).not.toBe('');
    }
  });

  it('draws no border for a null strokeWidth, matching the layout', () => {
    const container = mountChart({ tooltip: { backgroundStyle: { strokeWidth: null } } });
    openTooltip(container);
    expect(tooltipStyle(container).borderWidth).toBe('0px');
  });
});

describe('crosshair behind the tooltip', () => {
  it('clips the crosshair away from under the tooltip by default', () => {
    const container = mountChart({ crosshair: { visible: true } });

    expect(container.querySelector(getCssSelector('crosshair'))!.getAttribute('clip-path')).toMatch(/^url\(#.+\)$/);
  });

  it('drops the clip when showBehindTooltip is on', () => {
    const container = mountChart({ crosshair: { visible: true, showBehindTooltip: true } });

    expect(container.querySelector(getCssSelector('crosshair'))!.getAttribute('clip-path')).toBeNull();
  });
});
