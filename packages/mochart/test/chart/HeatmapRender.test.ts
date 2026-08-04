/**
 * End-to-end render of the createHeatmap helper output: a grid with a missing
 * cell must draw one colored bar per cell on the hidden pinned series axis.
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

describe('heatmap helper rendering', () => {
  it('renders one colored cell per grid value', () => {
    const { createChart, createHeatmap, enhanceConfig, ArrayOfObjectsDataProvider } = mochart;
    const heatmap = createHeatmap([
      { label: 'A', values: [1, 2, 3] },
      { label: 'B', values: [4, undefined, 6] }
    ]);
    const mochartConfig = enhanceConfig({
      version: '1.0.0',
      tooltip: { visible: false },
      categoryAxis: heatmap.categoryAxis,
      valueAxes: [{ ...heatmap.valueAxisConfig, id: 'sa' }],
      series: heatmap.series.map((seriesConfig) => ({ ...seriesConfig, axis: 'sa' }))
    });
    expect(mochartConfig.validation.valid).toBe(true);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const chart = createChart(container, {
      mochartConfig,
      dataProvider: new ArrayOfObjectsDataProvider(heatmap.data as Record<string, string | number>[], 'column'),
      width: 300,
      height: 200
    });
    runFrames();

    expect(container.innerHTML).not.toContain('NaN');
    const fills = Array.from(container.querySelectorAll('path[fill^="rgb"]')).map((path) => path.getAttribute('fill'));
    expect(fills).toHaveLength(5);
    expect(new Set(fills).size).toBe(5);
    // The series axis names the rows via explicit ticks.
    const labels = Array.from(container.querySelectorAll('text')).map((text) => text.textContent);
    expect(labels).toContain('A');
    expect(labels).toContain('B');

    chart.destroy();
  });
});
