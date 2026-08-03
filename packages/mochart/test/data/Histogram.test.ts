import { describe, it, expect } from 'vitest';
import { binValues, createHistogram } from '../../src/data/Histogram';

describe('binValues', () => {
  it('returns no bins for empty input', () => {
    expect(binValues([])).toEqual([]);
  });

  it('ignores non-finite values', () => {
    expect(binValues([NaN, Infinity, -Infinity])).toEqual([]);
    const bins = binValues([NaN, 1, 2, Infinity], { binWidth: 1, nice: false });
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(2);
  });

  it('bins values into half-open intervals with the max included in the last bin', () => {
    const bins = binValues([0, 1, 2, 5, 9, 10], { binWidth: 5 });
    expect(bins.map((bin) => [bin.start, bin.end])).toEqual([
      [0, 5],
      [5, 10]
    ]);
    // 0, 1, 2 → [0, 5); 5, 9 → [5, 10); 10 sits on the final edge and is kept.
    expect(bins.map((bin) => bin.count)).toEqual([3, 3]);
  });

  it('counts every value exactly once', () => {
    const values = Array.from({ length: 500 }, (_, i) => Math.sin(i) * 100);
    const bins = binValues(values);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(values.length);
  });

  it('produces nice bin edges by default', () => {
    const bins = binValues([1.3, 2.7, 9.4, 14.2, 19.9]);
    for (const bin of bins) {
      expect(bin.end - bin.start).toBeCloseTo(bins[0].end - bins[0].start);
      expect(Number.isInteger(bin.start * 100)).toBe(true);
    }
    expect(bins[0].start).toBeLessThanOrEqual(1.3);
    expect(bins[bins.length - 1].end).toBeGreaterThanOrEqual(19.9);
  });

  it('divides the domain exactly when nice is false', () => {
    const bins = binValues([1, 9], { binCount: 4, nice: false });
    expect(bins).toHaveLength(4);
    expect(bins[0].start).toBe(1);
    expect(bins[3].end).toBe(9);
  });

  it('handles a single value', () => {
    const bins = binValues([5]);
    expect(bins).toHaveLength(1);
    expect(bins[0].count).toBe(1);
    expect(bins[0].start).toBeLessThanOrEqual(5);
    expect(bins[0].end).toBeGreaterThanOrEqual(5);
  });

  it('handles all-identical values', () => {
    const bins = binValues([3, 3, 3, 3]);
    expect(bins).toHaveLength(1);
    expect(bins[0].count).toBe(4);
  });

  it('drops values outside an explicit domain', () => {
    const bins = binValues([-5, 1, 2, 3, 99], { domain: [0, 10], binWidth: 5 });
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
  });

  it('throws on an inverted domain', () => {
    expect(() => binValues([1, 2], { domain: [10, 0] })).toThrow();
  });

  it('avoids floating point noise on fractional bin edges', () => {
    const bins = binValues([0.05, 0.15, 0.25, 0.35], { binWidth: 0.1 });
    expect(bins.map((bin) => bin.start)).toEqual([0, 0.1, 0.2, 0.3]);
    expect(bins.map((bin) => bin.count)).toEqual([1, 1, 1, 1]);
  });

  it('normalizes to probabilities summing to 1', () => {
    const bins = binValues([1, 2, 3, 4, 5, 6, 7, 8], { binWidth: 2, normalize: 'probability' });
    expect(bins.reduce((sum, bin) => sum + bin.value, 0)).toBeCloseTo(1);
  });

  it('normalizes to a density integrating to 1', () => {
    const bins = binValues([1, 2, 3, 4, 5, 6, 7, 8], { binWidth: 2, normalize: 'density' });
    const integral = bins.reduce((sum, bin) => sum + bin.value * (bin.end - bin.start), 0);
    expect(integral).toBeCloseTo(1);
  });

  it('accumulates when cumulative is set', () => {
    const bins = binValues([1, 2, 3, 4], { binWidth: 2, cumulative: true, normalize: 'probability' });
    expect(bins[bins.length - 1].value).toBeCloseTo(1);
    for (let i = 1; i < bins.length; i++) {
      expect(bins[i].value).toBeGreaterThanOrEqual(bins[i - 1].value);
    }
  });
});

describe('createHistogram', () => {
  it('returns rows keyed by the default properties', () => {
    const { data } = createHistogram([0, 1, 2, 8, 9], { binWidth: 5 });
    expect(data).toEqual([
      { binLabel: '0–5', value: 3, binStart: 0, binEnd: 5, binCenter: 2.5, count: 3 },
      { binLabel: '5–10', value: 2, binStart: 5, binEnd: 10, binCenter: 7.5, count: 2 }
    ]);
  });

  it('honours a custom value property and bin label', () => {
    const { data, seriesConfig } = createHistogram([1, 2], {
      binWidth: 5,
      valueProperty: 'freq',
      binLabel: (bin) => `<${bin.end}`
    });
    expect(data[0].freq).toBe(2);
    expect(data[0].binLabel).toBe('<5');
    expect(seriesConfig.property).toBe('freq');
  });

  it('emits config fragments for touching ordinal bars', () => {
    const { groupAxisConfig, seriesConfig } = createHistogram([1, 2, 3]);
    expect(groupAxisConfig).toEqual({
      property: 'binLabel',
      type: 'string',
      scale: 'ordinal',
      groupPadding: { inner: 0, outer: 0 }
    });
    expect(seriesConfig.renderer).toBe('bar');
    expect(seriesConfig.title).toBe('Count');
  });

  it('titles the series after the normalization', () => {
    expect(createHistogram([1], { normalize: 'density' }).seriesConfig.title).toBe('Density');
    expect(createHistogram([1], { seriesTitle: 'Ages' }).seriesConfig.title).toBe('Ages');
  });

  it('returns empty data for empty input', () => {
    const { bins, data } = createHistogram([]);
    expect(bins).toEqual([]);
    expect(data).toEqual([]);
  });
});

// Regression: the bin index came from the raw float quotient while the bins
// report rounded edges, so a value exactly on a non-representable edge
// ((0.3-0)/0.1 = 2.999...) was counted one bin low, contradicting the
// documented half-open [start, end) semantics.
describe('bin membership on floating-point edges', () => {
  it('counts an edge value into the bin whose reported edges contain it', () => {
    const bins = binValues([0, 0.3, 1], { binWidth: 0.1 });
    const binFor = (value: number) =>
      bins.find(bin => bin.start <= value && (value < bin.end || bin === bins[bins.length - 1]))!;
    expect(binFor(0.3).count).toBe(1);
    expect(bins.find(bin => bin.start === 0.2)!.count).toBe(0);
  });

  it('respects the reported edges across non-representable widths', () => {
    for (const binWidth of [0.1, 0.2, 0.3, 0.7]) {
      for (let k = 1; k < 10; k++) {
        const edge = k * binWidth;
        const bins = binValues([0, edge, 10 * binWidth], { binWidth });
        const target = bins.find(bin => bin.start <= edge && (edge < bin.end || bin === bins[bins.length - 1]))!;
        expect(target.count).toBeGreaterThan(0);
      }
    }
  });
});
