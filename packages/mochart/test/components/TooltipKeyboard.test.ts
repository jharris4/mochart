/**
 * Keyboard accessibility of the tooltip: per-series and category rows are
 * buttons with a roving tab stop whenever clicking them does something —
 * arrows move between rows, Enter/Space acts like a click, aria-pressed
 * tracks filtering (pressed = series shown) — and Escape anywhere inside
 * the tooltip closes it and hands focus back to the plot tab stop.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { ChartFocus, DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { month: 'Jan', sales: 10, costs: 5 },
  { month: 'Feb', sales: 20, costs: 8 },
  { month: 'Mar', sales: 30, costs: 13 }
];

function makeConfig(tooltip: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    tooltip,
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [
      { id: 'S0', property: 'sales' },
      { id: 'S1', property: 'costs' }
    ],
    ...overrides
  } as unknown as MochartInputConfig;
}

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig, callbacks: Partial<DefaultChartProps> = {}): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config, data: rows, width: WIDTH, height: HEIGHT, ...callbacks
  } as DefaultChartProps);
  handles.push(handle);
  return container;
}

function chartRoot(container: Element): Element {
  return container.querySelector('[data-mochart-version]')!;
}

function mouse(target: Element, type: string, clientX: number, clientY: number): void {
  target.dispatchEvent(new MouseEvent(type, { clientX, clientY, bubbles: true }));
}

function openTooltip(container: Element): void {
  const root = chartRoot(container);
  mouse(root, 'mouseenter', 100, 100);
  mouse(root, 'click', 100, 100);
  expect(container.querySelector('.mochart-tooltip')).not.toBeNull();
}

/** interactive rows of the visible tooltip copy, in DOM order */
function tooltipRows(container: Element): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.mochart-tooltip [data-row-key]'));
}

function key(target: Element, keyValue: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: keyValue, bubbles: true, cancelable: true }));
}

function modeButton(container: Element): HTMLElement {
  return Array.from(container.querySelectorAll<HTMLElement>('.mochart-tooltip button'))
    .find(button => button.textContent === 'Filter' || button.textContent === 'Focus')!;
}

beforeAll(() => {
  installSvgMeasurementShims();
  // jsdom lacks focus() on SVG elements; route it through the shared focus bookkeeping
  const svgProto = SVGElement.prototype as unknown as { focus?: () => void };
  if (typeof svgProto.focus !== 'function') {
    svgProto.focus = HTMLElement.prototype.focus;
  }
  // jsdom reports zero-size rects; report the mounted chart size instead so
  // the chart's pointer hit-testing (clientX/Y relative to the plot rect) works
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    return {
      x: 0, y: 0, left: 0, top: 0, right: WIDTH, bottom: HEIGHT,
      width: WIDTH, height: HEIGHT, toJSON: () => ({})
    } as DOMRect;
  });
});

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
});

