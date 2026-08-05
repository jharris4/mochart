import { enhanceConfig, buildMochartConfig, getDefaults, validateConfig } from '../../src';
import type { MochartInputConfig } from '../../src';

const VERSION_STRING = "1.0.0";

// enhanceConfig validates untrusted input at runtime, so these tests
// deliberately feed malformed values that the static type would reject.
const enhance = (config: unknown) => enhanceConfig(config as MochartInputConfig);

describe('config validation', () => {
  it('should validate a null config', () => {
    const mochartConfig = enhance(null);
    expect(mochartConfig).toEqual({
      validation: {
        valid: false,
        errors: ['config - should be an object: null'],
        warnings: []
      }
    });
  });

  it('should validate a string config', () => {
    const mochartConfig = enhance("a");
    expect(mochartConfig).toEqual({
      validation: {
        valid: false,
        errors: ['config - should be an object: "a"'],
        warnings: []
      }
    });
  });

  it('should validate an empty object config', () => {
    const mochartConfig = enhance({});
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'categoryAxis - property - should be a defined value: undefined'
      ],
      warnings: []
    });
  });

  it('accepts a config with no version, reading it as the current format', () => {
    const mochartConfig = enhance({
      categoryAxis: { property: 'month' },
      series: [{ property: 'sales' }]
    });
    expect(mochartConfig.validation).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('rejects an unknown version', () => {
    const mochartConfig = enhance({
      version: '0.9.0',
      categoryAxis: { property: 'month' },
      series: [{ property: 'sales' }]
    });
    expect(mochartConfig.validation.valid).toBe(false);
    expect(mochartConfig.validation.errors.some(error => error.includes('version'))).toBe(true);
  });

  it('should validate a minimal valid config object', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: {
        property: "p"
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: true,
      errors: [],
      warnings: []
    });
  });

  it('should validate a config object with extra properties', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: {
        property: "p"
      },
      bad: true
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [],
      warnings: [
        'config - had 1 invalid properties: bad'
      ]
    });
  });

  it('should validate a config object with extra properties in a section', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: {
        property: "p",
        bad: true
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [],
      warnings: [
        'categoryAxis - had 1 invalid properties: bad'
      ]
    });
  });

  it('should validate a config object with a single empty series', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: {
        property: "p"
      },
      series: {

      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'series[0] - property - should be a defined value: undefined'
      ],
      warnings: []
    });
  });

  it('should validate a config object with an empty all section', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: {
        property: "p"
      },
      seriesDefaults: {

      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: true,
      errors: [],
      warnings: []
    });
  });

  it('should validate a config object with a string all section', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: {
        property: "p"
      },
      seriesDefaults: "123"
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesDefaults - should be an object: "123"'
      ],
      warnings: []
    });
  });

  it('should validate a config object with a non empty all section', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: {
        property: "p"
      },
      seriesDefaults: {
        shapeStyle: { normal: { fillColor: '#fff' } }
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: true,
      errors: [],
      warnings: []
    });
  });

  it('should validate a config object with an invalid all section and empty list section', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: {
        property: "p"
      },
      seriesDefaults: {
        shapeStyle: { normal: { fillColor: '#WWW' } }
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesDefaults - shapeStyle.normal.fillColor - should be a valid svg color (or "none" / "currentColor") or be one of [ "seriesIndex", "categoryIndex" ]: "#WWW"'
      ],
      warnings: []
    });
  });

  it('should validate a config object with an invalid all section and non empty valid list section', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: {
        property: "p"
      },
      seriesDefaults: {
        shapeStyle: { normal: { fillColor: '#WWW' } }
      },
      series: {
        property: "p",
        shapeStyle: { normal: { fillColor: '#fff' } }
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesDefaults - shapeStyle.normal.fillColor - should be a valid svg color (or "none" / "currentColor") or be one of [ "seriesIndex", "categoryIndex" ]: "#WWW"'
      ],
      warnings: []
    });
  });

  it('should validate a config object with an invalid all section and non empty invalid list section', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: {
        property: "p"
      },
      seriesDefaults: {
        shapeStyle: { normal: { fillColor: '#WWW' } }
      },
      series: {
        property: "p",
        shapeStyle: { normal: { fillColor: '#ZZZ' } }
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesDefaults - shapeStyle.normal.fillColor - should be a valid svg color (or "none" / "currentColor") or be one of [ "seriesIndex", "categoryIndex" ]: "#WWW"',
        'series[0] - shapeStyle.normal.fillColor - should be a valid svg color (or "none" / "currentColor") or be one of [ "seriesIndex", "categoryIndex" ]: "#ZZZ"'
      ],
      warnings: []
    });
  });

  it('should validate a config object with an all section that specifies unique keys', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: {
        property: "p"
      },
      seriesDefaults: {
        id: 'id',
        order: 'order'
      },
      series: []
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesDefaults - id - unique properties cannot be set on an all config',
        'seriesDefaults - order - unique properties cannot be set on an all config'
      ],
      warnings: []
    });
  });
});
// Regression: sole-id defaults read the raw section arrays, so ignored entries
// blocked the sole-entry semantics; and a fully-ignored list section built zero
// entries instead of falling back to defaults like an unspecified section.
describe('ignored entries and sole-id defaults', () => {
  const base = { version: VERSION_STRING, categoryAxis: { property: 'g' } };

  it('an ignored second axis does not block the sole-axis default', () => {
    const mochartConfig = enhance({ ...base,
      series: [{ property: 'v' }],
      valueAxes: [{ id: 'a' }, { id: 'b', ignore: true }]
    });
    expect(mochartConfig.validation.valid).toBe(true);
    expect(mochartConfig.valueAxes.map(axisConfig => axisConfig.id)).toEqual(['a']);
    expect(mochartConfig.series[0].axis).toBe('a');
  });

  it('a fully-ignored axis section behaves like an unspecified one', () => {
    for (const valueAxisConfigs of [[{ id: 'X', ignore: true }], [], { id: 'X', ignore: true }]) {
      const mochartConfig = enhance({ ...base, series: [{ property: 'v' }], valueAxes: valueAxisConfigs });
      expect(mochartConfig.validation.valid).toBe(true);
      expect(mochartConfig.valueAxes.map(axisConfig => axisConfig.id)).toEqual(['VA0']);
      expect(mochartConfig.series[0].axis).toBe('VA0');
    }
  });

  it('an ignored second stack does not block the sole-stack default', () => {
    const mochartConfig = enhance({ ...base,
      series: [{ property: 'v' }, { property: 'w' }],
      seriesStacks: [{ id: 'st' }, { id: 'dead', ignore: true }]
    });
    expect(mochartConfig.validation.valid).toBe(true);
    expect(mochartConfig.series.map(seriesConfig => seriesConfig.stack)).toEqual(['st', 'st']);
  });

  it('two active axes still require an explicit series axis', () => {
    const mochartConfig = enhance({ ...base,
      series: [{ property: 'v' }],
      valueAxes: [{ id: 'a' }, { id: 'b' }]
    });
    expect(mochartConfig.validation.valid).toBe(false);
    expect(mochartConfig.validation.errors).toEqual(['series[0] - axis - should be a string: undefined']);
  });
});

