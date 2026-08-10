/**
 * ANIM-1 part 3: the band marking plot edges that have data hidden behind them.
 *
 * It overlays the plot rather than reserving space, so it never enters the layout pass, and it is
 * `pointer-events: none` so it cannot take hover or clicks from the series or the plot hit area.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const WIDTH = 400;
const HEIGHT = 300;

const overflowing = [{ c: 'a', v: 5 }, { c: 'b', v: 50 }];
const contained = [{ c: 'a', v: 5 }, { c: 'b', v: 8 }];

let handles: ChartHandle<DefaultChartProps>[] = [];

function makeConfig(overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: '1.0.0',
    animation: { animate: false },
    categoryAxis: { property: 'c', type: 'string', scale: 'ordinal' },
    valueAxes: [{ min: 0, max: 10 }],
    series: [{ property: 'v', renderer: 'bar' }],
    ...overrides
  } as unknown as MochartInputConfig;
}

function mount(config = makeConfig(), data: readonly unknown[] = overflowing): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  handles.push(createDefaultChart(container, { config, data, width: WIDTH, height: HEIGHT } as DefaultChartProps));
  return container;
}

function bands(container: Element) {
  return [...container.querySelectorAll('.mochart-clip-indicator rect')].map((rect) => ({
    edge: (rect.getAttribute('class') ?? '').replace(/^.*band-/, ''),
    x: Number(rect.getAttribute('x')), y: Number(rect.getAttribute('y')),
    width: Number(rect.getAttribute('width')), height: Number(rect.getAttribute('height'))
  }));
}

function plotRect(container: Element) {
  const rect = container.querySelector('.mochart-series-background rect')!;
  return {
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

describe('band presence', () => {
  it('draws a band on the clipped edge', () => {
    const drawn = bands(mount());
    expect(drawn.map((band) => band.edge)).toEqual(['top']);
  });

  it('draws nothing when the data fits', () => {
    const container = mount(makeConfig(), contained);
    expect(container.querySelector('.mochart-clip-indicator')).toBeNull();
  });

  it('draws nothing when the indicator is turned off', () => {
    const container = mount(makeConfig({ plot: { showClipIndicator: false } }));
    expect(container.querySelector('.mochart-clip-indicator')).toBeNull();
  });

  it('draws one band per clipped edge', () => {
    const drawn = bands(mount(makeConfig(), [{ c: 'a', v: -50 }, { c: 'b', v: 50 }]));
    expect(drawn.map((band) => band.edge).sort()).toEqual(['bottom', 'top']);
  });

  it('follows the edge when the axis is reversed', () => {
    const drawn = bands(mount(makeConfig({ valueAxes: [{ min: 0, max: 10, reversed: true }] })));
    expect(drawn.map((band) => band.edge)).toEqual(['bottom']);
  });
});

describe('band geometry', () => {
  it('spans the clipped edge of the plot', () => {
    const container = mount();
    const plot = plotRect(container);
    const [band] = bands(container);
    expect(band.x).toBe(plot.x);
    expect(band.y).toBe(plot.y);
    expect(band.width).toBe(plot.width);
  });

  it('uses an explicit clipIndicatorSize as the depth', () => {
    const [band] = bands(mount(makeConfig({ plot: { clipIndicatorSize: 9 } })));
    expect(band.height).toBe(9);
  });

  it('derives an automatic depth from the font size plus padding on both sides', () => {
    // jsdom reports no computed font size, so this falls back to the documented default of 12
    const [band] = bands(mount(makeConfig({ plot: { clipIndicatorPadding: 5 } })));
    expect(band.height).toBe(12 + 5 * 2);
  });

  it('never grows deeper than the plot itself', () => {
    const container = mount(makeConfig({ plot: { clipIndicatorSize: 10000 } }));
    const plot = plotRect(container);
    expect(bands(container)[0].height).toBe(plot.height);
  });

  it('anchors a bottom band to the bottom of the plot', () => {
    const container = mount(makeConfig({ plot: { clipIndicatorSize: 8 } }), [{ c: 'a', v: -50 }, { c: 'b', v: 5 }]);
    const plot = plotRect(container);
    const [band] = bands(container);
    expect(band.edge).toBe('bottom');
    expect(band.y).toBe(plot.y + plot.height - 8);
  });
});

describe('band presentation', () => {
  it('is not a pointer target', () => {
    const container = mount();
    expect(container.querySelector('.mochart-clip-indicator')!.getAttribute('pointer-events')).toBe('none');
  });

  it('defaults to a currentColor tint', () => {
    const rect = mount().querySelector('.mochart-clip-indicator rect')!;
    expect(rect.getAttribute('fill')).toBe('currentColor');
    expect(rect.getAttribute('fill-opacity')).toBe('0.15');
  });

  it('takes its style from the config', () => {
    const rect = mount(makeConfig({ plot: { clipIndicatorStyle: { fillColor: '#ff0000', fillOpacity: 0.5 } } }))
      .querySelector('.mochart-clip-indicator rect')!;
    expect(rect.getAttribute('fill')).toBe('#ff0000');
    expect(rect.getAttribute('fill-opacity')).toBe('0.5');
  });

  it('sits in front of the series by default, and behind when asked', () => {
    const inFront = mount();
    const seriesContainer = inFront.querySelector('.mochart-series-container')!;
    const frontIndicator = inFront.querySelector('.mochart-clip-indicator')!;
    expect(seriesContainer.compareDocumentPosition(frontIndicator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const behind = mount(makeConfig({ plot: { clipIndicatorFront: false } }));
    const behindSeries = behind.querySelector('.mochart-series-container')!;
    const backIndicator = behind.querySelector('.mochart-clip-indicator')!;
    expect(behindSeries.compareDocumentPosition(backIndicator) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });
});

describe('updates', () => {
  it('appears and disappears as the data moves in and out of range', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const handle = createDefaultChart(container, {
      config: makeConfig(), data: contained, width: WIDTH, height: HEIGHT
    } as DefaultChartProps);
    handles.push(handle);
    expect(container.querySelector('.mochart-clip-indicator')).toBeNull();

    handle.update({ config: makeConfig(), data: overflowing, width: WIDTH, height: HEIGHT } as DefaultChartProps);
    expect(bands(container).map((band) => band.edge)).toEqual(['top']);

    handle.update({ config: makeConfig(), data: contained, width: WIDTH, height: HEIGHT } as DefaultChartProps);
    expect(container.querySelector('.mochart-clip-indicator')).toBeNull();
  });
});
