/**
 * Volume pane rendering tests: createCandlestick's `volume` option puts
 * direction-split volume bars on a hidden second axis whose domain margins
 * confine them to the bottom band of the plot, while the price axis's
 * enlarged minimum margin lifts the candles above them. Charts are mounted
 * through createDefaultChart in jsdom, and assertions parse the rendered bar
 * paths (`M{x},{y}h{w}v{h}h{-w}Z`) against the plot background rect.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import { createCandlestick } from '../../src/data/Candlestick';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;

const ITEMS = [
  { label: 'Mon', open: 1, high: 3, low: 0, close: 2, volume: 1200 },
  { label: 'Tue', open: 2, high: 4, low: 1, close: 1.5, volume: 800 }
];

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountVolumeCandlestick(): Element {
  const { data, groupAxisConfig, seriesConfigs, seriesAxisConfigs } = createCandlestick(ITEMS, { volume: true });
  const config = {
    version: VERSION,
    animationConfig: { animate: false },
    groupAxisConfig,
    seriesAxisConfigs,
    seriesConfigs
  } as unknown as MochartInputConfig;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config, data, width: WIDTH, height: HEIGHT
  } as DefaultChartProps);
  handles.push(handle);
  return container;
}

interface BarRect { y: number; height: number }

function barRects(container: Element, seriesId: string): BarRect[] {
  const paths = container.querySelectorAll(`.mochart-series-${seriesId} path[class*="mochart-series-bar"]`);
  return Array.from(paths).map((path) => {
    const d = path.getAttribute('d') ?? '';
    const match = /^M(-?[\d.]+),(-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)/.exec(d);
    expect(match, `unexpected bar path: ${d}`).not.toBeNull();
    return { y: Number(match![2]), height: Number(match![4]) };
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

describe('candlestick volume pane', () => {
  it('renders the volume bars entirely below the price marks', () => {
    const container = mountVolumeCandlestick();
    const priceBottoms = ['upWick', 'downWick', 'up', 'down']
      .flatMap((seriesId) => barRects(container, seriesId))
      .map((bar) => bar.y + bar.height);
    const volumeTops = ['upVolume', 'downVolume']
      .flatMap((seriesId) => barRects(container, seriesId))
      .map((bar) => bar.y);
    expect(priceBottoms).toHaveLength(4);
    expect(volumeTops).toHaveLength(2);
    expect(Math.max(...priceBottoms)).toBeLessThan(Math.min(...volumeTops));
  });

  it('confines the tallest volume bar to the bottom heightPercent of the plot', () => {
    const container = mountVolumeCandlestick();
    const volumeBars = ['upVolume', 'downVolume'].flatMap((seriesId) => barRects(container, seriesId));
    // the volume axis min is pinned at 0, so every bar grows from the bottom
    // of the series area — the shared baseline is the series extent
    const bottoms = volumeBars.map((bar) => bar.y + bar.height);
    const seriesExtent = bottoms[0];
    for (const bottom of bottoms) {
      expect(bottom).toBeCloseTo(seriesExtent, 6);
    }
    // default heightPercent 0.2: the largest volume reaches 20% up the plot
    const tallest = Math.max(...volumeBars.map((bar) => bar.height));
    expect(tallest / seriesExtent).toBeCloseTo(0.2, 2);
    // and the price marks keep a visible gap above the volume band
    const maxPriceBottom = Math.max(...['upWick', 'downWick', 'up', 'down']
      .flatMap((seriesId) => barRects(container, seriesId))
      .map((bar) => bar.y + bar.height));
    const minVolumeTop = Math.min(...volumeBars.map((bar) => bar.y));
    expect(minVolumeTop - maxPriceBottom).toBeGreaterThan(seriesExtent * 0.02);
  });

  it('scales the volume bars against their own axis', () => {
    const container = mountVolumeCandlestick();
    const [upVolume] = barRects(container, 'upVolume'); // 1200
    const [downVolume] = barRects(container, 'downVolume'); // 800
    expect(downVolume.height / upVolume.height).toBeCloseTo(800 / 1200, 1);
  });
});
