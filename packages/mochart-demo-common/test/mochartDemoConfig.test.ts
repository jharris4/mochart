import { describe, it, expect } from 'vitest';

import buildMochartDemoConfig from '../src/mochartDemoConfig';

// buildMochartConfig wires back-references into the section objects it is
// given; the editor views must stay on a separate object graph so they remain
// JSON-serializable. A config with no explicit valueAxisConfigs (defaults
// supply the sole axis) is the shape that used to produce a circular
// configWithDefaults.
describe('buildMochartDemoConfig', () => {
  it('keeps the editor views serializable for a config with defaulted axes', () => {
    const bundle = buildMochartDemoConfig({
      version: '1.0.0',
      title: { text: 'Revenue' },
      categoryAxis: { property: 'month', type: 'string', scale: 'ordinal' },
      seriesDefaults: { renderer: 'bar' },
      series: [{ property: 'revenue', title: 'Revenue' }]
    });
    expect(bundle.valid).toBe(true);
    expect(() => JSON.stringify(bundle.config)).not.toThrow();
    expect(() => JSON.stringify(bundle.configWithDefaults)).not.toThrow();
    expect(() => JSON.stringify(bundle.configWithoutDefaults)).not.toThrow();
  });
});