describe('tooltip row keyboard semantics', () => {
  it('exposes series rows as toggle buttons with one roving tab stop in filter mode', () => {
    const container = mountChart(makeConfig({ showControls: true }));
    openTooltip(container);

    const seriesRows = tooltipRows(container);
    // filter mode: the two series rows act, the category row does not
    expect(seriesRows.map(row => row.getAttribute('data-row-key'))).toEqual(['series-S0', 'series-S1']);
    for (const row of seriesRows) {
      expect(row.getAttribute('role')).toBe('button');
      expect(row.getAttribute('aria-pressed')).toBe('true'); // pressed = shown
    }
    expect(seriesRows.map(row => row.getAttribute('tabindex'))).toEqual(['0', '-1']);

    // the hidden sizer copy must not carry tab stops
    expect(container.querySelectorAll('.mochart-tooltip-sizer [tabindex], .mochart-tooltip-sizer [data-row-key]').length).toBe(0);
  });

  it('has no row semantics when clicking does nothing, or with accessibility disabled', () => {
    const plain = mountChart(makeConfig());
    openTooltip(plain);
    expect(tooltipRows(plain).length).toBe(0);

    const disabled = mountChart(makeConfig({ showControls: true }, { accessibility: { enabled: false } }));
    openTooltip(disabled);
    expect(tooltipRows(disabled).length).toBe(0);
    expect(disabled.querySelectorAll('.mochart-tooltip [tabindex], .mochart-tooltip [role="button"]').length).toBe(0);
  });

  it('takes the control buttons out of the tab order on a decorative-hidden chart', () => {
    const container = mountChart(makeConfig({ showControls: true }, { accessibility: { hidden: true } }));
    openTooltip(container);
    const buttons = Array.from(container.querySelectorAll<HTMLElement>('.mochart-tooltip button'));
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button.getAttribute('tabindex')).toBe('-1');
    }
  });

  it('makes series rows interactive through filterSeriesOnClick without the controls', () => {
    const container = mountChart(makeConfig({ filterSeriesOnClick: true }));
    openTooltip(container);
    expect(tooltipRows(container).map(row => row.getAttribute('data-row-key'))).toEqual(['series-S0', 'series-S1']);
  });

  it('toggles filtering with Enter and Space and updates aria-pressed', () => {
    const container = mountChart(makeConfig({ showControls: true }));
    openTooltip(container);

    expect(container.querySelectorAll('.mochart-series').length).toBe(2);
    key(tooltipRows(container)[0], 'Enter');
    expect(container.querySelectorAll('.mochart-series').length).toBe(1);
    expect(tooltipRows(container)[0].getAttribute('aria-pressed')).toBe('false');

    key(tooltipRows(container)[0], ' ');
    expect(container.querySelectorAll('.mochart-series').length).toBe(2);
    expect(tooltipRows(container)[0].getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps keyboard focus inside the tooltip when hideFiltered unmounts the acted-on row', () => {
    const container = mountChart(makeConfig({ showControls: true, hideFiltered: true }));
    openTooltip(container);

    const first = tooltipRows(container)[0];
    first.focus();
    key(first, 'Enter');
    expect(document.activeElement).not.toBe(document.body);
    expect((document.activeElement as HTMLElement).getAttribute('data-row-key')).toBe('series-S1');
  });

  it('adds the category row and focuses on Enter in focus mode', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(makeConfig({ showControls: true }), {
      onFocus: focus => { focuses.push(focus); }
    });
    openTooltip(container);

    modeButton(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modeButton(container).textContent).toBe('Focus');

    const rowKeys = tooltipRows(container).map(row => row.getAttribute('data-row-key'));
    expect(rowKeys).toEqual(['category', 'series-S0', 'series-S1']);
    // focus mode does not filter, so rows lose the toggle-button pressed state
    expect(tooltipRows(container)[1].getAttribute('aria-pressed')).toBeNull();

    key(tooltipRows(container)[1], 'Enter');
    expect(focuses[focuses.length - 1].focusedSeriesId).toBe('S0');

    key(tooltipRows(container)[0], 'Enter');
    expect(focuses[focuses.length - 1].focusedCategoryIndex).toBe(-1); // toggled off (was focused category 0)
  });

  it('focuses the series from hover and keyboard focus in filter mode', () => {
    const focuses: ChartFocus[] = [];
    const container = mountChart(makeConfig({ showControls: true }), {
      onFocus: focus => { focuses.push(focus); }
    });
    openTooltip(container);

    const rowS0 = container.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-S0"]')!;
    rowS0.dispatchEvent(new MouseEvent('mouseenter'));
    expect(focuses[focuses.length - 1].focusedSeriesId).toBe('S0');
    rowS0.dispatchEvent(new MouseEvent('mouseleave'));
    expect(focuses[focuses.length - 1].focusedSeriesId).toBe(null);

    // keyboard focus mirrors hover
    tooltipRows(container)[0].focus();
    expect(focuses[focuses.length - 1].focusedSeriesId).toBe('S0');
    tooltipRows(container)[1].focus(); // focusout clears, focusin refocuses
    expect(focuses[focuses.length - 1].focusedSeriesId).toBe('S1');
    (document.activeElement as HTMLElement).blur();
    expect(focuses[focuses.length - 1].focusedSeriesId).toBe(null);
  });

  it('respects series filterable like the legend', () => {
    const container = mountChart(makeConfig({ showControls: true }, {
      series: [
        { id: 'S0', property: 'sales' },
        { id: 'S1', property: 'costs', filterable: false }
      ]
    }));
    openTooltip(container);

    // filter mode: the non-filterable series' row is not interactive
    expect(tooltipRows(container).map(row => row.getAttribute('data-row-key'))).toEqual(['series-S0']);

    // and clicking it does not filter the series out of the chart
    expect(container.querySelectorAll('.mochart-series').length).toBe(2);
    container.querySelector('.mochart-tooltip [class*="mochart-tooltip-series-line-S1"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(container.querySelectorAll('.mochart-series').length).toBe(2);

    // focus mode does not filter, so both rows act again
    openTooltip(container); // the no-op click above bubbled to closeOnClick
    modeButton(container).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(tooltipRows(container).map(row => row.getAttribute('data-row-key')))
      .toEqual(['category', 'series-S0', 'series-S1']);
  });

  it('moves focus and the roving tab stop with arrow keys', () => {
    const container = mountChart(makeConfig({ showControls: true }));
    openTooltip(container);

    const rows = tooltipRows(container);
    rows[0].focus();

    key(rows[0], 'ArrowDown');
    expect(document.activeElement).toBe(rows[1]);
    expect(tooltipRows(container).map(row => row.getAttribute('tabindex'))).toEqual(['-1', '0']);

    // clamped at the last row
    key(rows[1], 'ArrowRight');
    expect(document.activeElement).toBe(rows[1]);

    key(rows[1], 'Home');
    expect(document.activeElement).toBe(rows[0]);
    expect(tooltipRows(container).map(row => row.getAttribute('tabindex'))).toEqual(['0', '-1']);
  });

  it('closes on Escape anywhere inside and returns focus to the plot tab stop', () => {
    const container = mountChart(makeConfig({ showControls: true }));
    openTooltip(container);

    const first = tooltipRows(container)[0];
    first.focus();
    key(first, 'Escape');

    expect(container.querySelector('.mochart-tooltip')).toBeNull();
    const plotRect = container.querySelector('.mochart-series-background rect[tabindex]');
    expect(plotRect).not.toBeNull();
    expect(document.activeElement).toBe(plotRect);
  });
});

