import { describe, expect, it } from 'vitest';
import { resolveLegendIconSize } from '../../src/layout/LegendLayout';
import type { LegendConfig } from '../../src/types/config';

describe('legend icon sizing', () => {
  it('uses measured text height for auto and preserves the placeholder fallback', () => {
    const automatic = { iconSize: 'auto' } as LegendConfig;

    expect(resolveLegendIconSize(automatic, { width: 80, height: 18 })).toBe(18);
    expect(resolveLegendIconSize(automatic, { width: 20, height: 20, default: true })).toBe(14);
    expect(resolveLegendIconSize(automatic, { width: 0, height: 0, empty: true })).toBe(14);
  });

  it('preserves an explicit pixel size', () => {
    const fixed = { iconSize: 12 } as LegendConfig;

    expect(resolveLegendIconSize(fixed, { width: 80, height: 18 })).toBe(12);
  });
});
