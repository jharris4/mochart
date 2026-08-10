/**
 * ANIM-1 part 3: an explicit axis `min`/`max` is a hard bound, so a value past it used to paint
 * over the axes and the title (confined only by the outermost svg's own viewport). The series are
 * now clipped to the plot.
 *
 * jsdom does not rasterize, so these assert the clip *contract* — the clipPath, the rect it
 * carries, and the reference from the series container — rather than the painted result. The
 * geometry deliberately still runs past the bound: clipping is a viewport operation, and the
 * value a mark reports must not change.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import { getSeriesClipAllowance } from '../../src/components/SeriesClip';
import { makeConfig as makeEnhancedConfig } from '../data/fixtures';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const WIDTH = 400;
const HEIGHT = 300;

const rows = [{ c: 'a', v: 5 }, { c: 'b', v: 50 }];

let handles: ChartHandle<DefaultChartProps>[] = [];

function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'c', type: 'string', scale: 'ordinal' },
    series: [{ property: 'v', renderer: 'bar' }],
    ...overrides
  } as unknown as MochartInputConfig;
}

function mount(config = makeConfig(), data: readonly unknown[] = rows): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  handles.push(createDefaultChart(container, { config, data, width: WIDTH, height: HEIGHT } as DefaultChartProps));
  return container;
}

function plotRect(container: Element) {
  const rect = container.querySelector('.mochart-series-background rect')!;
  return {
    x: Number(rect.getAttribute('x')), y: Number(rect.getAttribute('y')),
    width: Number(rect.getAttribute('width')), height: Number(rect.getAttribute('height'))
  };
}

function clipRect(container: Element) {
  const rect = container.querySelector('clipPath[id^="series__clippath__"] rect');
  return rect === null ? null : {
    x: Number(rect.getAttribute('x')), y: Number(rect.getAttribute('y')),
    width: Number(rect.getAttribute('width')), height: Number(rect.getAttribute('height'))
  };
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

describe('series clip', () => {
  it('clips the series container to the plot', () => {
    const container = mount(makeConfig({ valueAxes: [{ min: 0, max: 10 }] }));
    const seriesContainer = container.querySelector('.mochart-series-container')!;
    const clipPath = container.querySelector('clipPath[id^="series__clippath__"]')!;

    expect(clipPath).not.toBeNull();
    expect(seriesContainer.getAttribute('clip-path')).toBe(`url(#${clipPath.getAttribute('id')})`);
    // a bar chart draws no markers, so the clip is the plot exactly
    expect(clipRect(container)).toEqual(plotRect(container));
  });

  it('leaves the out-of-range geometry alone — clipping is a viewport operation', () => {
    const container = mount(makeConfig({ valueAxes: [{ min: 0, max: 10 }] }));
    const paths = [...container.querySelectorAll('.mochart-series path')];
    const tops = paths.map((path) => Number(/^M(-?[\d.]+),(-?[\d.]+)/.exec(path.getAttribute('d') ?? '')![2]));
    // the value-50 bar still starts far above the plot; the clip is what hides it
    expect(Math.min(...tops)).toBeLessThan(0);
  });

  it('gives each chart its own clip id', () => {
    const first = mount(makeConfig({ valueAxes: [{ min: 0, max: 10 }] }));
    const second = mount(makeConfig({ valueAxes: [{ min: 0, max: 10 }] }));
    const idOf = (container: Element) => container.querySelector('clipPath[id^="series__clippath__"]')!.getAttribute('id');
    expect(idOf(first)).not.toBe(idOf(second));
  });

  it('is not emitted for a pie chart, which has no axis bounds to exceed', () => {
    const container = mount(makeConfig({ chart: { type: 'pie' } }));
    expect(container.querySelector('clipPath[id^="series__clippath__"]')).toBeNull();
    expect(container.querySelector('.mochart-series-container')!.getAttribute('clip-path')).toBeNull();
  });
});

describe('clip allowance', () => {
  it('inflates the clip by the largest markerSize so an edge marker is not halved', () => {
    const container = mount(makeConfig({
      valueAxes: [{ min: 0, max: 10 }],
      series: [{ property: 'v', renderer: 'line', markerShape: 'circle', markerSize: 12 }]
    }));
    const plot = plotRect(container);
    const clip = clipRect(container)!;
    expect(clip.x).toBe(plot.x - 12);
    expect(clip.y).toBe(plot.y - 12);
    expect(clip.width).toBe(plot.width + 24);
    expect(clip.height).toBe(plot.height + 24);
  });

  it('takes the largest markerSize across series', () => {
    const config = makeEnhancedConfig(makeConfig({
      series: [
        { property: 'v', renderer: 'line', markerShape: 'circle', markerSize: 4 },
        { property: 'v', renderer: 'line', markerShape: 'square', markerSize: 9 }
      ]
    }) as unknown as Record<string, unknown>);
    expect(getSeriesClipAllowance(config)).toBe(9);
  });

  it('is zero when no series draws a marker', () => {
    const config = makeEnhancedConfig(makeConfig({
      series: [{ property: 'v', renderer: 'bar', markerShape: null }]
    }) as unknown as Record<string, unknown>);
    expect(getSeriesClipAllowance(config)).toBe(0);
  });

  it('ignores markerSize on a series whose markerShape is off', () => {
    const config = makeEnhancedConfig(makeConfig({
      series: [{ property: 'v', renderer: 'bar', markerShape: null, markerSize: 40 }]
    }) as unknown as Record<string, unknown>);
    expect(getSeriesClipAllowance(config)).toBe(0);
  });
});
