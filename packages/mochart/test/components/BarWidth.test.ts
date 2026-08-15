// Bar slot geometry: barWidthFraction narrows bars in their slot, barAlignFraction moves them, barMinExtent
// keeps zero-extent range bars visible (candlestick wicks, OHLC ticks); asserts parse bar paths `M{x},{y}h{w}v{h}h{-w}Z`.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getCssClass, getIdCssSelector, getCssClassMatchSelector } from '../../src/utils/ChartDom';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;

const rows = [
  { label: 'A', full: 10, narrow: 14 },
  { label: 'B', full: 20, narrow: 24 },
  { label: 'C', full: 30, narrow: 34 }
];

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config, data: rows, width: WIDTH, height: HEIGHT
  } as DefaultChartProps);
  handles.push(handle);
  return container;
}

interface BarRect { x: number; y: number; width: number; height: number }

function barRects(container: Element, seriesId: string): BarRect[] {
  const paths = container.querySelectorAll(getIdCssSelector('series', seriesId) + ' path' + getCssClassMatchSelector(getCssClass('seriesBar')));
  return Array.from(paths).map((path) => {
    const d = path.getAttribute('d') ?? '';
    const match = /^M(-?[\d.]+),(-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)/.exec(d);
    expect(match, `unexpected bar path: ${d}`).not.toBeNull();
    return { x: Number(match![1]), y: Number(match![2]), width: Number(match![3]), height: Number(match![4]) };
  });
}

