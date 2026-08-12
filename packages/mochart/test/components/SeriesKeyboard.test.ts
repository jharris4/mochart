/**
 * Keyboard accessibility of cartesian series: interactive series (focusOnClick
 * or an onSeriesClick handler) are buttons with a roving tab stop — arrows move
 * between series in config order (the DOM is focus-ordered, so it cannot drive
 * navigation), Enter/Space clicks the whole series (categoryIndex -1, like a
 * line/area path click), and follower series stay pointer-only. Non-interactive
 * series stay aria-hidden.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { ChartSeriesClickPayload, DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getCssSelector, getIdCssSelector, getDescendantCssSelector } from '../../src/utils/ChartDom';

const rows = [
  { month: 'Jan', s0: 10, s1: 4, s2: 6 },
  { month: 'Feb', s0: 20, s1: 8, s2: 12 }
];

function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [
      { id: 'S0', property: 's0', renderer: 'bar', title: 'Sales' },
      { id: 'S1', property: 's1', renderer: 'bar', title: 'Costs' },
      { id: 'S2', property: 's2', renderer: 'bar', title: 'Profit' }
    ],
    ...overrides
  } as unknown as MochartInputConfig;
}

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig, onSeriesClick?: (payload: ChartSeriesClickPayload) => void): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  handles.push(createDefaultChart(container, { config, data: rows, width: 800, height: 600, onSeriesClick }));
  return container;
}

function seriesNodes(container: Element): SVGElement[] {
  // config order: the legend also carries data-series-id, so scope to the series groups
  return ['S0', 'S1', 'S2']
    .map(id => container.querySelector<SVGElement>(getCssSelector('seriesContainer') + ' g[data-series-id="' + id + '"]'))
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

describe('cartesian series keyboard semantics', () => {
  it('exposes clickable series as buttons with one roving tab stop', () => {
    const container = mountChart(makeConfig(), () => {});
    const items = seriesNodes(container);
    expect(items.length).toBe(3);
    for (const item of items) {
      expect(item.getAttribute('role')).toBe('button');
      expect(item.getAttribute('aria-hidden')).toBeNull();
    }
    expect(items.map(item => item.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
    expect(items[0].getAttribute('aria-label')).toBe('Sales');
  });

  it('keeps non-clickable series hidden and unfocusable', () => {
    const container = mountChart(makeConfig());
    expect(seriesNodes(container).length).toBe(0);
    const groups = container.querySelectorAll(getDescendantCssSelector('seriesContainer', 'series'));
    expect(groups.length).toBe(3);
    for (const group of groups) {
      expect(group.getAttribute('aria-hidden')).toBe('true');
      expect(group.getAttribute('tabindex')).toBeNull();
    }
  });

  it('has no keyboard semantics when chart accessibility is disabled', () => {
    const container = mountChart(makeConfig({ accessibility: { enabled: false } }), () => {});
    expect(seriesNodes(container).length).toBe(0);
    const groups = container.querySelectorAll(getDescendantCssSelector('seriesContainer', 'series'));
    expect(groups.length).toBe(3);
    for (const group of groups) {
      expect(group.getAttribute('aria-hidden')).toBeNull();
      expect(group.getAttribute('tabindex')).toBeNull();
      expect(group.getAttribute('role')).toBeNull();
    }
  });

  it('makes focusOnClick series keyboard-reachable without an onSeriesClick handler', () => {
    const container = mountChart(makeConfig({ seriesDefaults: { focusOnClick: true } }));
    expect(seriesNodes(container).length).toBe(3);
  });

  it('clicks with Enter and Space, reporting the whole-series payload', () => {
    const clicks: ChartSeriesClickPayload[] = [];
    const container = mountChart(makeConfig(), payload => clicks.push(payload));
    const items = seriesNodes(container);

    key(items[0], 'Enter');
    key(items[1], ' ');
    expect(clicks).toEqual([
      { seriesId: 'S0', categoryIndex: -1, nearestCategoryIndex: -1 },
      { seriesId: 'S1', categoryIndex: -1, nearestCategoryIndex: -1 }
    ]);
  });

  it('moves focus and the roving tab stop with arrows in config order', () => {
    const container = mountChart(makeConfig(), () => {});
    const items = seriesNodes(container);
    items[0].focus();

    key(items[0], 'ArrowRight');
    expect(document.activeElement).toBe(items[1]);
    expect(seriesNodes(container).map(item => item.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);

    key(items[1], 'End');
    expect(document.activeElement).toBe(items[2]);

    // clamped at the last series
    key(items[2], 'ArrowDown');
    expect(document.activeElement).toBe(items[2]);

    key(items[2], 'Home');
    expect(document.activeElement).toBe(items[0]);
  });

  it('toggles the tooltip with Enter and closes it with Escape', () => {
    const container = mountChart(makeConfig(), () => {});
    const items = seriesNodes(container);
    const rect = container.querySelector<SVGElement>(getCssSelector('seriesBackground') + ' rect')!;

    key(items[0], 'Enter');
    expect(rect.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector(getCssSelector('tooltip'))).not.toBeNull();
    // keyboard activation announces like the plot rect does
    expect(container.querySelector('[role="status"]')?.textContent ?? '').not.toBe('');

    key(items[0], 'Escape');
    expect(rect.getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps follower series pointer-only', () => {
    const container = mountChart(makeConfig({
      series: [
        { id: 'S0', property: 's0', renderer: 'bar', title: 'Sales' },
        { id: 'S1', property: 's1', renderer: 'bar', followSeries: 'S0' },
        { id: 'S2', property: 's2', renderer: 'bar', title: 'Profit' }
      ]
    }), () => {});
    const items = seriesNodes(container);
    expect(items.map(item => item.getAttribute('data-series-id'))).toEqual(['S0', 'S2']);
    const follower = container.querySelector(getCssSelector('seriesContainer') + ' ' + getIdCssSelector('series', 'S1'))!;
    expect(follower.getAttribute('aria-hidden')).toBe('true');
    expect(follower.getAttribute('tabindex')).toBeNull();
  });

  it('moves focus to a neighbor series when the focused series is filtered out', () => {
    const container = mountChart(makeConfig(), () => {});
    const handle = handles[handles.length - 1];
    const items = seriesNodes(container);
    items[1].focus();

    handle.update({ filteredSeriesIds: { S1: true } });
    const remaining = seriesNodes(container);
    expect(remaining.map(item => item.getAttribute('data-series-id'))).toEqual(['S0', 'S2']);
    // the next series in config order inherits focus and the tab stop
    expect(document.activeElement).toBe(remaining[1]);
    expect(remaining[1].getAttribute('tabindex')).toBe('0');
  });

  it('keeps DOM focus on the series when focusing reorders the series nodes', () => {
    const container = mountChart(makeConfig({ seriesDefaults: { focusOnClick: true } }));
    const items = seriesNodes(container);
    items[0].focus();

    // Enter focuses the series; the focused series redraws last, moving its node
    key(items[0], 'Enter');
    expect(document.activeElement).toBe(items[0]);

    // navigation still works from the moved node, in config order
    key(items[0], 'ArrowRight');
    expect(document.activeElement).toBe(items[1]);
  });

  // A11Y-12: the roving series had only key handlers, so a screen reader announced a
  // bare button with no enclosing group where the legend one Tab later announces "Legend, group"
  it('groups the roving series like the legend, named from the accessibility config', () => {
    const container = mountChart(makeConfig(), () => {});
    const group = container.querySelector(getCssSelector('seriesContainer'))!;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Chart series');
    // the group is the one the roving items sit in, as in the legend
    expect(seriesNodes(container)[0].closest('[role="group"]')).toBe(group);

    const named = mountChart(makeConfig({ accessibility: { seriesLabel: 'Umsätze' } }), () => {});
    expect(named.querySelector(getCssSelector('seriesContainer'))!.getAttribute('aria-label')).toBe('Umsätze');
  });

  it('leaves the series container unroled when the series are not tab stops', () => {
    for (const container of [mountChart(makeConfig()),
      mountChart(makeConfig({ accessibility: { enabled: false } }), () => {})]) {
      const group = container.querySelector(getCssSelector('seriesContainer'))!;
      expect(group.getAttribute('role')).toBeNull();
      expect(group.getAttribute('aria-label')).toBeNull();
    }
  });
});