// Regression: the single-object list-section shape merged only defaults +
// entry, dropping the *Defaults layer that the array shape applies.
describe('single-object sections with a *Defaults section', () => {
  const base = { version: VERSION_STRING, categoryAxis: { property: 'g' } };

  it('applies the all config to a single-object section like an array of one', () => {
    const single = enhance({ ...base, series: [{ property: 'v', axis: 'y' }],
      valueAxes: { id: 'y' }, valueAxisDefaults: { showGridLines: true } });
    expect(single.validation.valid).toBe(true);
    expect(single.valueAxes[0].showGridLines).toBe(true);
  });

  it('keeps conditional defaults consistent with the all config values', () => {
    const single = enhance({ ...base, series: { property: 'v' }, seriesDefaults: { renderer: 'bar' } });
    const array = enhance({ ...base, series: [{ property: 'v' }], seriesDefaults: { renderer: 'bar' } });
    expect(single.series[0].renderer).toBe('bar');
    expect(single.series[0].markerShape).toBe(array.series[0].markerShape);
  });

  it('applies gradient all configs to a single-object gradient section', () => {
    const single = enhance({ ...base, series: [{ property: 'v', gradient: 'lg' }],
      linearGradients: { id: 'lg' }, linearGradientDefaults: { x2: 0.25 } });
    expect(single.linearGradients[0].x2).toBe(0.25);
  });

  it('keeps the entry winning over the all config', () => {
    const single = enhance({ ...base, series: { property: 'v', renderer: 'area' }, seriesDefaults: { renderer: 'bar' } });
    expect(single.series[0].renderer).toBe('area');
  });
});

