import { describe, it, expect } from 'vitest';

// The docs modules each default-export a getDescriptions() thunk returning a
// flat map of config-key -> human description. They feed the docs generator;
// this pins that every module loads and yields a non-empty description map.
const modules = (import.meta as unknown as {
  glob: (pattern: string, options: { eager: boolean }) => Record<string, { default: () => Record<string, string> }>;
}).glob('../../src/config/docs/*.ts', { eager: true });

describe('config/docs description modules', () => {
  const entries = Object.entries(modules);

  it('discovers every docs module', () => {
    // 18 per-section config docs + the top-level mochartConfig aggregator
    expect(entries.length).toBeGreaterThanOrEqual(18);
  });

  for (const [path, mod] of entries) {
    const name = path.split('/').pop();

    it(`${name} exports a non-empty description map of strings`, () => {
      expect(typeof mod.default).toBe('function');
      const descriptions = mod.default();
      expect(descriptions).toBeTypeOf('object');
      const values = Object.values(descriptions);
      expect(values.length).toBeGreaterThan(0);
      expect(values.every(v => typeof v === 'string' && v.length > 0)).toBe(true);
    });
  }
});
