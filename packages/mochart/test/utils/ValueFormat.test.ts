import { describe, it, expect } from 'vitest';
import { scaleLinear } from 'd3-scale';
import {
  getGroupFormat,
  getSeriesFormat,
  getSeriesFormats,
  getSeriesLabelFormat
} from '../../src/utils/ValueFormat';
import type { GroupAxisConfig, SeriesAxisConfig, SeriesConfig } from '../../src/types/config';

// These formatters read only a few fields; cast small partials to keep the
// fixtures focused on the branch under test.
const groupAxis = (over: Record<string, unknown>): GroupAxisConfig => over as unknown as GroupAxisConfig;
const seriesAxis = (over: Record<string, unknown>): SeriesAxisConfig => over as unknown as SeriesAxisConfig;
const series = (over: Record<string, unknown>): SeriesConfig => over as unknown as SeriesConfig;

describe('getGroupFormat', () => {
  it('is an identity for string groups with no formatting', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'string', valueFormat: null, valuePrefix: null, valueSuffix: null
    }));
    expect(fmt('Jan')).toBe('Jan');
  });

  it('stringifies dates as a UTC string when dateUTC is set', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'date', dateUTC: true, valueFormat: null, valuePrefix: null, valueSuffix: null
    }));
    const d = new Date(Date.UTC(2020, 0, 1));
    expect(fmt(d)).toBe(d.toUTCString());
  });

  it('stringifies dates with toString when dateUTC is false', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'date', dateUTC: false, valueFormat: null, valuePrefix: null, valueSuffix: null
    }));
    const d = new Date(2020, 0, 1);
    expect(fmt(d)).toBe(d.toString());
  });

  it('uses auto tickLabelFormat for dates when valueFormat is auto', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'date', dateUTC: true, valueFormat: 'auto', tickLabelFormat: 'auto',
      valuePrefix: null, valueSuffix: null
    }));
    // %c produces a full locale date/time string; just assert it is non-empty text
    expect(typeof fmt(new Date(Date.UTC(2021, 5, 15)))).toBe('string');
    expect((fmt(new Date(Date.UTC(2021, 5, 15))) as string).length).toBeGreaterThan(0);
  });

  it('uses an explicit tickLabelFormat for dates when valueFormat is auto', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'date', dateUTC: true, valueFormat: 'auto', tickLabelFormat: '%Y',
      valuePrefix: null, valueSuffix: null
    }));
    expect(fmt(new Date(Date.UTC(2021, 5, 15)))).toBe('2021');
  });

  it('applies an explicit d3 number format', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'number', dateUTC: false, valueFormat: '.1f', valuePrefix: null, valueSuffix: null
    }));
    expect(fmt(3.14159)).toBe('3.1');
  });

  it('applies an explicit date format via timeFormat', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'date', dateUTC: true, valueFormat: '%Y', valuePrefix: null, valueSuffix: null
    }));
    expect(fmt(new Date(Date.UTC(2021, 5, 15)))).toBe('2021');
  });

  it('uses auto tickLabelFormat for numbers when valueFormat is auto', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'number', dateUTC: false, valueFormat: 'auto', tickLabelFormat: 'auto',
      valuePrefix: null, valueSuffix: null
    }));
    // .2s SI-prefixed: 1500 -> "1.5k"
    expect(fmt(1500)).toBe('1.5k');
  });

  it('uses an explicit tickLabelFormat for numbers when valueFormat is auto', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'number', dateUTC: false, valueFormat: 'auto', tickLabelFormat: '.0f',
      valuePrefix: null, valueSuffix: null
    }));
    expect(fmt(1234.9)).toBe('1235');
  });

  it('applies prefix and suffix around the formatted value', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'number', dateUTC: false, valueFormat: '.0f', valuePrefix: '$', valueSuffix: ' USD'
    }));
    expect(fmt(5)).toBe('$5 USD');
  });

  it('applies a prefix only', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'number', dateUTC: false, valueFormat: '.0f', valuePrefix: '$', valueSuffix: null
    }));
    expect(fmt(5)).toBe('$5');
  });

  it('applies a suffix only', () => {
    const fmt = getGroupFormat(groupAxis({
      type: 'number', dateUTC: false, valueFormat: '.0f', valuePrefix: null, valueSuffix: '%'
    }));
    expect(fmt(5)).toBe('5%');
  });
});

describe('getSeriesFormat', () => {
  const scale = scaleLinear().domain([0, 100]);

  it('is an identity when valueFormat is none', () => {
    const fmt = getSeriesFormat(
      series({ valueFormat: null, valuePrefix: null, valueSuffix: null }),
      seriesAxis({ tickLabelFormat: 'auto' }),
      scale
    );
    expect(fmt(42)).toBe(42);
  });

  it('applies an explicit d3 format', () => {
    const fmt = getSeriesFormat(
      series({ valueFormat: '$.2f', valuePrefix: null, valueSuffix: null }),
      seriesAxis({ tickLabelFormat: 'auto' }),
      scale
    );
    expect(fmt(9.5)).toBe('$9.50');
  });

  it('derives an auto format from the axis scale', () => {
    const fmt = getSeriesFormat(
      series({ valueFormat: 'auto', valuePrefix: null, valueSuffix: null }),
      seriesAxis({ tickLabelFormat: 'auto' }),
      scale
    );
    // auto uses the scale's tickFormat; just assert it produces a string
    expect(typeof fmt(50)).toBe('string');
  });

  it('applies prefix and suffix', () => {
    const fmt = getSeriesFormat(
      series({ valueFormat: '.0f', valuePrefix: '<', valueSuffix: '>' }),
      seriesAxis({ tickLabelFormat: 'auto' }),
      scale
    );
    expect(fmt(7)).toBe('<7>');
  });
});

describe('getSeriesFormats', () => {
  it('builds a formatter per series keyed by series id', () => {
    const configs = [
      series({ id: 's1', valueFormat: '.0f', valuePrefix: null, valueSuffix: null,
        seriesAxisConfig: seriesAxis({ id: 'y' }) }),
      series({ id: 's2', valueFormat: null, valuePrefix: null, valueSuffix: null,
        seriesAxisConfig: seriesAxis({ id: 'y' }) })
    ];
    const axisConfigs = [seriesAxis({ id: 'y', tickLabelFormat: 'auto' })];
    const formats = getSeriesFormats(configs, axisConfigs, { y: [0, 100] });
    expect(Object.keys(formats)).toEqual(['s1', 's2']);
    expect(formats.s1(12.7)).toBe('13');
    expect(formats.s2(12.7)).toBe(12.7);
  });
});

describe('getSeriesLabelFormat', () => {
  const scale = scaleLinear().domain([0, 100]);

  it('is an identity when labelFormat is none', () => {
    const fmt = getSeriesLabelFormat(series({ labelFormat: null }), seriesAxis({}), scale);
    expect(fmt(3)).toBe(3);
  });

  it('applies an explicit label format', () => {
    const fmt = getSeriesLabelFormat(series({ labelFormat: '.1f' }), seriesAxis({}), scale);
    expect(fmt(3.14)).toBe('3.1');
  });

  it('delegates to the series value format when labelFormat is auto', () => {
    const fmt = getSeriesLabelFormat(
      series({ labelFormat: 'auto', valueFormat: '.0f', valuePrefix: null, valueSuffix: null }),
      seriesAxis({ tickLabelFormat: 'auto' }),
      scale
    );
    expect(fmt(8.6)).toBe('9');
  });
});
