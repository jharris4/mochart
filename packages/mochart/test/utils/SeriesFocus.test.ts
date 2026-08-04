import { describe, it, expect } from 'vitest';
import { getSeriesFocusPercentage } from '../../src/utils/SeriesFocus';
import type { EnhancedSeriesConfig } from '../../src/types/enhanced';


function seriesConfig(overrides: Partial<EnhancedSeriesConfig> = {}): EnhancedSeriesConfig {
  return { id: 'S0', axis: 'VA0', useAxisFocus: true, ...overrides } as EnhancedSeriesConfig;
}

describe('getSeriesFocusPercentage', () => {
  it('takes the larger of the axis and series focus when useAxisFocus is set', () => {
    expect(getSeriesFocusPercentage(seriesConfig(), { VA0: 0.75 }, { S0: 0.5 })).toBe(0.75);
    expect(getSeriesFocusPercentage(seriesConfig(), { VA0: 0.25 }, { S0: 0.5 })).toBe(0.5);
  });

  it('uses only the series focus when useAxisFocus is off', () => {
    expect(getSeriesFocusPercentage(seriesConfig({ useAxisFocus: false }), { VA0: 0.75 }, { S0: 0.5 })).toBe(0.5);
  });

  it('falls back to the series focus when the axis focus is null', () => {
    expect(getSeriesFocusPercentage(seriesConfig(), { VA0: null }, { S0: 0.5 })).toBe(0.5);
  });

  it('returns null when the axis or series entry is missing', () => {
    expect(getSeriesFocusPercentage(seriesConfig(), {}, { S0: 0.5 })).toBeNull();
    expect(getSeriesFocusPercentage(seriesConfig(), { VA0: 0.75 }, {})).toBeNull();
    expect(getSeriesFocusPercentage(seriesConfig({ axis: undefined }), { VA0: 0.75 }, { S0: 0.5 })).toBeNull();
  });
});