// Regression: the stack-axis map was keyed by raw axis ids, so a stack
// explicitly referencing a defaulted axis id (SA0) missed the base: 0 stacked
// default that the implicit reference received.
describe('stack referencing a defaulted axis id', () => {
  it('applies the stacked base default to the explicit SA0 reference', () => {
    const base = { version: VERSION_STRING, categoryAxis: { property: 'g' } };
    const explicit = enhance({ ...base,
      series: [{ property: 'a', stack: 'st' }, { property: 'b', stack: 'st' }],
      seriesStacks: [{ id: 'st', axis: 'VA0' }]
    });
    const implicit = enhance({ ...base,
      series: [{ property: 'a', stack: 'st' }, { property: 'b', stack: 'st' }],
      seriesStacks: [{ id: 'st' }]
    });
    expect(explicit.validation.valid).toBe(true);
    expect(explicit.valueAxes[0].base).toBe(0);
    expect(explicit.valueAxes[0].base).toBe(implicit.valueAxes[0].base);
  });
});

// Regression: order is meant to be an integer (the sorter coerces anything
// else to 0), but validation accepted any number, silently ignoring the value.
describe('non-integer order values', () => {
  it('rejects fractional orders instead of silently sorting them as 0', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: { property: 'g' },
      series: [{ property: 'a', order: 1.5 }, { property: 'b', order: 0.5 }]
    });
    expect(mochartConfig.validation.valid).toBe(false);
    expect(mochartConfig.validation.errors.some(error =>
      error.includes('order') && error.includes('should be an integer'))).toBe(true);
  });

  it('sorts integer orders', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: { property: 'g' },
      series: [{ property: 'a', order: 2 }, { property: 'b', order: 1 }]
    });
    expect(mochartConfig.validation.valid).toBe(true);
    expect(mochartConfig.series.map(seriesConfig => seriesConfig.id)).toEqual(['S1', 'S0']);
  });
});

// Regression: the id maps were plain {} objects, so ids and references named
// after Object.prototype members hit inherited values — a sole axis id of
// "constructor" crashed the build, and lookups returned functions.
describe('prototype-member-named ids', () => {
  it('accepts a prototype member name as an id end to end', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: { property: 'g' },
      valueAxes: [{ id: 'constructor' }],
      series: [{ property: 'v' }]
    });
    expect(mochartConfig.validation.valid).toBe(true);
    expect(mochartConfig.series[0].axis).toBe('constructor');
  });

  it('reports (instead of crashing on) a reference naming a prototype member', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      categoryAxis: { property: 'g' },
      series: [{ property: 'v', axis: 'constructor' }]
    });
    expect(mochartConfig.validation.valid).toBe(false);
    expect(mochartConfig.validation.errors).toContainEqual(
      expect.stringContaining('axis - should equal the id property of one of the valueAxes'));
  });
});

// Regression: sections absent from the user config installed the defaults' own
// entry objects into the built config, so the reference wiring mutated the
// caller-supplied defaults and re-validating with them flipped valid to false.
describe('caller-supplied defaults immutability', () => {
  it('buildMochartConfig leaves the defaults untouched', () => {
    // no valueAxes/seriesStacks/seriesGroups sections — all come from the defaults
    const config = { version: VERSION_STRING, categoryAxis: { property: 'g' }, series: [{ property: 'v' }] };
    const defaults = getDefaults(config);
    const snapshot = JSON.parse(JSON.stringify(defaults));
    const validation = validateConfig(config, defaults as never);
    expect(validation.valid).toBe(true);
    buildMochartConfig(config, defaults as never, validation);
    expect(defaults).toEqual(snapshot);
    expect(validateConfig(config, defaults as never).valid).toBe(true);
  });
});
