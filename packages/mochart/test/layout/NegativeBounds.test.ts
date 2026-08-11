/**
 * A chart smaller than its own spacing used to emit rects with negative width or height.
 * Browsers drop those elements, so host-styled backgrounds vanished silently, and strict
 * SVG-to-PNG converters reject the document outright.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from '../components/svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps, MochartInputConfig } from '../../src';

let handles: ChartHandle<DefaultChartProps>[] = [];
const rows = [{ c: 'a', v: 1 }, { c: 'b', v: 2 }];

beforeAll(() => { installSvgMeasurementShims(); });
afterEach(() => {
  for (const handle of handles) { handle.destroy(); }
  handles = [];
  document.body.innerHTML = '';
});

function config(extra: Record<string, unknown>): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'c', type: 'string', scale: 'ordinal' },
    valueAxes: [{ id: 'v' }],
    series: [{ property: 'v', renderer: 'bar' }],
    ...extra
  } as unknown as MochartInputConfig;
}

/** Every rect with a negative dimension, named by the group holding it. */
function negativeRects(chartConfig: MochartInputConfig, width: number, height: number): string[] {
  const container = document.createElement('div');
  document.body.appendChild(container);
  handles.push(createDefaultChart(container, { config: chartConfig, data: rows, width, height } as DefaultChartProps));
  return [...container.querySelectorAll('rect')]
    .filter(rect => Number(rect.getAttribute('width')) < 0 || Number(rect.getAttribute('height')) < 0)
    .map(rect => `${(rect.parentElement?.getAttribute('class') ?? '?').split(' ')[0]} ${rect.getAttribute('width')}x${rect.getAttribute('height')}`);
}

describe('charts smaller than their own spacing', () => {
  it('emits no negative rect when padding exceeds the height', () => {
    expect(negativeRects(config({ chart: { padding: { top: 200, right: 0, bottom: 200, left: 0 } } }), 300, 200)).toEqual([]);
  });

  it('emits no negative rect when margin exceeds both dimensions', () => {
    expect(negativeRects(config({ chart: { margin: { top: 120, right: 120, bottom: 120, left: 120 } } }), 300, 200)).toEqual([]);
  });

  it('emits no negative rect when title and legend do not fit a tiny chart', () => {
    expect(negativeRects(config({ title: { text: 'T' }, legend: { visible: true } }), 20, 20)).toEqual([]);
  });

  it('still lays out a normal chart', () => {
    expect(negativeRects(config({ title: { text: 'T' }, legend: { visible: true } }), 640, 420)).toEqual([]);
    const container = document.body.querySelector('div')!;
    expect(container.querySelectorAll('.mochart-series-bar').length).toBe(2);
  });
});
