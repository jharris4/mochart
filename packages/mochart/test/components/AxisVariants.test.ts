// Category-axis variants: date/number axes on linear and ordinal scales, tick label
// formatting (auto/explicit, prefix/suffix), explicit min/max, tick counts, rotated labels
import { describe, it, expect, beforeAll } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { mockBoundingClientRect, mountContainer, trackHandle } from './helpers';
import { createDefaultChart } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';
import { getDescendantCssSelector, getChartRootCssSelector } from '../../src/utils/ChartDom';

const VERSION = '1.0.0';
const WIDTH = 800;
const HEIGHT = 600;

const dateRows = [
  { time: '2016-04-01T00:20:00Z', sales: 10 },
  { time: '2016-04-01T01:35:00Z', sales: 20 },
  { time: '2016-04-01T02:50:00Z', sales: 30 },
  { time: '2016-04-01T04:05:00Z', sales: 25 }
];

const numberRows = [
  { level: 0, sales: 10 },
  { level: 2, sales: 20 },
  { level: 4, sales: 30 },
  { level: 10, sales: 25 }
];

function makeConfig(categoryAxis: Record<string, unknown>, overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: VERSION,
    animation: { animate: false },
    categoryAxis,
    series: [{ property: 'sales' }],
    ...overrides
  } as unknown as MochartInputConfig;
}

function mountChart(config: MochartInputConfig, data: readonly unknown[]): Element {
  const container = mountContainer();
  trackHandle(createDefaultChart(container, {
    config, data, width: WIDTH, height: HEIGHT
  } as DefaultChartProps));
  return container;
}

function tickLabels(container: Element): string[] {
  const labels = container.querySelectorAll(getDescendantCssSelector('categoryAxis', 'axisTickLabels') + ' text');
  return Array.from(labels).map(label => label.textContent ?? '');
}

beforeAll(() => {
  installSvgMeasurementShims();
  mockBoundingClientRect(WIDTH, HEIGHT);
});

describe('date category axes', () => {
  it('formats linear time axis ticks with an explicit format', () => {
    const container = mountChart(makeConfig({
      property: 'time', type: 'date', scale: 'linear', dateUTC: true, tickLabel: { format: '%H:%M' }
    }), dateRows);
    const labels = tickLabels(container);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => /^\d{2}:\d{2}$/.test(label))).toBe(true);
  });

  it('formats linear time axis ticks with the auto format', () => {
    const container = mountChart(makeConfig({
      property: 'time', type: 'date', scale: 'linear', dateUTC: true
    }), dateRows);
    expect(tickLabels(container).length).toBeGreaterThan(0);
  });

  it('formats a single-tick linear time axis with the auto date format', () => {
    const container = mountChart(makeConfig({
      property: 'time', type: 'date', scale: 'linear', dateUTC: true, tickCount: 1
    }), dateRows);
    expect(tickLabels(container).length).toBeGreaterThan(0);
  });

  it('formats ordinal date axis ticks with the auto date format', () => {
    const container = mountChart(makeConfig({
      property: 'time', type: 'date', scale: 'ordinal', dateUTC: true
    }), dateRows);
    const labels = tickLabels(container);
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some(label => label.length > 0)).toBe(true);
  });

  it('formats ordinal date axis ticks with an explicit format', () => {
    const container = mountChart(makeConfig({
      property: 'time', type: 'date', scale: 'ordinal', dateUTC: true, tickLabel: { format: '%Y-%m-%d' }
    }), dateRows);
    const labels = tickLabels(container).filter(label => label !== '');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => /^2016-04-01$/.test(label))).toBe(true);
  });

  it('renders a local-time linear axis when dateUTC is off', () => {
    const container = mountChart(makeConfig({
      property: 'time', type: 'date', scale: 'linear', dateUTC: false, tickLabel: { format: '%H:%M' }
    }), dateRows);
    expect(tickLabels(container).length).toBeGreaterThan(0);
  });
});

describe('number category axes', () => {
  it('formats ordinal number axis ticks with an explicit format', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'ordinal', tickLabel: { format: '.1f' }
    }), numberRows);
    const labels = tickLabels(container).filter(label => label !== '');
    expect(labels).toContain('0.0');
    expect(labels).toContain('10.0');
  });

  it('extends a linear axis with extra ticks for explicit min and max', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', min: -3.5, max: 19.5
    }), numberRows);
    const labels = tickLabels(container);
    // natural ticks span −2..18; the extra pre/post ticks for the domain
    // bounds render with the shared step-2 tick format as −4 and 20
    expect(labels[0]).toBe('−4');
    expect(labels).toContain('20');
    expect(labels).toContain('18');
  });

  it('limits tick count with minTickInterval', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', minTickInterval: 5
    }), numberRows);
    const labels = tickLabels(container).filter(label => label !== '');
    // domain extent 10 / interval 5 => at most 3 ticks
    expect(labels.length).toBeLessThanOrEqual(3 + 1); // +1 for the sizing tick
  });

  it('renders a single tick when tickCount is 1', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', tickCount: 1
    }), numberRows);
    expect(tickLabels(container).length).toBeGreaterThan(0);
  });

  it('renders a linear axis for a single data row', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear'
    }), [numberRows[0]]);
    expect(container.querySelector(getChartRootCssSelector())).not.toBeNull();
  });

  it('renders a linear axis for a single data row with an explicit wider domain', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', min: -10, max: 10
    }), [numberRows[0]]);
    expect(container.querySelector(getChartRootCssSelector())).not.toBeNull();
  });

  it('renders rotated (non-parallel) tick labels on a linear axis', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', tickLabel: { rotation: 45 }
    }), numberRows);
    expect(tickLabels(container).length).toBeGreaterThan(0);
  });
});

describe('tick label prefix and suffix', () => {
  it('applies a prefix', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', tickLabel: { prefix: '$' }
    }), numberRows);
    const labels = tickLabels(container).filter(label => label !== '');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => label.startsWith('$'))).toBe(true);
  });

  it('applies a suffix', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', tickLabel: { suffix: '%' }
    }), numberRows);
    const labels = tickLabels(container).filter(label => label !== '');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => label.endsWith('%'))).toBe(true);
  });

  it('applies both prefix and suffix', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', tickLabel: {
        prefix: '$',
        suffix: ' USD'
      }
    }), numberRows);
    const labels = tickLabels(container).filter(label => label !== '');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => label.startsWith('$') && label.endsWith(' USD'))).toBe(true);
  });
});
