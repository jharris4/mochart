/**
 * Group-axis variant tests: date and number axes (linear and ordinal scales),
 * tick label formatting (auto and explicit, prefix/suffix), explicit min/max
 * domains beyond the data, tick count overrides, and rotated (non-parallel)
 * tick labels. Charts are mounted through createDefaultChart in jsdom, and
 * assertions read the rendered group-axis tick labels.
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { installSvgMeasurementShims } from './svgShims';
import { createDefaultChart } from '../../src/createChart';
import type { ChartHandle } from '../../src/createChart';
import type { DefaultChartProps } from '../../src/types/chart';
import type { MochartInputConfig } from '../../src/types/config';

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

function makeConfig(groupAxisConfig: Record<string, unknown>, overrides: Record<string, unknown> = {}): MochartInputConfig {
  return {
    version: VERSION,
    animationConfig: { animate: false },
    groupAxisConfig,
    seriesConfigs: [{ property: 'sales' }],
    ...overrides
  } as unknown as MochartInputConfig;
}

let handles: ChartHandle<DefaultChartProps>[] = [];

function mountChart(config: MochartInputConfig, data: readonly unknown[]): Element {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const handle = createDefaultChart(container, {
    config, data, width: WIDTH, height: HEIGHT
  } as DefaultChartProps);
  handles.push(handle);
  return container;
}

function tickLabels(container: Element): string[] {
  const labels = container.querySelectorAll('.mochart-group-axis .mochart-axis-tick-labels text');
  return Array.from(labels).map(label => label.textContent ?? '');
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

describe('date group axes', () => {
  it('formats linear time axis ticks with an explicit format', () => {
    const container = mountChart(makeConfig({
      property: 'time', type: 'date', scale: 'linear', dateUTC: true, tickLabelFormat: '%H:%M'
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
      property: 'time', type: 'date', scale: 'ordinal', dateUTC: true, tickLabelFormat: '%Y-%m-%d'
    }), dateRows);
    const labels = tickLabels(container).filter(label => label !== '');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => /^2016-04-01$/.test(label))).toBe(true);
  });

  it('renders a local-time linear axis when dateUTC is off', () => {
    const container = mountChart(makeConfig({
      property: 'time', type: 'date', scale: 'linear', dateUTC: false, tickLabelFormat: '%H:%M'
    }), dateRows);
    expect(tickLabels(container).length).toBeGreaterThan(0);
  });
});

describe('number group axes', () => {
  it('formats ordinal number axis ticks with an explicit format', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'ordinal', tickLabelFormat: '.1f'
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
    expect(container.querySelector('[data-mochart-version]')).not.toBeNull();
  });

  it('renders a linear axis for a single data row with an explicit wider domain', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', min: -10, max: 10
    }), [numberRows[0]]);
    expect(container.querySelector('[data-mochart-version]')).not.toBeNull();
  });

  it('renders rotated (non-parallel) tick labels on a linear axis', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', tickLabelRotation: 45
    }), numberRows);
    expect(tickLabels(container).length).toBeGreaterThan(0);
  });
});

describe('tick label prefix and suffix', () => {
  it('applies a prefix', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', tickLabelPrefix: '$'
    }), numberRows);
    const labels = tickLabels(container).filter(label => label !== '');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => label.startsWith('$'))).toBe(true);
  });

  it('applies a suffix', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', tickLabelSuffix: '%'
    }), numberRows);
    const labels = tickLabels(container).filter(label => label !== '');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => label.endsWith('%'))).toBe(true);
  });

  it('applies both prefix and suffix', () => {
    const container = mountChart(makeConfig({
      property: 'level', type: 'number', scale: 'linear', tickLabelPrefix: '$', tickLabelSuffix: ' USD'
    }), numberRows);
    const labels = tickLabels(container).filter(label => label !== '');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(label => label.startsWith('$') && label.endsWith(' USD'))).toBe(true);
  });
});
