/**
 * barWidthPercent tests: bars narrowed within their layout slot stay centered
 * on the full-width bars of a sibling series — the geometry behind candlestick
 * wicks and bullet-chart overlays. Charts are mounted through
 * createDefaultChart in jsdom, and assertions parse the rendered bar paths
 * (uncapped bars are rects: `M{x},{y}h{w}v{h}h{-w}Z`).
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

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

interface BarRect { x: number; width: number }

function barRects(container: Element, seriesId: string): BarRect[] {
  const paths = container.querySelectorAll(`.mochart-series-${seriesId} path[class*="mochart-series-bar"]`);
  return Array.from(paths).map((path) => {
    const d = path.getAttribute('d') ?? '';
    const match = /^M(-?[\d.]+),(-?[\d.]+)h(-?[\d.]+)/.exec(d);
    expect(match, `unexpected bar path: ${d}`).not.toBeNull();
    return { x: Number(match![1]), width: Number(match![3]) };
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

function makeConfig(seriesConfigs: Record<string, unknown>[], overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: VERSION,
    animationConfig: { animate: false },
    groupAxisConfig: { property: 'label', type: 'string', scale: 'ordinal' },
    seriesConfigs,
    ...overrides
  } as unknown as MochartInputConfig;
}

describe('barWidthPercent', () => {
  it('narrows bars within the slot, centered on a full-width sibling series', () => {
    const container = mountChart(makeConfig([
      { id: 'F', property: 'full', renderer: 'bar' },
      { id: 'N', property: 'narrow', renderer: 'bar', barWidthPercent: 0.25 }
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
      { id: 'N', property: 'narrow', renderer: 'bar', group: 'G', barWidthPercent: 0.5 }
    ], { seriesGroupConfigs: [{ id: 'G' }] }));
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
      { id: 'N', property: 'narrow', renderer: 'bar', barWidthPercent: 1 }
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
    const bad = makeConfig([{ id: 'F', property: 'full', renderer: 'bar', barWidthPercent: 2 }]);
    const { errors } = validateConfig(bad, getDefaults(bad as never) as never);
    expect(errors.join('\n')).toContain('barWidthPercent');
  });
});
