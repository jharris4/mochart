import { describe, it, expect } from 'vitest';
import {
  getCutoutRectanglePath,
  getClipPathReference,
  getGradientReference
} from '../../src/utils/svgUtils';

describe('getCutoutRectanglePath', () => {
  it('builds two closed sub-paths (outer rect + inner cutout)', () => {
    const d = getCutoutRectanglePath(0, 0, 100, 50, 10, 10, 20, 20);
    // one moveTo per rectangle, each closed
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d.match(/Z/g)).toHaveLength(2);
  });

  it('places the outer rectangle corners at the expected coordinates', () => {
    const d = getCutoutRectanglePath(5, 6, 100, 50, 10, 10, 20, 20);
    expect(d.startsWith('M5,6')).toBe(true);
    // x+width, y+height corner
    expect(d).toContain('L105,56');
  });
});

describe('getClipPathReference', () => {
  it('wraps the id in a url() reference', () => {
    expect(getClipPathReference('clip1')).toBe('url(#clip1)');
  });
});

describe('getGradientReference', () => {
  it('wraps the id in a url() reference', () => {
    expect(getGradientReference('grad1')).toBe('url(#grad1)');
  });
});
