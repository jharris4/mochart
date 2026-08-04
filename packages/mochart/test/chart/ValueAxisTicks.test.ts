/**
 * Series axis explicit `ticks`: replaces the generated ticks with configured
 * { value, label } entries — labels fall back to the formatted value, and
 * ticks outside the current axis domain are hidden.
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

function renderChart(valueAxisConfig: Record<string, unknown>) {
  const { createChart, enhanceConfig, ArrayOfObjectsDataProvider } = mochart;
  const mochartConfig = enhanceConfig({
    version: '1.0.0',
    categoryAxis: { property: 'label', type: 'string', scale: 'ordinal', visible: false },
    valueAxes: [{ id: 'sa', min: 0, max: 3, ...valueAxisConfig }],
    series: [{ axis: 'sa', property: 'value', renderer: 'bar' }]
  });
  expect(mochartConfig.validation.valid).toBe(true);
  const data = [
    { label: 'a', value: 1 },
    { label: 'b', value: 3 }
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
  return { container, chart };
}

function getAxisLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('text'))
    .filter((text) => (text as SVGTextElement & { style: CSSStyleDeclaration }).style.visibility !== 'hidden')
    .map((text) => text.textContent ?? '')
    .filter((label) => label !== '');
}

describe('series axis explicit ticks', () => {
  it('renders exactly the configured ticks with their labels', () => {
    const { container, chart } = renderChart({
      ticks: [
        { value: 0.5, label: 'Low' },
        { value: 1.5, label: 'Mid' },
        { value: 2.5, label: 'High' }
      ]
    });
    expect(getAxisLabels(container).sort()).toEqual(['High', 'Low', 'Mid']);
    chart.destroy();
  });

  it('falls back to the formatted value when a tick has no label', () => {
    const { container, chart } = renderChart({
      ticks: [{ value: 1.5 }],
      tickLabelFormat: '.1f'
    });
    expect(getAxisLabels(container)).toEqual(['1.5']);
    chart.destroy();
  });

  it('hides ticks outside the axis domain', () => {
    const { container, chart } = renderChart({
      ticks: [
        { value: 1, label: 'In' },
        { value: 7, label: 'Out' }
      ]
    });
    const labels = getAxisLabels(container);
    expect(labels).toContain('In');
    expect(labels).not.toContain('Out');
    chart.destroy();
  });
});
