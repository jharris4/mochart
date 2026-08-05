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
    expect(getReferenceMessage('valueAxes', 'id'))
      .toBe('should equal the id property of one of the valueAxes');
  });

  it('getReferenceMessage joins multiple source sections with "or"', () => {
    expect(getReferenceMessage(['linearGradients', 'radialGradients'], 'id'))
      .toBe('should equal the id property of one of the linearGradients or radialGradients');
  });

  it('getCommonReferenceMessage mentions the shared property', () => {
    expect(getCommonReferenceMessage('seriesStacks', 'id', 'axis'))
      .toBe('should equal the id property of one of the seriesStacks that has the same axis property');
  });
});

describe('reference validation', () => {
  it('flags a series axis reference that matches no axis', () => {
    expect(errorsFor({ version: V, categoryAxis: { property: 'p' }, series: [{ property: 'a', axis: 'nope' }] }))
      .toContain('series[0] - axis - should equal the id property of one of the valueAxes: "nope"');
  });

  it('flags a gradient reference against the combined gradient sections', () => {
    expect(errorsFor({ version: V, categoryAxis: { property: 'p' }, series: [{ property: 'a', gradient: 'nope' }] }))
      .toContain('series[0] - gradient - should equal the id property of one of the linearGradients or radialGradients: "nope"');
  });

  it('accepts a series axis reference that resolves', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      valueAxes: [{ id: 'A' }],
      series: [{ property: 'a', axis: 'A' }]
    });
    expect(errors).toEqual([]);
  });
});

describe('common-reference validation', () => {
  it('flags a series whose stack lives on a different axis', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      valueAxes: [{ id: 'A' }, { id: 'B' }],
      seriesStacks: [{ id: 'S', axis: 'A' }],
      series: [{ property: 'a', stack: 'S', axis: 'B' }]
    });
    expect(errors).toContain(
      'series[0] - stack - should equal the id property of one of the seriesStacks that has the same axis property: "A" vs  "B"'
    );
  });

  it('accepts a series whose stack shares its axis', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      valueAxes: [{ id: 'A' }],
      seriesStacks: [{ id: 'S', axis: 'A' }],
      series: [{ property: 'a', stack: 'S', axis: 'A' }]
    });
    expect(errors).toEqual([]);
  });
});

describe('unique-key validation', () => {
  it('flags duplicate series ids at both offending indices', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      series: [{ property: 'a', id: 'X' }, { property: 'b', id: 'X' }]
    });
    expect(errors).toEqual(expect.arrayContaining([
      'series[0] - id - should be unique: "X"',
      'series[1] - id - should be unique: "X"'
    ]));
  });

  it('flags duplicate series axis ids', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      valueAxes: [{ id: 'A' }, { id: 'A' }],
      series: [{ property: 'a', axis: 'A' }]
    });
    expect(errors).toEqual(expect.arrayContaining([
      'valueAxes[0] - id - should be unique: "A"',
      'valueAxes[1] - id - should be unique: "A"'
    ]));
  });

  // Regression: the seen map was a plain {}, so a single entry with an
  // Object.prototype member name as its id was reported as a duplicate.
  it('does not flag a sole prototype-member-named id as a duplicate', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      valueAxes: [{ id: 'constructor' }],
      seriesStacks: [{ id: 'toString' }],
      series: [{ property: 'a', id: 'valueOf' }]
    });
    expect(errors.filter(error => error.includes('should be unique'))).toEqual([]);
  });

  it('still flags real duplicates of prototype-member-named ids', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      series: [{ property: 'a', id: 'constructor' }, { property: 'b', id: 'constructor' }]
    });
    expect(errors).toContainEqual(expect.stringContaining('should be unique: "constructor"'));
  });
});

