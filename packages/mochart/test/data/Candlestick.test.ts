import { describe, it, expect } from 'vitest';
import { computeCandlesticks, createCandlestick } from '../../src/data/Candlestick';

describe('computeCandlesticks', () => {
  it('returns no candles for empty input', () => {
    expect(computeCandlesticks([])).toEqual([]);
  });

  it('computes the change and classifies directions by its sign', () => {
    const candles = computeCandlesticks([
      { label: 'Mon', open: 100, high: 105, low: 98, close: 103 },
      { label: 'Tue', open: 103, high: 104, low: 96, close: 97 },
      { label: 'Wed', open: 97, high: 99, low: 95, close: 97 }
    ]);
    expect(candles.map((candle) => candle.change)).toEqual([3, -6, 0]);
    expect(candles.map((candle) => candle.direction)).toEqual(['up', 'down', 'up']);
  });

  it('passes the raw values through', () => {
    const candles = computeCandlesticks([{ label: 'Mon', open: 100, high: 105, low: 98, close: 103 }]);
    expect(candles[0]).toEqual({ label: 'Mon', open: 100, high: 105, low: 98, close: 103, change: 3, direction: 'up' });
  });
});

describe('createCandlestick', () => {
  it('returns one row per candle keyed by direction', () => {
    const { data } = createCandlestick([
      { label: 'Mon', open: 100, high: 105, low: 98, close: 103 },
      { label: 'Tue', open: 103, high: 104, low: 96, close: 97 }
    ]);
    expect(data).toEqual([
      { label: 'Mon', open: 100, high: 105, low: 98, close: 103, up: 103, down: undefined, upHigh: 105, downHigh: undefined, change: 3, direction: 'up' },
      { label: 'Tue', open: 103, high: 104, low: 96, close: 97, up: undefined, down: 97, upHigh: undefined, downHigh: 104, change: -6, direction: 'down' }
    ]);
  });

  it('emits config fragments for ordinal wick and body bars', () => {
    const { groupAxisConfig, seriesConfigs } = createCandlestick([{ label: 'Mon', open: 1, high: 3, low: 0, close: 2 }]);
    expect(groupAxisConfig).toEqual({ property: 'label', type: 'string', scale: 'ordinal' });
    expect(seriesConfigs.map((seriesConfig) => seriesConfig.id)).toEqual(['upWick', 'downWick', 'up', 'down']);
    for (const seriesConfig of seriesConfigs) {
      expect(seriesConfig.renderer).toBe('bar');
      expect(seriesConfig.skipMissing).toBe(true);
      expect(seriesConfig.skipPartialRange).toBe(true);
      expect(seriesConfig.group).toBeNull();
      expect(seriesConfig.stack).toBeNull();
      expect(seriesConfig.fillOpacity).toBe(1);
      expect(seriesConfig.fillColor).toMatch(/^#/);
    }
  });

  it('spans wicks from low to high and bodies from open to close, split by direction', () => {
    const { seriesConfigs } = createCandlestick([{ label: 'Mon', open: 1, high: 3, low: 0, close: 2 }]);
    const [upWick, downWick, up, down] = seriesConfigs;
    expect(upWick).toMatchObject({ property: 'upHigh', rangeProperty: 'low', barWidthPercent: 0.15, showInLegend: false, followSeries: 'up', valueLabel: 'Range' });
    expect(downWick).toMatchObject({ property: 'downHigh', rangeProperty: 'low', barWidthPercent: 0.15, showInLegend: false, followSeries: 'down', valueLabel: 'Range' });
    expect(up).toMatchObject({ property: 'up', rangeProperty: 'open', barWidthPercent: 1, title: 'Up' });
    expect(down).toMatchObject({ property: 'down', rangeProperty: 'open', barWidthPercent: 1, title: 'Down' });
  });

  it('colors each wick to match its body', () => {
    const { seriesConfigs } = createCandlestick([{ label: 'Mon', open: 1, high: 3, low: 0, close: 2 }]);
    const [upWick, downWick, up, down] = seriesConfigs;
    expect(upWick.fillColor).toBe(up.fillColor);
    expect(downWick.fillColor).toBe(down.fillColor);
    expect(up.fillColor).not.toBe(down.fillColor);
  });

  it('honours custom titles, colors, widths and range title', () => {
    const { seriesConfigs } = createCandlestick([{ label: 'Mon', open: 1, high: 3, low: 0, close: 2 }], {
      seriesTitles: { up: 'Gain' },
      colors: { down: '#123456' },
      wickWidthPercent: 0.1,
      bodyWidthPercent: 0.7,
      rangeTitle: 'Low – High'
    });
    const [upWick, downWick, up, down] = seriesConfigs;
    expect(up.title).toBe('Gain');
    expect(down.title).toBe('Down');
    expect(downWick.fillColor).toBe('#123456');
    expect(down.fillColor).toBe('#123456');
    expect(upWick.barWidthPercent).toBe(0.1);
    expect(up.barWidthPercent).toBe(0.7);
    expect(upWick.valueLabel).toBe('Low – High');
    expect(downWick.valueLabel).toBe('Low – High');
  });

  it('returns empty data for empty input', () => {
    const { candles, data, seriesConfigs } = createCandlestick([]);
    expect(candles).toEqual([]);
    expect(data).toEqual([]);
    expect(seriesConfigs).toHaveLength(4);
  });
});
