/**
 * Regression test: a missingValues 'connect' bar series with a colorProperty must color
 * each bar from its raw group index. The bar renderer used the compacted
 * position index to look up color (and focus) values, so once a gap was
 * skipped every later bar read the wrong group's color value — the heatmap
 * helper's grids with missing cells hit this.
 */
import { describe, it, beforeAll, afterEach, expect, vi } from 'vitest';

const FRAME_MS = 16;

let mochart: typeof import('../../src');

beforeAll(async () => {
  const svgProto = globalThis.SVGElement.prototype as any;
  if (typeof svgProto.getComputedTextLength !== 'function') {
    svgProto.getComputedTextLength = () => 0;
  }
  if (typeof svgProto.getSubStringLength !== 'function') {
    svgProto.getSubStringLength = () => 0;
  }
  if (typeof svgProto.getBBox !== 'function') {
    svgProto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
  }
  if (typeof globalThis.requestAnimationFrame !== 'function') {
    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), FRAME_MS) as unknown as number;
    globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }
  vi.useFakeTimers({
    toFake: [
      'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
      'requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'Date'
    ]
  });
  mochart = await import('../../src');
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllTimers();
});

function runFrames(maxFrames = 500) {
  let frames = 0;
  while (vi.getTimerCount() > 0 && frames < maxFrames) {
    vi.advanceTimersByTime(FRAME_MS);
    frames++;
  }
}

describe('missingValues connect bar series with a colorProperty', () => {
  it('colors bars after a skipped group from their own color values', () => {
    const { createChart, enhanceConfig, ArrayOfObjectsDataProvider } = mochart;
    const mochartConfig = enhanceConfig({
      version: '1.0.0',
      categoryAxis: { property: 'label', type: 'string', scale: 'ordinal' },
      valueAxes: [{ id: 'sa' }],
      series: [{
        axis: 'sa', property: 'value', renderer: 'bar', missingValues: 'connect',
        colorProperty: 'heat',
        colorScale: { interpolation: 'rgb', min: '#000000', max: '#ffffff' }
      }]
    });
    // The middle group has no value, so positions compact to two bars while
    // the color values stay indexed 0..2.
    const data = [
      { label: 'a', value: 5, heat: 0 },
      { label: 'b' },
      { label: 'c', value: 9, heat: 100 }
    ];
    const container = document.createElement('div');
    document.body.appendChild(container);
    const chart = createChart(container, {
      mochartConfig,
      dataProvider: new ArrayOfObjectsDataProvider(data, 'label'),
      width: 300,
      height: 200
    });
    runFrames();

    expect(container.innerHTML).not.toContain('NaN');
    const fills = Array.from(container.querySelectorAll('path[fill^="rgb"]')).map((path) => path.getAttribute('fill'));
    expect(fills).toContain('rgb(0, 0, 0)');
    expect(fills).toContain('rgb(255, 255, 255)');

    chart.destroy();
  });
});