describe('non-strict validation', () => {
  it('treats warnings as acceptable when strict is false', () => {
    // an unknown extra property produces a warning, not an error
    const config = { version: V, categoryAxis: { property: 'p' }, unknownExtra: 1 };
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
      categoryAxis: { property: 'p' },
      tooltip: { iconSize: 'auto' }
    })).toEqual([]);
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      tooltip: { iconSize: 20 }
    })).toEqual([]);
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      tooltip: { iconSize: 'large' }
    })).toContain('tooltip - iconSize - should be a number >= to 0 or be equal to "auto": "large"');
  });

  it('accepts automatic or numeric legend icon sizes and rejects other strings', () => {
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      legend: { iconSize: 'auto' }
    })).toEqual([]);
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      legend: { iconSize: 20 }
    })).toEqual([]);
    expect(errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      legend: { iconSize: 'large' }
    })).toContain('legend - iconSize - should be a number >= to 0 or be equal to "auto": "large"');
  });
});

describe('detailed validation', () => {
  it('keeps the legacy result shape unchanged', () => {
    const config = { version: V, categoryAxis: { property: 'p' } };
    const defaults = getDefaults(config as never);
    expect(Object.keys(validateConfig(config, defaults as never))).toEqual(['valid', 'errors', 'warnings']);
  });

  it('adds a precise path for a section property error', () => {
    const config = {
      version: V,
      categoryAxis: { property: 'p' },
      series: [{ property: 'a', axis: 'missing' }]
    };
    expect(detailedFor(config).diagnostics).toContainEqual(expect.objectContaining({
      path: ['series', 0, 'axis'],
      severity: 'error',
      source: 'mochart',
      message: 'should equal the id property of one of the valueAxes: "missing"'
    }));
  });

  it('reports unknown top-level properties as a root warning', () => {
    const config = { version: V, categoryAxis: { property: 'p' }, unknownExtra: true };
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
      categoryAxis: { property: 'p' },
      series: [{ property: 'a', unknownExtra: true }]
    };
    expect(detailedFor(config).diagnostics).toContainEqual({
      path: ['series', 0],
      severity: 'warning',
      message: 'had 1 invalid properties: unknownExtra',
      source: 'mochart'
    });
  });

  it('locates every duplicate value independently', () => {
    const config = {
      version: V,
      categoryAxis: { property: 'p' },
      series: [{ property: 'a', id: 'X' }, { property: 'b', id: 'X' }]
    };
    const paths = detailedFor(config).diagnostics
      .filter(diagnostic => diagnostic.message === 'should be unique: "X"')
      .map(diagnostic => diagnostic.path);
    expect(paths).toEqual([
      ['series', 0, 'id'],
      ['series', 1, 'id']
    ]);
  });

  it('locates all-config properties without a synthetic list index', () => {
    const config = {
      version: V,
      categoryAxis: { property: 'p' },
      seriesDefaults: { id: 'shared' },
      series: [{ property: 'a' }]
    };
    expect(detailedFor(config).diagnostics).toContainEqual({
      path: ['seriesDefaults', 'id'],
      severity: 'error',
      message: 'unique properties cannot be set on an all config',
      source: 'mochart'
    });
  });

  it('locates a common-reference error at the target property', () => {
    const config = {
      version: V,
      categoryAxis: { property: 'p' },
      valueAxes: [{ id: 'A' }, { id: 'B' }],
      seriesStacks: [{ id: 'S', axis: 'A' }],
      series: [{ property: 'a', stack: 'S', axis: 'B' }]
    };
    expect(detailedFor(config).diagnostics).toContainEqual(expect.objectContaining({
      path: ['series', 0, 'stack'],
      severity: 'error',
      source: 'mochart'
    }));
  });
});

