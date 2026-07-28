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

  it('colors each wick to match its body, with strokes matching the fills', () => {
    const { seriesConfigs } = createCandlestick([{ label: 'Mon', open: 1, high: 3, low: 0, close: 2 }]);
    const [upWick, downWick, up, down] = seriesConfigs;
    expect(upWick.fillColor).toBe(up.fillColor);
    expect(downWick.fillColor).toBe(down.fillColor);
    expect(up.fillColor).not.toBe(down.fillColor);
    // the focused 1px outline must not fall back to the palette-index color
    for (const seriesConfig of seriesConfigs) {
      expect(seriesConfig.strokeColor).toBe(seriesConfig.fillColor);
    }
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

  describe('hollow', () => {
    const items = [
      { label: 'Mon', open: 1, high: 3, low: 0, close: 2 }, // up
      { label: 'Tue', open: 2, high: 4, low: 1, close: 1.5 } // down
    ];

    it('splits each wick into upper and lower segments around the body', () => {
      const { seriesConfigs } = createCandlestick(items, { hollow: true });
      expect(seriesConfigs.map((seriesConfig) => seriesConfig.id))
        .toEqual(['upWick', 'downWick', 'upWickUpper', 'upWickLower', 'downWickUpper', 'downWickLower', 'up', 'down']);
      const byId = Object.fromEntries(seriesConfigs.map((seriesConfig) => [seriesConfig.id, seriesConfig]));
      expect(byId.upWickUpper).toMatchObject({ property: 'upHigh', rangeProperty: 'up', renderer: 'bar', showInLegend: false, showInTooltip: false, followSeries: 'up' });
      expect(byId.upWickLower).toMatchObject({ property: 'upOpen', rangeProperty: 'low', renderer: 'bar', followSeries: 'up' });
      expect(byId.downWickUpper).toMatchObject({ property: 'downHigh', rangeProperty: 'open', renderer: 'bar', followSeries: 'down' });
      expect(byId.downWickLower).toMatchObject({ property: 'down', rangeProperty: 'low', renderer: 'bar', followSeries: 'down' });
    });

    it('keeps the range tooltip row on a shapeless wick series with a matching icon color', () => {
      const { seriesConfigs } = createCandlestick(items, { hollow: true });
      const [upWick, downWick] = seriesConfigs;
      expect(upWick).toMatchObject({ renderer: 'none', markerShape: null, valueLabel: 'Range', followSeries: 'up' });
      expect(downWick).toMatchObject({ renderer: 'none', markerShape: null, valueLabel: 'Range', followSeries: 'down' });
      expect(upWick.labelFillColor).toBe(upWick.fillColor);
      expect(upWick.labelFillOpacity).toBe(1);
    });

    it('outlines the up body and keeps the down body filled', () => {
      const { seriesConfigs } = createCandlestick(items, { hollow: true });
      const byId = Object.fromEntries(seriesConfigs.map((seriesConfig) => [seriesConfig.id, seriesConfig]));
      expect(byId.up).toMatchObject({
        fillOpacity: 0, focusedFillOpacity: 0, defocusedFillOpacity: 0,
        strokeWidth: 2, strokeOpacity: 1, focusedStrokeWidth: 3, defocusedStrokeWidth: 2
      });
      expect(byId.up.strokeColor).toBe(byId.up.fillColor);
      expect(byId.down).toMatchObject({ fillOpacity: 1 });
      // filled bodies keep the default zero-width stroke, in the fill color
      expect(byId.down.strokeColor).toBe(byId.down.fillColor);
      expect(byId.down.strokeWidth).toBeUndefined();
    });

    it('adds the upOpen column only in hollow mode', () => {
      const hollowData = createCandlestick(items, { hollow: true }).data;
      expect(hollowData[0].upOpen).toBe(1); // up day
      expect(hollowData[1].upOpen).toBeUndefined(); // down day
      const filledData = createCandlestick(items).data;
      expect('upOpen' in filledData[0]).toBe(false);
    });
  });
});
