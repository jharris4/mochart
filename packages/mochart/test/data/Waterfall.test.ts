import { describe, it, expect } from 'vitest';
import { computeWaterfallSteps, createWaterfall } from '../../src/data/Waterfall';

describe('computeWaterfallSteps', () => {
  it('returns no steps for empty input', () => {
    expect(computeWaterfallSteps([])).toEqual([]);
  });

  it('accumulates delta steps into start/end ranges', () => {
    const steps = computeWaterfallSteps([
      { label: 'Revenue', value: 100 },
      { label: 'Costs', value: -40 },
      { label: 'Refunds', value: -10 }
    ]);
    expect(steps.map((step) => [step.start, step.end])).toEqual([
      [0, 100],
      [100, 60],
      [60, 50]
    ]);
    expect(steps.map((step) => step.cumulative)).toEqual([100, 60, 50]);
  });

  it('classifies directions by the sign of the change', () => {
    const steps = computeWaterfallSteps([
      { label: 'Up', value: 5 },
      { label: 'Flat', value: 0 },
      { label: 'Down', value: -5 },
      { label: 'End', total: true }
    ]);
    expect(steps.map((step) => step.direction)).toEqual(['increase', 'increase', 'decrease', 'total']);
  });

  it('spans total steps from the base to the running total', () => {
    const steps = computeWaterfallSteps([
      { label: 'A', value: 30 },
      { label: 'B', value: -10 },
      { label: 'Subtotal', total: true },
      { label: 'C', value: 5 },
      { label: 'End', total: true }
    ]);
    expect(steps[2]).toEqual({ label: 'Subtotal', delta: 20, start: 0, end: 20, cumulative: 20, direction: 'total' });
    expect(steps[4]).toEqual({ label: 'End', delta: 25, start: 0, end: 25, cumulative: 25, direction: 'total' });
  });

  it('resets the running total when a total step has an explicit value', () => {
    const steps = computeWaterfallSteps([
      { label: 'Opening', total: true, value: 120 },
      { label: 'Change', value: -20 },
      { label: 'Closing', total: true }
    ]);
    expect(steps[0]).toEqual({ label: 'Opening', delta: 120, start: 0, end: 120, cumulative: 120, direction: 'total' });
    expect(steps[1].start).toBe(120);
    expect(steps[2].end).toBe(100);
  });

  it('offsets everything from a non-zero base', () => {
    const steps = computeWaterfallSteps([
      { label: 'A', value: 10 },
      { label: 'End', total: true }
    ], 100);
    expect(steps[0]).toEqual({ label: 'A', delta: 10, start: 100, end: 110, cumulative: 110, direction: 'increase' });
    expect(steps[1]).toEqual({ label: 'End', delta: 10, start: 100, end: 110, cumulative: 110, direction: 'total' });
  });
});

describe('createWaterfall', () => {
  it('returns one row per step keyed by direction', () => {
    const { data } = createWaterfall([
      { label: 'Revenue', value: 100 },
      { label: 'Costs', value: -40 },
      { label: 'Profit', total: true }
    ]);
    expect(data).toEqual([
      { label: 'Revenue', start: 0, increase: 100, decrease: undefined, total: undefined, delta: 100, cumulative: 100, direction: 'increase' },
      { label: 'Costs', start: 100, increase: undefined, decrease: 60, total: undefined, delta: -40, cumulative: 60, direction: 'decrease' },
      { label: 'Profit', start: 0, increase: undefined, decrease: undefined, total: 60, delta: 60, cumulative: 60, direction: 'total' }
    ]);
  });

  it('emits config fragments for ordinal floating bars', () => {
    const { categoryAxis: categoryAxisConfig, series: seriesConfigs } = createWaterfall([{ label: 'A', value: 1 }]);
    expect(categoryAxisConfig).toEqual({ property: 'label', type: 'string', scale: 'ordinal' });
    expect(seriesConfigs.map((seriesConfig) => seriesConfig.id)).toEqual(['increase', 'decrease', 'total']);
    for (const seriesConfig of seriesConfigs) {
      expect(seriesConfig.property).toBe(seriesConfig.id);
      expect(seriesConfig.rangeProperty).toBe('start');
      expect(seriesConfig.renderer).toBe('bar');
      expect(seriesConfig.missingValues).toBe('connect');
      expect(seriesConfig.partialRangeIsMissing).toBe(true);
      expect(seriesConfig.group).toBeNull();
      expect(seriesConfig.stack).toBeNull();
      expect(seriesConfig.shapeStyle!.normal!.fillColor).toMatch(/^#/);
    }
  });

  it('honours custom titles, colors and base', () => {
    const { steps, series: seriesConfigs } = createWaterfall([{ label: 'A', value: 1 }], {
      base: 50,
      seriesTitles: { increase: 'Gains' },
      colors: { decrease: '#123456' }
    });
    expect(steps[0].start).toBe(50);
    expect(seriesConfigs[0].title).toBe('Gains');
    expect(seriesConfigs[1].title).toBe('Decrease');
    expect(seriesConfigs[1]!.shapeStyle!.normal!.fillColor).toBe('#123456');
  });

  it('returns empty data for empty input', () => {
    const { steps, data, series: seriesConfigs } = createWaterfall([]);
    expect(steps).toEqual([]);
    expect(data).toEqual([]);
    expect(seriesConfigs).toHaveLength(3);
  });
});