describe('pie chart config validation', () => {
  it('accepts a valid pie config with a pieConfig section', () => {
    const errors = errorsFor({
      version: V,
      chart: { type: 'pie' },
      pie: { innerRadiusFraction: 0.6, startAngle: 45, showLabels: true, labelType: 'percent' },
      categoryAxis: { property: 'p' },
      series: [{ property: 'a' }, { property: 'b' }]
    });
    expect(errors).toEqual([]);
  });

  it('flags an unknown chartConfig.type', () => {
    const errors = errorsFor({ version: V, chart: { type: 'radar' }, categoryAxis: { property: 'p' } });
    expect(errors.some(error => error.startsWith('chart - type - '))).toBe(true);
  });

  it('flags out-of-range pieConfig percent values', () => {
    const errors = errorsFor({
      version: V,
      chart: { type: 'pie' },
      pie: { innerRadiusFraction: 1.5, labelMinFraction: -1 },
      categoryAxis: { property: 'p' }
    });
    expect(errors.some(error => error.startsWith('pie - innerRadiusFraction - '))).toBe(true);
    expect(errors.some(error => error.startsWith('pie - labelMinFraction - '))).toBe(true);
  });

  it('flags an unknown pieConfig.labelType', () => {
    const errors = errorsFor({
      version: V,
      chart: { type: 'pie' },
      pie: { labelType: 'nope' },
      categoryAxis: { property: 'p' }
    });
    expect(errors.some(error => error.startsWith('pie - labelType - '))).toBe(true);
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
      categoryAxis: { property: 'g' },
      series: [{ ignore: true, property: 'x' }, { renderer: 'bogus', property: 'v', markerSize: -5 }]
    });
    expect(errors.some(error => error.startsWith('series[1] - renderer - '))).toBe(true);
    expect(errors.some(error => error.startsWith('series[1] - markerSize - '))).toBe(true);
    expect(errors.some(error => error.startsWith('series[0]'))).toBe(false);
  });

  it('does not validate ignored entries', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'g' },
      series: [{ ignore: true, property: null }, { property: 'v' }]
    });
    expect(errors).toEqual([]);
  });

  it('locates diagnostics after an ignored entry at the raw index', () => {
    const config = {
      version: V,
      categoryAxis: { property: 'g' },
      series: [{ ignore: true, property: 'x' }, { renderer: 'bogus', property: 'v' }]
    };
    expect(detailedFor(config).diagnostics).toContainEqual(expect.objectContaining({
      path: ['series', 1, 'renderer'],
      severity: 'error'
    }));
  });

  it('still runs once-per-section all-config checks when the first entry is ignored', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'g' },
      valueAxisDefaults: { id: 'shared' },
      valueAxes: [{ ignore: true, id: 'dead' }, { id: 'y' }],
      series: [{ property: 'v', axis: 'y' }]
    });
    expect(errors.some(error => error.includes('unique properties cannot be set on an all config'))).toBe(true);
  });
});

// Regression: movalid's object() accepts arrays, so a list-section array with
// invalid entries slipped past both halves of the shape guard unreported.
describe('list-section shape validation', () => {
  it('flags a list-section array containing a non-object entry', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'g' },
      series: [{ property: 'v' }, 'garbage']
    });
    expect(errors).toContainEqual(expect.stringContaining('series - should be an array with elements that should be an object'));
  });

  it('flags a non-empty list section given an array of non-objects', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'g' },
      valueAxes: ['x'],
      series: [{ property: 'v' }]
    });
    expect(errors).toContainEqual(expect.stringContaining('valueAxes - should be a non-empty array'));
  });

  it('still tolerates the single-object list-section shorthand', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'g' },
      seriesGroups: {},
      series: [{ property: 'v' }]
    });
    expect(errors).toEqual([]);
  });

  it('flags an array given as a list-section entry', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'g' },
      series: [{ property: 'v' }, []]
    });
    expect(errors).toContainEqual(expect.stringContaining('series - should be an array with elements that should be an object'));
  });

  it('still tolerates an empty array as an unspecified section', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'g' },
      valueAxes: [],
      series: [{ property: 'v' }]
    });
    expect(errors).toEqual([]);
  });

  it('flags an array given as a *Defaults section', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'g' },
      seriesDefaults: [],
      series: [{ property: 'v' }]
    });
    expect(errors).toContainEqual(expect.stringContaining('seriesDefaults - should be an object'));
  });
});

