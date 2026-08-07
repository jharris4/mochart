/**
 * Keyboard accessibility of pie slices: interactive slices (focusOnClick or an
 * onSliceClick handler) are buttons with a roving tab stop — arrows move
 * between slices in config order (the DOM is focus-ordered, so it cannot drive
 * navigation), Enter/Space clicks, and the slice keeps DOM focus even when
 * focusing reorders the slice nodes. Non-interactive slices stay aria-hidden.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { ChartSliceClickPayload, DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const rows = [{ category: 'total', s0: 30, s1: 50, s2: 20 }];

function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    chart: { type: 'pie' },
    categoryAxis: { property: 'category', type: 'string', scale: 'ordinal' },
    series: [
      { id: 'S0', property: 's0', title: 'Subscriptions' },
      { id: 'S1', property: 's1', title: 'Services' },
      { id: 'S2', property: 's2', title: 'Hardware' }
    ],
    ...overrides
  } as unknown as MochartInputConfig;
}

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig, onSliceClick?: (payload: ChartSliceClickPayload) => void): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  handles.push(createDefaultChart(container, { config, data: rows, width: 800, height: 600, onSliceClick }));
  return container;
}

function slices(container: Element): SVGElement[] {
  // config order: the legend also carries data-series-id, so scope to the slice groups
  return ['S0', 'S1', 'S2']
    .map(id => container.querySelector<SVGElement>('.mochart-series-container g[data-series-id="' + id + '"]'))
    .filter((node): node is SVGElement => node !== null);
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

describe('pie slice keyboard semantics', () => {
  it('exposes interactive slices as buttons with one roving tab stop', () => {
    const container = mountChart(makeConfig(), () => {});
    const items = slices(container);
    expect(items.length).toBe(3);
    for (const item of items) {
      expect(item.getAttribute('role')).toBe('button');
      expect(item.getAttribute('aria-hidden')).toBeNull();
    }
    expect(items.map(item => item.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    const label = items[0].getAttribute('aria-label')!;
    expect(label).toContain('Subscriptions');
    expect(label).toContain('%');
  });

  it('keeps non-interactive slices hidden and unfocusable', () => {
    const container = mountChart(makeConfig());
    expect(slices(container).length).toBe(0);
    const sliceGroups = container.querySelectorAll('.mochart-series-container .mochart-series');
    expect(sliceGroups.length).toBe(3);
    for (const group of sliceGroups) {
      expect(group.getAttribute('aria-hidden')).toBe('true');
      expect(group.getAttribute('tabindex')).toBeNull();
    }
  });

  it('has no keyboard semantics when chart accessibility is disabled', () => {
    const container = mountChart(makeConfig({ chart: { type: 'pie' }, accessibility: { enabled: false } }), () => {});
    expect(slices(container).length).toBe(0);
    const sliceGroups = container.querySelectorAll('.mochart-series-container .mochart-series');
    expect(sliceGroups.length).toBe(3);
    for (const group of sliceGroups) {
      expect(group.getAttribute('aria-hidden')).toBeNull();
      expect(group.getAttribute('tabindex')).toBeNull();
      expect(group.getAttribute('role')).toBeNull();
    }
  });

  it('clicks with Enter and Space', () => {
    const clicks: string[] = [];
    const container = mountChart(makeConfig(), (payload) => clicks.push(payload.seriesId));
    const items = slices(container);

    key(items[0], 'Enter');
    key(items[1], ' ');
    expect(clicks).toEqual(['S0', 'S1']);
  });

  it('moves focus and the roving tab stop with arrows in config order', () => {
    const container = mountChart(makeConfig(), () => {});
    const items = slices(container);
    items[0].focus();

    key(items[0], 'ArrowRight');
    expect(document.activeElement).toBe(items[1]);
    expect(slices(container).map(item => item.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);

    key(items[1], 'End');
    expect(document.activeElement).toBe(items[2]);

    // clamped at the last slice
    key(items[2], 'ArrowDown');
    expect(document.activeElement).toBe(items[2]);

    key(items[2], 'Home');
    expect(document.activeElement).toBe(items[0]);
  });

  // Regression: Enter synthesized a click at the slice's bbox center, and the
  // chart-level bounds gate swallowed it whenever the center fell outside the
  // series rect (exploded edge slices; jsdom's zero-size bboxes reproduce it) —
  // toggling the focus but leaving the tooltip out of sync.
  it('toggles the tooltip with Enter and Space regardless of slice geometry', () => {
    const container = mountChart(makeConfig(), () => {});
    const items = slices(container);
    const rect = container.querySelector<SVGElement>('.mochart-series-background rect')!;

    key(items[0], 'Enter');
    expect(rect.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.mochart-tooltip')).not.toBeNull();
    // keyboard activation announces like the plot rect does
    expect(container.querySelector('[role="status"]')?.textContent ?? '').not.toBe('');

    key(items[0], ' ');
    expect(rect.getAttribute('aria-expanded')).toBe('false');
  });

  // Regression: Escape lived only on the plot rect, so a keyboard user whose
  // focus was on a slice could only toggle the tooltip closed with Enter again.
  it('closes the tooltip with Escape from a slice', () => {
    const container = mountChart(makeConfig(), () => {});
    const items = slices(container);
    const rect = container.querySelector<SVGElement>('.mochart-series-background rect')!;

    key(items[0], 'Enter');
    expect(rect.getAttribute('aria-expanded')).toBe('true');

    key(items[0], 'Escape');
    expect(rect.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.mochart-tooltip')?.textContent ?? '').toBe('');
  });

  it('keeps DOM focus on the slice when focusing reorders the slice nodes', () => {
    const container = mountChart(makeConfig({ seriesDefaults: { focusOnClick: true } }));
    const items = slices(container);
    items[0].focus();

    // Enter focuses the series; the focused slice redraws last, moving its node
    key(items[0], 'Enter');
    expect(document.activeElement).toBe(items[0]);

    // navigation still works from the moved node, in config order
    key(items[0], 'ArrowRight');
    expect(document.activeElement).toBe(items[1]);
  });
});
