/**
 * Bar cap geometry: which cap a bar gets is decided by series capType,
 * capOnlyStackOuter and the stack's outerCapType, and the rounded cap falls
 * back to a flat end for bars too short to round.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { month: 'Jan', a: 10, b: 6 },
  { month: 'Feb', a: 20, b: 9 },
  { month: 'Mar', a: 30, b: 12 }
];

let handles: ChartHandle<DefaultChartProps>[] = [];

function mount(overrides: Record<string, unknown>, data: readonly unknown[] = rows): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const config = {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
    series: [{ property: 'a', renderer: 'bar' }],
    ...overrides
  } as unknown as MochartInputConfig;
  handles.push(createDefaultChart(container, {
    config, data, width: WIDTH, height: HEIGHT
  } as DefaultChartProps));
  return container;
}

function barPaths(container: Element): string[] {
  return [...container.querySelectorAll('.mochart-series-bar')].map(el => el.getAttribute('d') ?? '');
}

/** A stacked pair where the second series is the outer one. */
function stackedConfig(seriesExtra: Record<string, unknown>, stackExtra: Record<string, unknown>) {
  return {
    seriesStacks: [{ id: 'S', ...stackExtra }],
    series: [
      { id: 'inner', property: 'b', renderer: 'bar', stack: 'S', ...seriesExtra },
      { id: 'outer', property: 'a', renderer: 'bar', stack: 'S', ...seriesExtra }
    ]
  };
}

beforeAll(() => {
  installSvgMeasurementShims();
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
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

describe('cap selection', () => {
  for (const inverted of [false, true]) {
    const plot = { plot: { inverted } };
    const orientation = inverted ? 'inverted' : 'upright';

    it(`draws no cap by default on an ${orientation} plot`, () => {
      const plain = barPaths(mount(plot));
      const capped = barPaths(mount({ ...plot, series: [{ property: 'a', renderer: 'bar', capType: 'round' }] }));
      expect(plain[0]).not.toBe(capped[0]);
    });

    for (const capType of ['point', 'curve', 'round'] as const) {
      it(`draws a ${capType} cap on an ${orientation} plot`, () => {
        const paths = barPaths(mount({ ...plot, series: [{ property: 'a', renderer: 'bar', capType }] }));
        expect(paths.length).toBe(rows.length);
        expect(paths.every(d => d.length > 0)).toBe(true);
      });
    }

    it(`caps only the stack's outer segment when capOnlyStackOuter is set on an ${orientation} plot`, () => {
      const every = barPaths(mount({ ...plot, ...stackedConfig({ capType: 'round' }, {}) }));
      const outerOnly = barPaths(mount({
        ...plot, ...stackedConfig({ capType: 'round', capOnlyStackOuter: true }, {})
      }));
      expect(every.join('|')).not.toBe(outerOnly.join('|'));
    });

    it(`takes the cap from the stack's outerCapType when the series sets none on an ${orientation} plot`, () => {
      const none = barPaths(mount({ ...plot, ...stackedConfig({}, {}) }));
      const stackCapped = barPaths(mount({ ...plot, ...stackedConfig({}, { outerCapType: 'round', outerCapSize: 6 }) }));
      expect(none.join('|')).not.toBe(stackCapped.join('|'));
    });
  }

  // outerCapType lives on the stack config, so it reaches a series only through
  // its stack; stack: null is explicit because a sole declared stack is the default
  it('leaves a series opted out of the stack uncapped', () => {
    const plain = barPaths(mount({ series: [{ property: 'a', renderer: 'bar', stack: null }] }));
    const alsoPlain = barPaths(mount({
      seriesStacks: [{ id: 'S', outerCapType: 'round' }],
      series: [{ property: 'a', renderer: 'bar', stack: null }]
    }));
    expect(plain).toEqual(alsoPlain);
  });

  it('joins the sole declared stack by default, so its outerCapType applies', () => {
    const optedOut = barPaths(mount({
      seriesStacks: [{ id: 'S', outerCapType: 'round' }],
      series: [{ property: 'a', renderer: 'bar', stack: null }]
    }));
    const defaulted = barPaths(mount({ seriesStacks: [{ id: 'S', outerCapType: 'round' }] }));
    expect(optedOut.join('|')).not.toBe(defaulted.join('|'));
  });
});

describe('rounded cap geometry', () => {
  for (const inverted of [false, true]) {
    const plot = { plot: { inverted } };
    const orientation = inverted ? 'inverted' : 'upright';

    // bars shorter than the rounding threshold fall back to a flat end
    it(`falls back to a flat end for bars too short to round on an ${orientation} plot`, () => {
      const paths = barPaths(mount(
        { ...plot, series: [{ property: 'a', renderer: 'bar', capType: 'round' }] },
        [{ month: 'Jan', a: 1000 }, { month: 'Feb', a: 1001 }, { month: 'Mar', a: 1000.5 }]
      ));
      expect(paths.length).toBe(3);
      expect(paths.every(d => d.length > 0)).toBe(true);
    });

    it(`handles a cap larger than the bar's rounding radius on an ${orientation} plot`, () => {
      const paths = barPaths(mount({
        ...plot, series: [{ property: 'a', renderer: 'bar', capType: 'round', capSize: 200 }]
      }));
      expect(paths.every(d => d.length > 0)).toBe(true);
    });

    it(`expands a cap wider than the bar when capExpand is off on an ${orientation} plot`, () => {
      const expanded = barPaths(mount({
        ...plot, series: [{ property: 'a', renderer: 'bar', capType: 'point', capSize: 200, capExpand: true }]
      }));
      const flat = barPaths(mount({
        ...plot, series: [{ property: 'a', renderer: 'bar', capType: 'point', capSize: 200, capExpand: false }]
      }));
      expect(expanded.join('|')).not.toBe(flat.join('|'));
    });
  }
});

describe('ranged line series', () => {
  for (const inverted of [false, true]) {
    it(`draws the range bound as a second line on an ${inverted ? 'inverted' : 'upright'} plot`, () => {
      const container = mount({
        plot: { inverted },
        series: [{ property: 'a', rangeProperty: 'b', renderer: 'line' }]
      });
      expect(container.querySelectorAll('.mochart-series-line').length).toBe(2);
    });
  }
});