// Regression: the tooltip drop-shadow offsets rejected negative values, though
// negative css box-shadow offsets (shadow cast up/left) are legitimate.
describe('tooltip drop-shadow validation', () => {
  const base = { version: V, categoryAxis: { property: 'p' }, series: [{ property: 'v' }] };

  it('accepts negative shadow offsets', () => {
    expect(errorsFor({ ...base, tooltip: { dropShadowOffsetX: -3, dropShadowOffsetY: -5 } })).toEqual([]);
  });

  it('still rejects a negative blur radius', () => {
    expect(errorsFor({ ...base, tooltip: { dropShadowBlurRadius: -1 } }))
      .toContainEqual(expect.stringContaining('dropShadowBlurRadius'));
  });
});

// Regression: margin/padding (and categoryPaddingFraction) demanded all their
// keys at once, though nested configs deep-merge over their defaults and the
// DeepPartial input type promises partial objects.
describe('partial spacing validation', () => {
  const base = { version: V, categoryAxis: { property: 'p' }, series: [{ property: 'v' }] };

  it('accepts partial margin, padding, and categoryPaddingFraction objects', () => {
    const errors = errorsFor({
      ...base,
      chart: { margin: { top: 10 } },
      tooltip: { padding: { left: 4 } },
      categoryAxis: { property: 'p', categoryPaddingFraction: { inner: 0.5 } }
    });
    expect(errors).toEqual([]);
  });

  it('accepts a palette entry with only one color list', () => {
    const errors = errorsFor({
      ...base,
      colorPalette: { series: { normal: { strokeColors: ['#336699'] } } }
    });
    expect(errors).toEqual([]);
  });

  it('still rejects invalid spacing member values', () => {
    expect(errorsFor({ ...base, chart: { margin: { top: -1 } } }))
      .toContainEqual(expect.stringContaining('margin'));
    expect(errorsFor({ ...base, categoryAxis: { property: 'p', categoryPaddingFraction: { inner: 2 } } }))
      .toContainEqual(expect.stringContaining('categoryPaddingFraction'));
  });

  it('reports an unknown spacing member as a warning only, not an error', () => {
    const detailed = detailedFor({ ...base, chart: { margin: { tpo: 1 } } });
    expect(detailed.errors.filter(error => error.includes('margin'))).toEqual([]);
    expect(detailed.warnings.some(warning => warning.includes('margin'))).toBe(true);
  });
});

// The null contract: plain styles accept null members (leave the svg
// attribute unset), while style states keep colors and opacities concrete so
// host css cannot bleed through and focus animation can interpolate. Widths
// and dash arrays are nullable in both.
describe('style null semantics', () => {
  const base = { version: V, categoryAxis: { property: 'p' } };

  it('accepts null members on a plain style', () => {
    const errors = errorsFor({ ...base, chart: { backgroundStyle: { strokeColor: null, fillOpacity: null } }, series: [{ property: 'v' }] });
    expect(errors).toEqual([]);
  });

  it('accepts a null stroke width on axis and series style states', () => {
    const errors = errorsFor({
      ...base,
      categoryAxis: { property: 'p', axisLineStyle: { normal: { strokeWidth: null } } },
      series: [{ property: 'v', shapeStyle: { normal: { strokeWidth: null }, focused: { strokeWidth: null } } }]
    });
    expect(errors).toEqual([]);
  });

  it('rejects null style-state colors on axis and series', () => {
    expect(errorsFor({ ...base, categoryAxis: { property: 'p', axisLineStyle: { normal: { strokeColor: null } } }, series: [{ property: 'v' }] }))
      .toContainEqual(expect.stringContaining('strokeColor'));
    expect(errorsFor({ ...base, series: [{ property: 'v', shapeStyle: { normal: { fillColor: null } } }] }))
      .toContainEqual(expect.stringContaining('fillColor'));
  });

  it('rejects null style-state opacities', () => {
    expect(errorsFor({ ...base, series: [{ property: 'v', shapeStyle: { normal: { fillOpacity: null } } }] }))
      .toContainEqual(expect.stringContaining('fillOpacity'));
  });
});

