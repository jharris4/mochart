/**
 * Screen-reader semantics of the chart root: the svg is a labeled group
 * (named from the title config) announced as a chart, and the decorative
 * geometry — axes/grid, series shapes, crosshair — is aria-hidden so
 * assistive tech lands on the meaningful stops (plot button, legend,
 * tooltip) instead of unlabeled shapes.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const rows = [
  { month: 'Jan', sales: 10, costs: 5 },
  { month: 'Feb', sales: 20, costs: 8 }
];

function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    legend: { visible: true },
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

beforeAll(() => {
  installSvgMeasurementShims();
});

afterEach(() => {
  for (const handle of handles) {
    handle.destroy();
  }
  handles = [];
  document.body.innerHTML = '';
});

describe('chart aria semantics', () => {
  it('labels the svg as a chart group named from the title', () => {
    const container = mountChart(makeConfig({ title: { text: 'Monthly sales' } }));
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('group');
    expect(svg.getAttribute('aria-roledescription')).toBe('chart');
    expect(svg.getAttribute('aria-label')).toBe('Monthly sales');
  });

  it('falls back to a generic name when there is no title', () => {
    const container = mountChart(makeConfig());
    expect(container.querySelector('svg')!.getAttribute('aria-label')).toBe('Chart');
  });

  // Regression: '' is a valid title text and produced aria-label=""
  it('falls back to a generic name when the title text is empty', () => {
    const container = mountChart(makeConfig({ title: { text: '' } }));
    expect(container.querySelector('svg')!.getAttribute('aria-label')).toBe('Chart');
  });

  it('hides the decorative geometry from assistive tech', () => {
    const container = mountChart(makeConfig());
    for (const selector of ['.mochart-plot-back', '.mochart-plot-front', '.mochart-crosshair']) {
      const el = container.querySelector(selector);
      expect(el, selector).not.toBeNull();
      expect(el!.getAttribute('aria-hidden'), selector).toBe('true');
    }
    const seriesGroups = container.querySelectorAll('.mochart-series');
    expect(seriesGroups.length).toBe(2);
    for (const group of seriesGroups) {
      expect(group.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('keeps the interactive stops outside the hidden regions', () => {
    const container = mountChart(makeConfig());
    const plotRect = container.querySelector('.mochart-series-background rect')!;
    expect(plotRect.getAttribute('tabindex')).toBe('0');
    expect(plotRect.closest('[aria-hidden="true"]')).toBeNull();

    const legendItem = container.querySelector('[data-series-id]')!;
    expect(legendItem.closest('[aria-hidden="true"]')).toBeNull();
  });

  it('hides pie slices from assistive tech', () => {
    const container = mountChart(makeConfig({ chart: { type: 'pie' } }));
    const slices = container.querySelectorAll('.mochart-series');
    expect(slices.length).toBe(2);
    for (const slice of slices) {
      expect(slice.getAttribute('aria-hidden')).toBe('true');
    }
    expect(container.querySelector('svg')!.getAttribute('role')).toBe('group');
  });

  it('tags the chart root with the accessible state class only when enabled', () => {
    const onContainer = mountChart(makeConfig());
    expect(onContainer.querySelector('.mochart-chart')!.classList.contains('mochart-accessible')).toBe(true);

    const offContainer = mountChart(makeConfig({ accessibility: { enabled: false } }));
    expect(offContainer.querySelector('.mochart-chart')!.classList.contains('mochart-accessible')).toBe(false);
  });

  it('renders without any aria semantics when chart accessibility is disabled', () => {
    const container = mountChart(makeConfig({ title: { text: 'Monthly sales' }, accessibility: { enabled: false } }));
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBeNull();
    expect(svg.getAttribute('aria-roledescription')).toBeNull();
    expect(svg.getAttribute('aria-label')).toBeNull();
    expect(container.querySelectorAll('[aria-hidden], [role], [tabindex], [aria-label]').length).toBe(0);
  });

  it('renders a pie without any aria semantics when chart accessibility is disabled', () => {
    const container = mountChart(makeConfig({ chart: { type: 'pie' }, accessibility: { enabled: false } }));
    expect(container.querySelectorAll('.mochart-series').length).toBe(2);
    expect(container.querySelectorAll('[aria-hidden], [role], [tabindex], [aria-label]').length).toBe(0);
  });
});
