import { enhanceConfig } from '../../src';
import type { MochartInputConfig } from '../../src';

const VERSION_STRING = "1.0.3";

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
        errors: ['config - should be an object: \"a\"'],
        warnings: []
      }
    });
  });

  it('should validate an empty object config', () => {
    const mochartConfig = enhance({});
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'version - should be equal to \"' + VERSION_STRING + '\": undefined',
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
        'seriesAllConfig - should be an object: \"123\"'
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
        fillColor: '#fff'
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
        fillColor: '#WWW'
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesAllConfig - fillColor - should be a valid svg color or be one of [ \"seriesIndex\", \"groupIndex\" ]: \"#WWW\"'
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
        fillColor: '#WWW'
      },
      seriesConfigs: {
        property: "p",
        fillColor: '#fff'
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesAllConfig - fillColor - should be a valid svg color or be one of [ \"seriesIndex\", \"groupIndex\" ]: \"#WWW\"'
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
        fillColor: '#WWW'
      },
      seriesConfigs: {
        property: "p",
        fillColor: '#ZZZ'
      }
    });
    expect(mochartConfig.validation).toEqual({
      valid: false,
      errors: [
        'seriesAllConfig - fillColor - should be a valid svg color or be one of [ \"seriesIndex\", \"groupIndex\" ]: \"#WWW\"',
        'seriesConfigs[0] - fillColor - should be a valid svg color or be one of [ \"seriesIndex\", \"groupIndex\" ]: \"#ZZZ\"'
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