describe('tooltip control buttons', () => {
  it('labels the step buttons and disables them at the ends via aria-disabled', () => {
    const container = mountChart(makeConfig({ showControls: true }));
    openTooltip(container);

    const buttons = () => Array.from(container.querySelectorAll<HTMLElement>('.mochart-tooltip button'));
    const prev = () => buttons().find(button => button.textContent === '‹')!;
    const next = () => buttons().find(button => button.textContent === '›')!;

    expect(prev().getAttribute('aria-label')).toBe('Previous category');
    expect(next().getAttribute('aria-label')).toBe('Next category');

    // opened at the first category: prev is inert but still focusable
    expect(prev().getAttribute('aria-disabled')).toBe('true');
    expect(next().getAttribute('aria-disabled')).toBeNull();
    expect(prev().hasAttribute('disabled')).toBe(false);

    next().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(prev().getAttribute('aria-disabled')).toBeNull();

    next().dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(next().getAttribute('aria-disabled')).toBe('true');
  });

  it('localizes the labels and mode words through the config', () => {
    const container = mountChart(makeConfig(
      { showControls: true, filterModeText: 'Filtern', focusModeText: 'Fokus' },
      { accessibility: { tooltipPreviousLabel: 'Vorherige Kategorie', tooltipNextLabel: 'Nächste Kategorie' } }
    ));
    openTooltip(container);

    const buttons = Array.from(container.querySelectorAll<HTMLElement>('.mochart-tooltip button'));
    expect(buttons.some(button => button.getAttribute('aria-label') === 'Vorherige Kategorie')).toBe(true);
    expect(buttons.some(button => button.getAttribute('aria-label') === 'Nächste Kategorie')).toBe(true);
    const mode = buttons.find(button => button.textContent === 'Filtern')!;
    expect(mode).toBeDefined();
    mode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(buttons.some(button => button.textContent === 'Fokus')).toBe(true);
  });
});
