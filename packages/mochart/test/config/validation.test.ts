import { describe, it, expect } from 'vitest';
import validateConfig, {
  getUniqueMessage,
  getReferenceMessage,
  getCommonReferenceMessage,
  validateConfigDetailed
} from '../../src/config/validation/mochartConfig';
import { getDefaults } from '../../src/config/defaults/mochartConfig';

const V = '1.0.0';

// Run the raw validator (input + derived defaults) the way enhanceConfig does,
// and return just the errors for assertion.
function errorsFor(config: unknown): string[] {
  const defaults = getDefaults(config as never);
  return validateConfig(config, defaults as never).errors;
}

function detailedFor(config: unknown) {
  const defaults = getDefaults(config as never);
  return validateConfigDetailed(config, defaults as never);
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

describe('icon size config validation', () => {
  it('accepts automatic or numeric tooltip icon sizes and rejects other strings', () => {
    expect(errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      tooltipConfig: { iconSize: 'auto' }
    })).toEqual([]);
    expect(errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      tooltipConfig: { iconSize: 20 }
    })).toEqual([]);
    expect(errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      tooltipConfig: { iconSize: 'large' }
    })).toContain('tooltipConfig - iconSize - should be a number >= to 0 or be equal to "auto": "large"');
  });

  it('accepts automatic or numeric legend icon sizes and rejects other strings', () => {
    expect(errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      legendConfig: { iconSize: 'auto' }
    })).toEqual([]);
    expect(errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      legendConfig: { iconSize: 20 }
    })).toEqual([]);
    expect(errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      legendConfig: { iconSize: 'large' }
    })).toContain('legendConfig - iconSize - should be a number >= to 0 or be equal to "auto": "large"');
  });
});

describe('detailed validation', () => {
  it('keeps the legacy result shape unchanged', () => {
    const config = { version: V, groupAxisConfig: { property: 'p' } };
    const defaults = getDefaults(config as never);
    expect(Object.keys(validateConfig(config, defaults as never))).toEqual(['valid', 'errors', 'warnings']);
  });

  it('adds a precise path for a section property error', () => {
    const config = {
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesConfigs: [{ property: 'a', axis: 'missing' }]
    };
    expect(detailedFor(config).diagnostics).toContainEqual(expect.objectContaining({
      path: ['seriesConfigs', 0, 'axis'],
      severity: 'error',
      source: 'mochart',
      message: 'should equal the id property of one of the seriesAxisConfigs: "missing"'
    }));
  });

  it('reports unknown top-level properties as a root warning', () => {
    const config = { version: V, groupAxisConfig: { property: 'p' }, unknownExtra: true };
    expect(detailedFor(config).diagnostics).toContainEqual(expect.objectContaining({
      path: [],
      severity: 'warning',
      source: 'mochart'
    }));
  });

  it('locates a root type error at the document root', () => {
    expect(detailedFor(null).diagnostics).toEqual([
      {
        path: [],
        severity: 'error',
        message: 'should be an object: null',
        source: 'mochart'
      }
    ]);
  });

  it('locates warnings on the relevant list entry', () => {
    const config = {
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesConfigs: [{ property: 'a', unknownExtra: true }]
    };
    expect(detailedFor(config).diagnostics).toContainEqual({
      path: ['seriesConfigs', 0],
      severity: 'warning',
      message: 'had 1 invalid properties: unknownExtra',
      source: 'mochart'
    });
  });

  it('locates every duplicate value independently', () => {
    const config = {
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesConfigs: [{ property: 'a', id: 'X' }, { property: 'b', id: 'X' }]
    };
    const paths = detailedFor(config).diagnostics
      .filter(diagnostic => diagnostic.message === 'should be unique: "X"')
      .map(diagnostic => diagnostic.path);
    expect(paths).toEqual([
      ['seriesConfigs', 0, 'id'],
      ['seriesConfigs', 1, 'id']
    ]);
  });

  it('locates all-config properties without a synthetic list index', () => {
    const config = {
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesAllConfig: { id: 'shared' },
      seriesConfigs: [{ property: 'a' }]
    };
    expect(detailedFor(config).diagnostics).toContainEqual({
      path: ['seriesAllConfig', 'id'],
      severity: 'error',
      message: 'unique properties cannot be set on an all config',
      source: 'mochart'
    });
  });

  it('locates a common-reference error at the target property', () => {
    const config = {
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesAxisConfigs: [{ id: 'A' }, { id: 'B' }],
      seriesStackConfigs: [{ id: 'S', axis: 'A' }],
      seriesConfigs: [{ property: 'a', stack: 'S', axis: 'B' }]
    };
    expect(detailedFor(config).diagnostics).toContainEqual(expect.objectContaining({
      path: ['seriesConfigs', 0, 'stack'],
      severity: 'error',
      source: 'mochart'
    }));
  });
});