beforeAll(() => {
  installSvgMeasurementShims();
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

function makeConfig(series: Record<string, unknown>[], overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: VERSION,
    animation: { animate: false },
    categoryAxis: { property: 'label', type: 'string', scale: 'ordinal' },
    series,
    ...overrides
  } as unknown as MochartInputConfig;
}

describe('barWidthFraction', () => {
  it('narrows bars within the slot, centered on a full-width sibling series', () => {
    const container = mountChart(makeConfig([
      { id: 'F', property: 'full', renderer: 'bar' },
      { id: 'N', property: 'narrow', renderer: 'bar', barWidthFraction: 0.25 }
    ]));
    const fullBars = barRects(container, 'F');
    const narrowBars = barRects(container, 'N');
    expect(fullBars).toHaveLength(rows.length);
    expect(narrowBars).toHaveLength(rows.length);
    for (let i = 0; i < rows.length; i++) {
      expect(narrowBars[i].width).toBeCloseTo(fullBars[i].width * 0.25, 6);
      // centered: same midpoint as the full-width bar
      expect(narrowBars[i].x + narrowBars[i].width / 2).toBeCloseTo(fullBars[i].x + fullBars[i].width / 2, 6);
    }
  });

  it('narrows grouped bars within their per-series sub-slot', () => {
    const container = mountChart(makeConfig([
      { id: 'F', property: 'full', renderer: 'bar', group: 'G' },
      { id: 'N', property: 'narrow', renderer: 'bar', group: 'G', barWidthFraction: 0.5 }
    ], { seriesGroups: [{ id: 'G' }] }));
    const fullBars = barRects(container, 'F');
    const narrowBars = barRects(container, 'N');
    for (let i = 0; i < rows.length; i++) {
      expect(narrowBars[i].width).toBeCloseTo(fullBars[i].width * 0.5, 6);
      // the narrow bar stays centered within its own sub-slot, one sub-slot
      // (width plus inner padding) right of its sibling's
      expect(narrowBars[i].x + narrowBars[i].width / 2)
        .toBeCloseTo(fullBars[i].x + fullBars[i].width / 2 + fullBars[i].width / (1.0 - 0.1), 5);
    }
  });

  it('defaults to the full slot width', () => {
    const container = mountChart(makeConfig([
      { id: 'F', property: 'full', renderer: 'bar' },
      { id: 'N', property: 'narrow', renderer: 'bar', barWidthFraction: 1 }
    ]));
    const fullBars = barRects(container, 'F');
    const narrowBars = barRects(container, 'N');
    for (let i = 0; i < rows.length; i++) {
      expect(narrowBars[i].width).toBeCloseTo(fullBars[i].width, 6);
      expect(narrowBars[i].x).toBeCloseTo(fullBars[i].x, 6);
    }
  });

  it('rejects out-of-range values in config validation', async () => {
    const { default: validateConfig } = await import('../../src/config/validation/mochartConfig');
    const { getDefaults } = await import('../../src/config/defaults/mochartConfig');
    const bad = makeConfig([{ id: 'F', property: 'full', renderer: 'bar', barWidthFraction: 2 }]);
    const { errors } = validateConfig(bad, getDefaults(bad as never) as never);
    expect(errors.join('\n')).toContain('barWidthFraction');
  });
});

describe('barAlignFraction', () => {
  it('aligns a narrowed bar with the slot start at 0 and the slot end at 1', () => {
    const container = mountChart(makeConfig([
      { id: 'F', property: 'full', renderer: 'bar' },
      { id: 'L', property: 'narrow', renderer: 'bar', barWidthFraction: 0.5, barAlignFraction: 0 },
      { id: 'R', property: 'narrow', renderer: 'bar', barWidthFraction: 0.5, barAlignFraction: 1 }
    ]));
    const fullBars = barRects(container, 'F');
    const leftBars = barRects(container, 'L');
    const rightBars = barRects(container, 'R');
    for (let i = 0; i < rows.length; i++) {
      expect(leftBars[i].x).toBeCloseTo(fullBars[i].x, 6);
      expect(rightBars[i].x + rightBars[i].width).toBeCloseTo(fullBars[i].x + fullBars[i].width, 6);
      // the two half-width bars tile the slot, meeting at its center
      expect(leftBars[i].x + leftBars[i].width).toBeCloseTo(rightBars[i].x, 6);
    }
  });

  it('defaults to centered', () => {
    const container = mountChart(makeConfig([
      { id: 'F', property: 'full', renderer: 'bar' },
      { id: 'N', property: 'narrow', renderer: 'bar', barWidthFraction: 0.25, barAlignFraction: 0.5 }
    ]));
    const fullBars = barRects(container, 'F');
    const narrowBars = barRects(container, 'N');
    for (let i = 0; i < rows.length; i++) {
      expect(narrowBars[i].x + narrowBars[i].width / 2).toBeCloseTo(fullBars[i].x + fullBars[i].width / 2, 6);
    }
  });

  it('rejects out-of-range values in config validation', async () => {
    const { default: validateConfig } = await import('../../src/config/validation/mochartConfig');
    const { getDefaults } = await import('../../src/config/defaults/mochartConfig');
    const bad = makeConfig([{ id: 'F', property: 'full', renderer: 'bar', barAlignFraction: -1 }]);
    const { errors } = validateConfig(bad, getDefaults(bad as never) as never);
    expect(errors.join('\n')).toContain('barAlignFraction');
  });
});

describe('barMinExtent', () => {
  it('expands a zero-extent range bar to the minimum extent, centered on its value', () => {
    const container = mountChart(makeConfig([
      { id: 'F', property: 'narrow', renderer: 'bar' },
      { id: 'T', property: 'narrow', rangeProperty: 'narrow', renderer: 'bar', barMinExtent: 4 }
    ]));
    const fullBars = barRects(container, 'F');
    const tickBars = barRects(container, 'T');
    for (let i = 0; i < rows.length; i++) {
      expect(tickBars[i].height).toBeCloseTo(4, 6);
      // centered on the value position, i.e. the top of the base-anchored bar
      expect(tickBars[i].y + tickBars[i].height / 2).toBeCloseTo(fullBars[i].y, 6);
    }
  });

  it('leaves bars taller than the minimum extent untouched', () => {
    const container = mountChart(makeConfig([
      { id: 'F', property: 'full', renderer: 'bar' },
      { id: 'M', property: 'full', renderer: 'bar', barMinExtent: 4 }
    ]));
    const fullBars = barRects(container, 'F');
    const minBars = barRects(container, 'M');
    for (let i = 0; i < rows.length; i++) {
      expect(minBars[i].y).toBeCloseTo(fullBars[i].y, 6);
      expect(minBars[i].height).toBeCloseTo(fullBars[i].height, 6);
    }
  });

  it('rejects negative values in config validation', async () => {
    const { default: validateConfig } = await import('../../src/config/validation/mochartConfig');
    const { getDefaults } = await import('../../src/config/defaults/mochartConfig');
    const bad = makeConfig([{ id: 'F', property: 'full', renderer: 'bar', barMinExtent: -1 }]);
    const { errors } = validateConfig(bad, getDefaults(bad as never) as never);
    expect(errors.join('\n')).toContain('barMinExtent');
  });
});
