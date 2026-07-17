import { describe, it, expect } from 'vitest';
import { getSeriesFocusPercentage } from '../../src/utils/SeriesFocus';
import type { SeriesConfig } from '../../src/types/config';

function seriesConfig(overrides: Partial<SeriesConfig> = {}): SeriesConfig {
  return { id: 'S0', axis: 'SA0', useAxisFocus: true, ...overrides } as SeriesConfig;
}

describe('getSeriesFocusPercentage', () => {
  it('takes the larger of the axis and series focus when useAxisFocus is set', () => {
    expect(getSeriesFocusPercentage(seriesConfig(), { SA0: 0.75 }, { S0: 0.5 })).toBe(0.75);
    expect(getSeriesFocusPercentage(seriesConfig(), { SA0: 0.25 }, { S0: 0.5 })).toBe(0.5);
  });

  it('uses only the series focus when useAxisFocus is off', () => {
    expect(getSeriesFocusPercentage(seriesConfig({ useAxisFocus: false }), { SA0: 0.75 }, { S0: 0.5 })).toBe(0.5);
  });

  it('falls back to the series focus when the axis focus is null', () => {
    expect(getSeriesFocusPercentage(seriesConfig(), { SA0: null }, { S0: 0.5 })).toBe(0.5);
  });

  it('returns null when the axis or series entry is missing', () => {
    expect(getSeriesFocusPercentage(seriesConfig(), {}, { S0: 0.5 })).toBeNull();
    expect(getSeriesFocusPercentage(seriesConfig(), { SA0: 0.75 }, {})).toBeNull();
    expect(getSeriesFocusPercentage(seriesConfig({ axis: undefined }), { SA0: 0.75 }, { S0: 0.5 })).toBeNull();
  });
});