// Regression: curve was the only nested config validated with the exact-shape
// validator, so { param } alone (type comes from the default) was rejected and
// unknown members were hard errors instead of the single unknown-key warning.
describe('series curve validation', () => {
  it('accepts a curve with only param, relying on the type default', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      series: [{ property: 'a', curve: { param: 0.5 } }]
    });
    expect(errors).toEqual([]);
  });

  it('still rejects invalid curve member values', () => {
    expect(errorsFor({ version: V, categoryAxis: { property: 'p' }, series: [{ property: 'a', curve: { type: 'bogus' } }] }))
      .toContainEqual(expect.stringContaining('curve'));
    expect(errorsFor({ version: V, categoryAxis: { property: 'p' }, series: [{ property: 'a', curve: { param: 2 } }] }))
      .toContainEqual(expect.stringContaining('curve'));
  });

  it('reports an unknown curve member as a warning only, not an error', () => {
    const detailed = detailedFor({
      version: V,
      categoryAxis: { property: 'p' },
      series: [{ property: 'a', curve: { typo: 1 } }]
    });
    expect(detailed.errors.filter(error => error.includes('curve'))).toEqual([]);
    expect(detailed.warnings.some(warning => warning.includes('curve'))).toBe(true);
  });
});

// Regression: uniqueness was checked on the raw config and the defaults
// separately, so an explicit id colliding with another entry's defaulted id
// passed and collapsed the id-lookup maps.
describe('merged unique-key validation', () => {
  it('flags an explicit id colliding with a defaulted id', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      series: [{ property: 'a', id: 'S1' }, { property: 'b' }]
    });
    expect(errors).toEqual(expect.arrayContaining([
      'series[0] - id - should be unique: "S1"',
      'series[1] - id - should be unique: "S1"'
    ]));
  });

  it('does not count ignored entries toward uniqueness', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      series: [{ property: 'a', id: 'X', ignore: true }, { property: 'b', id: 'X' }]
    });
    expect(errors).toEqual([]);
  });

  it('reports raw indices when an ignored entry shifts the section', () => {
    const errors = errorsFor({
      version: V,
      categoryAxis: { property: 'p' },
      series: [{ ignore: true, property: 'x' }, { property: 'a', id: 'X' }, { property: 'b', id: 'X' }]
    });
    expect(errors).toEqual(expect.arrayContaining([
      'series[1] - id - should be unique: "X"',
      'series[2] - id - should be unique: "X"'
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
      categoryAxis: { property: 'p', showGridLines: true, gridLineStyle: { normal: { strokeDashArray: 'abc5' } } },
      series: [{ property: 'a' }]
    });
    expect(errors.some(error => error.includes('strokeDashArray'))).toBe(true);
  });

  it('accepts comma- and space-separated dash arrays', () => {
    for (const dashArray of ['5,3', '5, 3', '6 3']) {
      const errors = errorsFor({
        version: V,
        categoryAxis: { property: 'p', showGridLines: true, gridLineStyle: { normal: { strokeDashArray: dashArray } } },
        series: [{ property: 'a' }]
      });
      expect(errors).toEqual([]);
    }
  });

  it("accepts 'same' for focus-state width and dash but not on the normal state", () => {
    const valid = errorsFor({
      version: V,
      categoryAxis: { property: 'p', showGridLines: true, gridLineStyle: { focused: { strokeWidth: 'same', strokeDashArray: 'same' } } },
      series: [{ property: 'a' }]
    });
    expect(valid).toEqual([]);
    const invalid = errorsFor({
      version: V,
      categoryAxis: { property: 'p', showGridLines: true, gridLineStyle: { normal: { strokeWidth: 'same' } } },
      series: [{ property: 'a' }]
    });
    expect(invalid.some(error => error.includes('strokeWidth'))).toBe(true);
  });
});
