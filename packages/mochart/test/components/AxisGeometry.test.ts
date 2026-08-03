/**
 * Regression tests for inverted-chart geometry: the group-axis threshold
 * position and the per-side series label positions.
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

const VERSION = '1.0.0';

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: Record<string, unknown>, data: readonly unknown[]): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config: { version: VERSION, animationConfig: { animate: false }, ...config } as unknown as MochartInputConfig,
    data, width: 800, height: 600
  } as DefaultChartProps);
  handles.push(handle);
  return container;
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

function thresholdTranslateY(container: Element): number {
  const lineGroup = container.querySelector('.mochart-group-axis-threshold .mochart-axis-threshold > g');
  expect(lineGroup).not.toBeNull();
  const transform = lineGroup!.getAttribute('transform')!;
  return Number(transform.match(/translate\([^,]+,\s*([^)]+)\)/)![1]);
}

// Regression: the vertical branch assumed the bottom-up series-axis pixel
// convention, but a vertical group axis (inverted chart) ascends top-down, so
// group thresholds rendered mirrored.
describe('group-axis threshold on an inverted chart', () => {
  it('places a low threshold nearer the top than a high one', () => {
    const rows = Array.from({ length: 11 }, (_, g) => ({ g, value: g * 2 }));
    const configFor = (threshold: number) => ({
      plotConfig: { inverted: true },
      groupAxisConfig: { property: 'g', type: 'number', scale: 'linear', threshold },
      seriesConfigs: [{ property: 'value', renderer: 'bar' }]
    });
    const lowY = thresholdTranslateY(mountChart(configFor(2), rows));
    const highY = thresholdTranslateY(mountChart(configFor(8), rows));
    expect(lowY).toBeLessThan(highY);
  });
});

// Regression: getLabelPosition received the chart orientation as its
// isAboveBase argument and the dy came from the raw labelPosition, so
// labelAboveBasePosition/labelBelowBasePosition never applied.
describe('per-side series label positions', () => {
  const rows = [
    { g: 'A', value: 5 },
    { g: 'B', value: -3 }
  ];

  function labelAttrs(container: Element, index: number): { dy: string | null; anchor: string | null } {
    const label = container.querySelector('.mochart-series-label-' + index);
    expect(label).not.toBeNull();
    return { dy: label!.getAttribute('dy'), anchor: label!.getAttribute('text-anchor') };
  }

  it('applies labelAboveBasePosition to the above-base dy', () => {
    const container = mountChart({
      groupAxisConfig: { property: 'g', type: 'string', scale: 'ordinal' },
      seriesAxisConfigs: [{ base: 0 }],
      seriesConfigs: [{ property: 'value', renderer: 'bar', labelProperty: 'value', labelPosition: 'outside', labelAboveBasePosition: 'inside' }]
    }, rows);
    expect(labelAttrs(container, 0).dy).toBe('1.35em');   // above base, inside
    expect(labelAttrs(container, 1).dy).toBe('1.35em');   // below base, outside
  });

  it('applies labelBelowBasePosition to the below-base anchor on inverted charts', () => {
    const container = mountChart({
      plotConfig: { inverted: true },
      groupAxisConfig: { property: 'g', type: 'string', scale: 'ordinal' },
      seriesAxisConfigs: [{ base: 0 }],
      seriesConfigs: [{ property: 'value', renderer: 'bar', labelProperty: 'value', labelPosition: 'outside', labelBelowBasePosition: 'inside' }]
    }, rows);
    expect(labelAttrs(container, 0).anchor).toBe('start'); // above base, outside
    expect(labelAttrs(container, 1).anchor).toBe('start'); // below base, inside
  });
});
