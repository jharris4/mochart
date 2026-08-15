// a chart smaller than its own spacing used to emit rects with negative width or height, which browsers drop silently (vanishing host-styled backgrounds) and strict SVG-to-PNG converters reject outright
import { describe, it, expect, beforeAll } from 'vitest';
import { installSvgMeasurementShims } from '../components/svgShims';
import { mountContainer, trackHandle } from '../components/helpers';
import { createDefaultChart } from '../../src/createChart';
import type { DefaultChartProps, MochartInputConfig } from '../../src';
import { getCssSelector } from '../../src/utils/ChartDom';

const rows = [{ c: 'a', v: 1 }, { c: 'b', v: 2 }];

beforeAll(() => { installSvgMeasurementShims(); });
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
  const container = mountContainer();
  trackHandle(createDefaultChart(container, { config: chartConfig, data: rows, width, height } as DefaultChartProps));
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

  // legend.iconSize and legend.iconBorderSize validate independently, so a border wider than the icon put a negative width on the icon rect and the browser dropped it
  it('emits no negative rect when the legend icon border exceeds the icon size', () => {
    expect(negativeRects(config({
      legend: { visible: true, iconSize: 4, iconBorderSize: 10, showIconShapes: false }
    }), 640, 420)).toEqual([]);
  });

  it('still lays out a normal chart', () => {
    expect(negativeRects(config({ title: { text: 'T' }, legend: { visible: true } }), 640, 420)).toEqual([]);
    const container = document.body.querySelector('div')!;
    expect(container.querySelectorAll(getCssSelector('seriesBar')).length).toBe(2);
  });
});
