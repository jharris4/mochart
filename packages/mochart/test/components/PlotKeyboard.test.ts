/**
 * Keyboard accessibility of the plot area: the series-area rect is a tab stop
 * exposed as a button — Enter/Space toggles the tooltip (aria-expanded tracks
 * it), arrows step the shown category, Home/End jump to the ends, and Escape
 * closes. Reopening returns to the last shown category.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const rows = [
  { month: 'Jan', sales: 10, costs: 5 },
  { month: 'Feb', sales: 20, costs: 8 },
  { month: 'Mar', sales: 15, costs: 6 }
];

function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [
      { id: 'S0', property: 'sales' },
      { id: 'S1', property: 'costs' }
    ],
    ...overrides
  } as unknown as MochartInputConfig;
}

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  handles.push(createDefaultChart(container, { config, data: rows, width: 800, height: 600 }));
  return container;
}

function plotRect(container: Element): SVGElement {
  const rect = container.querySelector<SVGElement>('.mochart-series-background rect');
  expect(rect).not.toBeNull();
  return rect!;
}

function tooltipText(container: Element): string {
  return container.querySelector('.mochart-tooltip')?.textContent ?? '';
}

function liveText(container: Element): string {
  return container.querySelector('[role="status"]')?.textContent ?? '';
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

describe('plot keyboard semantics', () => {
  it('exposes the series-area rect as a collapsed button tab stop', () => {
    const container = mountChart(makeConfig());
    const rect = plotRect(container);
    expect(rect.getAttribute('tabindex')).toBe('0');
    expect(rect.getAttribute('role')).toBe('button');
    expect(rect.getAttribute('aria-label')).toBe('Chart values');
    expect(rect.getAttribute('aria-expanded')).toBe('false');
  });

  it('has no keyboard semantics when chart accessibility is disabled', () => {
    const container = mountChart(makeConfig({ accessibility: { enabled: false } }));
    const rect = plotRect(container);
    expect(rect.getAttribute('tabindex')).toBeNull();
    expect(rect.getAttribute('role')).toBeNull();
    expect(rect.getAttribute('aria-label')).toBeNull();
    expect(rect.getAttribute('aria-expanded')).toBeNull();

    key(rect, 'Enter');
    expect(tooltipText(container)).toBe('');
  });

  it('has no keyboard semantics when the tooltip and crosshair are hidden', () => {
    const container = mountChart(makeConfig({ tooltip: { visible: false }, crosshair: { visible: false } }));
    const rect = plotRect(container);
    expect(rect.getAttribute('tabindex')).toBeNull();
    expect(rect.getAttribute('role')).toBeNull();
    expect(rect.getAttribute('aria-expanded')).toBeNull();
  });

  it('toggles the tooltip with Enter and Space and closes with Escape', () => {
    const container = mountChart(makeConfig());
    const rect = plotRect(container);
    expect(tooltipText(container)).toBe('');

    key(rect, 'Enter');
    expect(rect.getAttribute('aria-expanded')).toBe('true');
    expect(tooltipText(container)).toContain('Jan');

    key(rect, 'Escape');
    expect(rect.getAttribute('aria-expanded')).toBe('false');
    expect(tooltipText(container)).toBe('');

    key(rect, ' ');
    expect(rect.getAttribute('aria-expanded')).toBe('true');

    key(rect, ' ');
    expect(rect.getAttribute('aria-expanded')).toBe('false');
  });

  it('steps the shown category with arrows, clamped, and jumps with Home/End', () => {
    const container = mountChart(makeConfig());
    const rect = plotRect(container);

    key(rect, 'Enter');
    expect(tooltipText(container)).toContain('Jan');

    key(rect, 'ArrowRight');
    expect(tooltipText(container)).toContain('Feb');

    key(rect, 'End');
    expect(tooltipText(container)).toContain('Mar');

    // clamped at the last category
    key(rect, 'ArrowDown');
    expect(tooltipText(container)).toContain('Mar');

    key(rect, 'ArrowLeft');
    expect(tooltipText(container)).toContain('Feb');

    key(rect, 'Home');
    expect(tooltipText(container)).toContain('Jan');

    // clamped at the first category
    key(rect, 'ArrowUp');
    expect(tooltipText(container)).toContain('Jan');
  });

  it('keeps arrows inert on a single-category chart, where Enter still toggles', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    handles.push(createDefaultChart(container, {
      config: makeConfig({ chart: { type: 'pie' } }), data: [rows[0]], width: 800, height: 600
    }));
    const rect = plotRect(container);

    key(rect, 'ArrowRight');
    key(rect, 'Home');
    expect(rect.getAttribute('aria-expanded')).toBe('false');

    key(rect, 'Enter');
    expect(rect.getAttribute('aria-expanded')).toBe('true');
  });

  it('announces the tooltip values while navigating with the keyboard', () => {
    const container = mountChart(makeConfig());
    const rect = plotRect(container);
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    expect(liveText(container)).toBe('');

    key(rect, 'Enter');
    expect(liveText(container)).toBe('Jan: Series S0: 10.00, Series S1: 5.00');

    key(rect, 'ArrowRight');
    expect(liveText(container)).toBe('Feb: Series S0: 20.00, Series S1: 8.00');

    key(rect, 'End');
    expect(liveText(container)).toBe('Mar: Series S0: 15.00, Series S1: 6.00');

    // clamped at the last category: nothing new to announce
    key(rect, 'ArrowRight');
    expect(liveText(container)).toBe('Mar: Series S0: 15.00, Series S1: 6.00');

    key(rect, 'Escape');
    expect(liveText(container)).toBe('');
  });

  it('has no live region when chart accessibility is disabled', () => {
    const container = mountChart(makeConfig({ accessibility: { enabled: false } }));
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  // Regression: loading used to strip the rect's tabindex, dropping keyboard
  // focus to <body> mid-refresh and desyncing aria-expanded from the tooltip.
  it('keeps the tab stop while loading and pauses stepping like pointer events', () => {
    const container = mountChart(makeConfig());
    const handle = handles[handles.length - 1];
    const rect = plotRect(container);

    key(rect, 'Enter');
    key(rect, 'ArrowRight');
    expect(tooltipText(container)).toContain('Feb');

    handle.update({ loading: true });
    expect(rect.getAttribute('tabindex')).toBe('0');
    expect(rect.getAttribute('role')).toBe('button');
    expect(rect.getAttribute('aria-expanded')).toBe('true');

    key(rect, 'ArrowRight');
    expect(tooltipText(container)).toContain('Feb');
    key(rect, 'Enter');
    expect(rect.getAttribute('aria-expanded')).toBe('true');

    handle.update({ loading: false });
    key(rect, 'ArrowRight');
    expect(tooltipText(container)).toContain('Mar');
  });

  it('still closes the tooltip with Escape while loading', () => {
    const container = mountChart(makeConfig());
    const handle = handles[handles.length - 1];
    const rect = plotRect(container);

    key(rect, 'Enter');
    handle.update({ loading: true });
    key(rect, 'Escape');
    expect(rect.getAttribute('aria-expanded')).toBe('false');
    expect(tooltipText(container)).toBe('');
  });

  it('opens on arrows when closed and reopens at the last shown category', () => {
    const container = mountChart(makeConfig());
    const rect = plotRect(container);

    key(rect, 'ArrowRight');
    expect(rect.getAttribute('aria-expanded')).toBe('true');
    expect(tooltipText(container)).toContain('Jan');

    key(rect, 'ArrowRight');
    expect(tooltipText(container)).toContain('Feb');

    key(rect, 'Escape');
    expect(tooltipText(container)).toBe('');

    key(rect, 'Enter');
    expect(tooltipText(container)).toContain('Feb');
  });
});
