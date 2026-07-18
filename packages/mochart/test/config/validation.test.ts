import { describe, it, expect } from 'vitest';
import validateConfig, {
  getUniqueMessage,
  getReferenceMessage,
  getCommonReferenceMessage
} from '../../src/config/validation/mochartConfig';
import { getDefaults } from '../../src/config/defaults/mochartConfig';

const V = '1.0.0';

// Run the raw validator (input + derived defaults) the way enhanceConfig does,
// and return just the errors for assertion.
function errorsFor(config: unknown): string[] {
  const defaults = getDefaults(config as never);
  return validateConfig(config, defaults as never).errors;
}

describe('validation message helpers', () => {
  it('getUniqueMessage', () => {
    expect(getUniqueMessage()).toBe('should be unique');
  });

  it('getReferenceMessage names a single source section', () => {
    expect(getReferenceMessage('seriesAxisConfigs', 'id'))
      .toBe('should equal the id property of one of the seriesAxisConfigs');
  });

  it('getReferenceMessage joins multiple source sections with "or"', () => {
    expect(getReferenceMessage(['linearGradientConfigs', 'radialGradientConfigs'], 'id'))
      .toBe('should equal the id property of one of the linearGradientConfigs or radialGradientConfigs');
  });

  it('getCommonReferenceMessage mentions the shared property', () => {
    expect(getCommonReferenceMessage('seriesStackConfigs', 'id', 'axis'))
      .toBe('should equal the id property of one of the seriesStackConfigs that has the same axis property');
  });
});

describe('reference validation', () => {
  it('flags a series axis reference that matches no axis', () => {
    expect(errorsFor({ version: V, groupAxisConfig: { property: 'p' }, seriesConfigs: [{ property: 'a', axis: 'nope' }] }))
      .toContain('seriesConfigs[0] - axis - should equal the id property of one of the seriesAxisConfigs: "nope"');
  });

  it('flags a gradient reference against the combined gradient sections', () => {
    expect(errorsFor({ version: V, groupAxisConfig: { property: 'p' }, seriesConfigs: [{ property: 'a', gradient: 'nope' }] }))
      .toContain('seriesConfigs[0] - gradient - should equal the id property of one of the linearGradientConfigs or radialGradientConfigs: "nope"');
  });

  it('accepts a series axis reference that resolves', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesAxisConfigs: [{ id: 'A' }],
      seriesConfigs: [{ property: 'a', axis: 'A' }]
    });
    expect(errors).toEqual([]);
  });
});

describe('common-reference validation', () => {
  it('flags a series whose stack lives on a different axis', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesAxisConfigs: [{ id: 'A' }, { id: 'B' }],
      seriesStackConfigs: [{ id: 'S', axis: 'A' }],
      seriesConfigs: [{ property: 'a', stack: 'S', axis: 'B' }]
    });
    expect(errors).toContain(
      'seriesConfigs[0] - stack - should equal the id property of one of the seriesStackConfigs that has the same axis property: "A" vs  "B"'
    );
  });

  it('accepts a series whose stack shares its axis', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesAxisConfigs: [{ id: 'A' }],
      seriesStackConfigs: [{ id: 'S', axis: 'A' }],
      seriesConfigs: [{ property: 'a', stack: 'S', axis: 'A' }]
    });
    expect(errors).toEqual([]);
  });
});

describe('unique-key validation', () => {
  it('flags duplicate series ids at both offending indices', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesConfigs: [{ property: 'a', id: 'X' }, { property: 'b', id: 'X' }]
    });
    expect(errors).toEqual(expect.arrayContaining([
      'seriesConfigs[0] - id - should be unique: "X"',
      'seriesConfigs[1] - id - should be unique: "X"'
    ]));
  });

  it('flags duplicate series axis ids', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesAxisConfigs: [{ id: 'A' }, { id: 'A' }],
      seriesConfigs: [{ property: 'a', axis: 'A' }]
    });
    expect(errors).toEqual(expect.arrayContaining([
      'seriesAxisConfigs[0] - id - should be unique: "A"',
      'seriesAxisConfigs[1] - id - should be unique: "A"'
    ]));
  });
});

describe('non-strict validation', () => {
  it('treats warnings as acceptable when strict is false', () => {
    // an unknown extra property produces a warning, not an error
    const config = { version: V, groupAxisConfig: { property: 'p' }, unknownExtra: 1 };
    const defaults = getDefaults(config as never);
    const strict = validateConfig(config, defaults as never, true);
    const lenient = validateConfig(config, defaults as never, false);
    expect(strict.warnings.length).toBeGreaterThan(0);
    expect(strict.valid).toBe(false);
    expect(lenient.valid).toBe(true);
  });
});
