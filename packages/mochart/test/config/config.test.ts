import { enhanceConfig } from '../../src';
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
        'version - should be equal to "' + VERSION_STRING + '": undefined',
        'groupAxisConfig - property - should be a defined value: undefined'
      ],
      warnings: []
    });
  });

  it('should validate a minimal valid config object', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      groupAxisConfig: {
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
      groupAxisConfig: {
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
      groupAxisConfig: {
        property: "p",
        bad: true
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [],
      warnings: [
        'groupAxisConfig - had 1 invalid properties: bad'
      ]
    });
  });

  it('should validate a config object with a single empty series', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      groupAxisConfig: {
        property: "p"
      },
      seriesConfigs: {

      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesConfigs[0] - property - should be a defined value: undefined'
      ],
      warnings: []
    });
  });

  it('should validate a config object with an empty all section', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      groupAxisConfig: {
        property: "p"
      },
      seriesAllConfig: {

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
      groupAxisConfig: {
        property: "p"
      },
      seriesAllConfig: "123"
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesAllConfig - should be an object: "123"'
      ],
      warnings: []
    });
  });

  it('should validate a config object with a non empty all section', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      groupAxisConfig: {
        property: "p"
      },
      seriesAllConfig: {
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
      groupAxisConfig: {
        property: "p"
      },
      seriesAllConfig: {
        shapeStyle: { normal: { fillColor: '#WWW' } }
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesAllConfig - shapeStyle.normal.fillColor - should be a valid svg color (or "none" / "currentColor") or be one of [ "seriesIndex", "groupIndex" ]: "#WWW"'
      ],
      warnings: []
    });
  });

  it('should validate a config object with an invalid all section and non empty valid list section', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      groupAxisConfig: {
        property: "p"
      },
      seriesAllConfig: {
        shapeStyle: { normal: { fillColor: '#WWW' } }
      },
      seriesConfigs: {
        property: "p",
        shapeStyle: { normal: { fillColor: '#fff' } }
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesAllConfig - shapeStyle.normal.fillColor - should be a valid svg color (or "none" / "currentColor") or be one of [ "seriesIndex", "groupIndex" ]: "#WWW"'
      ],
      warnings: []
    });
  });

  it('should validate a config object with an invalid all section and non empty invalid list section', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      groupAxisConfig: {
        property: "p"
      },
      seriesAllConfig: {
        shapeStyle: { normal: { fillColor: '#WWW' } }
      },
      seriesConfigs: {
        property: "p",
        shapeStyle: { normal: { fillColor: '#ZZZ' } }
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesAllConfig - shapeStyle.normal.fillColor - should be a valid svg color (or "none" / "currentColor") or be one of [ "seriesIndex", "groupIndex" ]: "#WWW"',
        'seriesConfigs[0] - shapeStyle.normal.fillColor - should be a valid svg color (or "none" / "currentColor") or be one of [ "seriesIndex", "groupIndex" ]: "#ZZZ"'
      ],
      warnings: []
    });
  });

  it('should validate a config object with an all section that specifies unique keys', () => {
    const mochartConfig = enhance({
      version: VERSION_STRING,
      groupAxisConfig: {
        property: "p"
      },
      seriesAllConfig: {
        id: 'id',
        order: 'order'
      },
      seriesConfigs: []
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesAllConfig - id - unique properties cannot be set on an all config',
        'seriesAllConfig - order - unique properties cannot be set on an all config'
      ],
      warnings: []
    });
  });
});
// Regression: sole-id defaults read the raw section arrays, so ignored entries
// blocked the sole-entry semantics; and a fully-ignored list section built zero
// entries instead of falling back to defaults like an unspecified section.
describe('ignored entries and sole-id defaults', () => {
  const base = { version: VERSION_STRING, groupAxisConfig: { property: 'g' } };

  it('an ignored second axis does not block the sole-axis default', () => {
    const mochartConfig = enhance({ ...base,
      seriesConfigs: [{ property: 'v' }],
      seriesAxisConfigs: [{ id: 'a' }, { id: 'b', ignore: true }]
    });
    expect(mochartConfig.validation.valid).toBe(true);
    expect(mochartConfig.seriesAxisConfigs.map(axisConfig => axisConfig.id)).toEqual(['a']);
    expect(mochartConfig.seriesConfigs[0].axis).toBe('a');
  });

  it('a fully-ignored axis section behaves like an unspecified one', () => {
    for (const seriesAxisConfigs of [[{ id: 'X', ignore: true }], [], { id: 'X', ignore: true }]) {
      const mochartConfig = enhance({ ...base, seriesConfigs: [{ property: 'v' }], seriesAxisConfigs });
      expect(mochartConfig.validation.valid).toBe(true);
      expect(mochartConfig.seriesAxisConfigs.map(axisConfig => axisConfig.id)).toEqual(['SA0']);
      expect(mochartConfig.seriesConfigs[0].axis).toBe('SA0');
    }
  });

  it('an ignored second stack does not block the sole-stack default', () => {
    const mochartConfig = enhance({ ...base,
      seriesConfigs: [{ property: 'v' }, { property: 'w' }],
      seriesStackConfigs: [{ id: 'st' }, { id: 'dead', ignore: true }]
    });
    expect(mochartConfig.validation.valid).toBe(true);
    expect(mochartConfig.seriesConfigs.map(seriesConfig => seriesConfig.stack)).toEqual(['st', 'st']);
  });

  it('two active axes still require an explicit series axis', () => {
    const mochartConfig = enhance({ ...base,
      seriesConfigs: [{ property: 'v' }],
      seriesAxisConfigs: [{ id: 'a' }, { id: 'b' }]
    });
    expect(mochartConfig.validation.valid).toBe(false);
    expect(mochartConfig.validation.errors).toEqual(['seriesConfigs[0] - axis - should be a string: undefined']);
  });
});

// Regression: the single-object list-section shape merged only defaults +
// entry, dropping the *AllConfig layer that the array shape applies.
describe('single-object sections with an all config', () => {
  const base = { version: VERSION_STRING, groupAxisConfig: { property: 'g' } };

  it('applies the all config to a single-object section like an array of one', () => {
    const single = enhance({ ...base, seriesConfigs: [{ property: 'v', axis: 'y' }],
      seriesAxisConfigs: { id: 'y' }, seriesAxisAllConfig: { gridLines: true } });
    expect(single.validation.valid).toBe(true);
    expect(single.seriesAxisConfigs[0].gridLines).toBe(true);
  });

  it('keeps conditional defaults consistent with the all config values', () => {
    const single = enhance({ ...base, seriesConfigs: { property: 'v' }, seriesAllConfig: { renderer: 'bar' } });
    const array = enhance({ ...base, seriesConfigs: [{ property: 'v' }], seriesAllConfig: { renderer: 'bar' } });
    expect(single.seriesConfigs[0].renderer).toBe('bar');
    expect(single.seriesConfigs[0].markerShape).toBe(array.seriesConfigs[0].markerShape);
  });

  it('applies gradient all configs to a single-object gradient section', () => {
    const single = enhance({ ...base, seriesConfigs: [{ property: 'v', gradient: 'lg' }],
      linearGradientConfigs: { id: 'lg' }, linearGradientAllConfig: { x2: 0.25 } });
    expect(single.linearGradientConfigs[0].x2).toBe(0.25);
  });

  it('keeps the entry winning over the all config', () => {
    const single = enhance({ ...base, seriesConfigs: { property: 'v', renderer: 'area' }, seriesAllConfig: { renderer: 'bar' } });
    expect(single.seriesConfigs[0].renderer).toBe('area');
  });
});
