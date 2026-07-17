import { describe, it, expect } from 'vitest';
import {
  getSeriesOpacities,
  getSeriesColor,
  getSeriesFillColor,
  getSeriesStrokeColor,
  getSeriesColorGenerator,
  getSeriesGradientColors
} from '../../src/utils/SeriesColors';
import { makeConfig } from '../data/fixtures';
import type { ColorPaletteConfig, SeriesConfig } from '../../src/types/config';

// Build a fully-defaulted series + palette, then spread overrides onto the
// series so colour fields under test are realistic rather than hand-rolled.
function setup() {
  const config = makeConfig({
    groupAxisConfig: { property: 'g', type: 'number', scale: 'ordinal' },
    seriesConfigs: [{ property: 'a' }]
  });
  const base = config.seriesConfigs[0];
  const colorPaletteConfig = (config as unknown as { colorPaletteConfig: ColorPaletteConfig }).colorPaletteConfig;
  const series = (over: Record<string, unknown>): SeriesConfig => ({ ...base, ...over } as SeriesConfig);
  return { colorPaletteConfig, series };
}

describe('getSeriesOpacities', () => {
  const { series } = setup();

  it('returns fill opacities for bar/area renderers', () => {
    const o = getSeriesOpacities(series({ renderer: 'bar', fillOpacity: 0.5, focusedFillOpacity: 0.9, defocusedFillOpacity: 0.1 }));
    expect(o).toEqual({ opacity: 0.5, focusedOpacity: 0.9, defocusedOpacity: 0.1 });
  });

  it('returns stroke opacities for the line renderer', () => {
    const o = getSeriesOpacities(series({ renderer: 'line', strokeOpacity: 0.6, focusedStrokeOpacity: 0.95, defocusedStrokeOpacity: 0.2 }));
    expect(o).toEqual({ opacity: 0.6, focusedOpacity: 0.95, defocusedOpacity: 0.2 });
  });

  it('returns marker opacities when there is no shape renderer but a marker', () => {
    const o = getSeriesOpacities(series({ renderer: 'none', markerShape: 'circle', markerFillOpacity: 0.7, markerFocusedFillOpacity: 1, markerDefocusedFillOpacity: 0.3 }));
    expect(o).toEqual({ opacity: 0.7, focusedOpacity: 1, defocusedOpacity: 0.3 });
  });

  it('falls back to label opacities when there is no renderer and no marker', () => {
    const o = getSeriesOpacities(series({ renderer: 'none', markerShape: null, labelFillOpacity: 0.8, labelFocusedFillOpacity: 1, labelDefocusedFillOpacity: 0.4 }));
    expect(o).toEqual({ opacity: 0.8, focusedOpacity: 1, defocusedOpacity: 0.4 });
  });
});

describe('getSeriesColor dispatch', () => {
  const { colorPaletteConfig, series } = setup();

  it('uses the fill color for bar/area', () => {
    expect(getSeriesColor(colorPaletteConfig, series({ renderer: 'bar', fillColor: '#abc' }))).toBe('#abc');
  });

  it('uses the stroke color for line', () => {
    expect(getSeriesColor(colorPaletteConfig, series({ renderer: 'line', strokeColor: '#def' }))).toBe('#def');
  });

  it('uses the marker fill color when there is a marker and no shape', () => {
    expect(getSeriesColor(colorPaletteConfig, series({ renderer: 'none', markerShape: 'circle', markerFillColor: '#123' }))).toBe('#123');
  });

  it('uses the label fill color when there is no shape and no marker', () => {
    expect(getSeriesColor(colorPaletteConfig, series({ renderer: 'none', markerShape: null, labelFillColor: '#456' }))).toBe('#456');
  });
});

describe('getColor palette + keyword resolution', () => {
  const { colorPaletteConfig, series } = setup();

  it('returns a plain configured color directly', () => {
    expect(getSeriesFillColor(colorPaletteConfig, series({ fillColor: '#ff0000' }))).toBe('#ff0000');
  });

  it('resolves "seriesIndex" to the palette color at that index (wrapping)', () => {
    const palette = colorPaletteConfig.series.fillColors;
    expect(getSeriesFillColor(colorPaletteConfig, series({ fillColor: 'seriesIndex' }), 1)).toBe(palette[1]);
    // wraps past the end
    expect(getSeriesFillColor(colorPaletteConfig, series({ fillColor: 'seriesIndex' }), palette.length + 2)).toBe(palette[2]);
  });

  it('resolves "groupIndex" to the palette color for the group index', () => {
    const palette = colorPaletteConfig.series.fillColors;
    expect(getSeriesFillColor(colorPaletteConfig, series({ fillColor: 'groupIndex' }), 0, null, '#fallback', 3)).toBe(palette[3]);
  });

  it('returns the default color for "groupIndex" when no group index is supplied', () => {
    expect(getSeriesFillColor(colorPaletteConfig, series({ fillColor: 'groupIndex' }), 0, null, '#fallback')).toBe('#fallback');
  });

  it('resolves "same" on a focused color back to the normal color', () => {
    // focused view, focusedStrokeColor="same" => reuse strokeColor
    const color = getSeriesStrokeColor(colorPaletteConfig, series({ strokeColor: '#normal', focusedStrokeColor: 'same' }), 0, 0.5);
    expect(color).toBe('#normal');
  });
});

describe('getSeriesColorGenerator', () => {
  const { series } = setup();
  const rawDomains = { color: [0, 10] } as never;
  const filteredValues = { color: [0, 5, 10] } as never;

  for (const interpolation of ['rgb', 'hsl', 'lab', 'hcl', null] as const) {
    it(`produces colors for a ${interpolation ?? 'default'} interpolation`, () => {
      const gen = getSeriesColorGenerator(
        series({ colorBase: null, colorMin: '#000000', colorMax: '#ffffff', colorInterpolation: interpolation }),
        null, rawDomains, filteredValues
      );
      expect(typeof gen(1)).toBe('string');
    });
  }

  it('splits above/below the color base into two scales', () => {
    const gen = getSeriesColorGenerator(
      series({ colorBase: 5, colorBaseBelowMin: '#000000', colorBaseBelowMax: '#0000ff', colorBaseAboveMin: '#ff0000', colorBaseAboveMax: '#ffffff', colorInterpolation: null }),
      null,
      { color: [0, 10] } as never,
      { color: [0, 5, 10] } as never
    );
    // below-base index (value 0) and above-base index (value 10) both yield colors
    expect(typeof gen(0)).toBe('string');
    expect(typeof gen(2)).toBe('string');
  });
});

describe('getSeriesGradientColors', () => {
  const { series } = setup();

  it('returns [min, max] when a plain color range is configured', () => {
    expect(getSeriesGradientColors(series({ colorBase: null, colorMin: '#000', colorMax: '#fff' }))).toEqual(['#000', '#fff']);
  });

  it('returns the four base colors when a color base range is configured', () => {
    expect(getSeriesGradientColors(series({
      colorBase: 5, colorBaseBelowMin: '#00f', colorBaseBelowMax: '#0ff', colorBaseAboveMin: '#f00', colorBaseAboveMax: '#ff0'
    }))).toEqual(['#00f', '#0ff', '#f00', '#ff0']);
  });

  it('returns null when no gradient colors are configured', () => {
    expect(getSeriesGradientColors(series({ colorBase: null, colorMin: null, colorMax: null }))).toBe(null);
  });
});