describe('pie chart config validation', () => {
  it('accepts a valid pie config with a pieConfig section', () => {
    const errors = errorsFor({
      version: V,
      chartConfig: { type: 'pie' },
      pieConfig: { innerRadiusPercent: 0.6, startAngle: 45, showLabels: true, labelType: 'percent' },
      groupAxisConfig: { property: 'p' },
      seriesConfigs: [{ property: 'a' }, { property: 'b' }]
    });
    expect(errors).toEqual([]);
  });

  it('flags an unknown chartConfig.type', () => {
    const errors = errorsFor({ version: V, chartConfig: { type: 'radar' }, groupAxisConfig: { property: 'p' } });
    expect(errors.some(error => error.startsWith('chartConfig - type - '))).toBe(true);
  });

  it('flags out-of-range pieConfig percent values', () => {
    const errors = errorsFor({
      version: V,
      chartConfig: { type: 'pie' },
      pieConfig: { innerRadiusPercent: 1.5, labelMinAnglePercent: -1 },
      groupAxisConfig: { property: 'p' }
    });
    expect(errors.some(error => error.startsWith('pieConfig - innerRadiusPercent - '))).toBe(true);
    expect(errors.some(error => error.startsWith('pieConfig - labelMinAnglePercent - '))).toBe(true);
  });

  it('flags an unknown pieConfig.labelType', () => {
    const errors = errorsFor({
      version: V,
      chartConfig: { type: 'pie' },
      pieConfig: { labelType: 'nope' },
      groupAxisConfig: { property: 'p' }
    });
    expect(errors.some(error => error.startsWith('pieConfig - labelType - '))).toBe(true);
  });
});

// Regression: list-section validation paired the built (filtered) entries with
// the raw user array by position, so an ignore:true entry shifted every later
// entry onto the wrong index — garbage passed unvalidated and ignored entries
// produced false errors.
describe('list-section validation with ignored entries', () => {
  it('validates entries after an ignored entry at their raw index', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'g' },
      seriesConfigs: [{ ignore: true, property: 'x' }, { renderer: 'bogus', property: 'v', markerSize: -5 }]
    });
    expect(errors.some(error => error.startsWith('seriesConfigs[1] - renderer - '))).toBe(true);
    expect(errors.some(error => error.startsWith('seriesConfigs[1] - markerSize - '))).toBe(true);
    expect(errors.some(error => error.startsWith('seriesConfigs[0]'))).toBe(false);
  });

  it('does not validate ignored entries', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'g' },
      seriesConfigs: [{ ignore: true, property: null }, { property: 'v' }]
    });
    expect(errors).toEqual([]);
  });

  it('locates diagnostics after an ignored entry at the raw index', () => {
    const config = {
      version: V,
      groupAxisConfig: { property: 'g' },
      seriesConfigs: [{ ignore: true, property: 'x' }, { renderer: 'bogus', property: 'v' }]
    };
    expect(detailedFor(config).diagnostics).toContainEqual(expect.objectContaining({
      path: ['seriesConfigs', 1, 'renderer'],
      severity: 'error'
    }));
  });

  it('still runs once-per-section all-config checks when the first entry is ignored', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'g' },
      seriesAxisAllConfig: { id: 'shared' },
      seriesAxisConfigs: [{ ignore: true, id: 'dead' }, { id: 'y' }],
      seriesConfigs: [{ property: 'v', axis: 'y' }]
    });
    expect(errors.some(error => error.includes('unique properties cannot be set on an all config'))).toBe(true);
  });
});

// Regression: uniqueness was checked on the raw config and the defaults
// separately, so an explicit id colliding with another entry's defaulted id
// passed and collapsed the id-lookup maps.
describe('merged unique-key validation', () => {
  it('flags an explicit id colliding with a defaulted id', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesConfigs: [{ property: 'a', id: 'S1' }, { property: 'b' }]
    });
    expect(errors).toEqual(expect.arrayContaining([
      'seriesConfigs[0] - id - should be unique: "S1"',
      'seriesConfigs[1] - id - should be unique: "S1"'
    ]));
  });

  it('does not count ignored entries toward uniqueness', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesConfigs: [{ property: 'a', id: 'X', ignore: true }, { property: 'b', id: 'X' }]
    });
    expect(errors).toEqual([]);
  });

  it('reports raw indices when an ignored entry shifts the section', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'p' },
      seriesConfigs: [{ ignore: true, property: 'x' }, { property: 'a', id: 'X' }, { property: 'b', id: 'X' }]
    });
    expect(errors).toEqual(expect.arrayContaining([
      'seriesConfigs[1] - id - should be unique: "X"',
      'seriesConfigs[2] - id - should be unique: "X"'
    ]));
  });
});

// Regression: an array as the root config validated fully valid because the
// error branch re-checked with movalid's object(), which accepts arrays.
describe('non-object root configs', () => {
  it('rejects an array root config with an error', () => {
    const result = detailedFor([{ version: V }]);
    expect(result.valid).toBe(false);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0].message).toContain('should be an object');
  });
});

// Regression: the dash-array pattern was unanchored, so any string containing
// a digit passed.
describe('dash array validation', () => {
  it('rejects non-dash-array strings containing digits', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'p', gridLines: true, gridLineDashArray: 'abc5' },
      seriesConfigs: [{ property: 'a' }]
    });
    expect(errors.some(error => error.includes('gridLineDashArray'))).toBe(true);
  });

  it('accepts comma-separated dash arrays', () => {
    const errors = errorsFor({
      version: V,
      groupAxisConfig: { property: 'p', gridLines: true, gridLineDashArray: '5, 3' },
      seriesConfigs: [{ property: 'a' }]
    });
    expect(errors).toEqual([]);
  });
});
