import { describe, it, expect } from 'vitest';
import migrateConfig, {
  migrateConfig_1_0_0_TO_1_0_1,
  migrateConfig_1_0_1_TO_1_0_2,
  migrateConfig_1_0_2_TO_1_0_3
} from '../../src/config/migration/mochartConfig';
import { CONFIG_VERSION } from '../../src/config/core/constants';

describe('migrateConfig', () => {
  it('bumps a 1.0.0 config all the way to the current version', () => {
    const migrated = migrateConfig({ version: '1.0.0' });
    expect(migrated.version).toBe(CONFIG_VERSION);
  });

  it('treats the pre-semver "1.0" version like 1.0.0', () => {
    const migrated = migrateConfig({ version: '1.0' });
    expect(migrated.version).toBe(CONFIG_VERSION);
  });

  it('leaves a current-version config untouched', () => {
    const config = { version: CONFIG_VERSION, foo: 1 };
    expect(migrateConfig(config)).toEqual(config);
  });

  it('leaves an unknown version untouched', () => {
    const config = { version: '9.9.9', foo: 1 };
    expect(migrateConfig(config)).toEqual(config);
  });

  it('applies every step cumulatively from 1.0.0', () => {
    const migrated = migrateConfig({
      version: '1.0.0',
      seriesConfigs: [{ property: 'p', color: '#abc' }],
      animationConfig: { valueChangeDuration: 500 },
      groupAxisConfig: { focusedTickMarks: true }
    });
    expect(migrated.version).toBe(CONFIG_VERSION);
    // 1.0.0 -> 1.0.1: color split into stroke/fill
    expect(migrated.seriesConfigs).toEqual([{ property: 'p', strokeColor: '#abc', fillColor: '#abc' }]);
    // 1.0.1 -> 1.0.2: valueChangeDuration copied to initialDuration
    expect(migrated.animationConfig).toEqual({ valueChangeDuration: 500, initialDuration: 500 });
    // 1.0.2 -> 1.0.3: focusedTickMarks renamed to focusTickMarks
    expect(migrated.groupAxisConfig).toEqual({ focusTickMarks: true });
  });
});

describe('migrateConfig_1_0_0_TO_1_0_1', () => {
  it('splits a series color into strokeColor and fillColor', () => {
    const migrated = migrateConfig_1_0_0_TO_1_0_1({
      version: '1.0.0',
      seriesConfigs: [{ property: 'a', color: 'red' }]
    });
    expect(migrated.seriesConfigs).toEqual([{ property: 'a', strokeColor: 'red', fillColor: 'red' }]);
    expect(migrated.version).toBe(CONFIG_VERSION);
  });

  it('leaves series without a color untouched', () => {
    const migrated = migrateConfig_1_0_0_TO_1_0_1({
      version: '1.0.0',
      seriesConfigs: [{ property: 'a', strokeColor: 'blue' }]
    });
    expect(migrated.seriesConfigs).toEqual([{ property: 'a', strokeColor: 'blue' }]);
  });

  it('tolerates a missing seriesConfigs array', () => {
    const migrated = migrateConfig_1_0_0_TO_1_0_1({ version: '1.0.0' });
    expect(migrated.seriesConfigs).toBeUndefined();
    expect(migrated.version).toBe(CONFIG_VERSION);
  });
});

describe('migrateConfig_1_0_1_TO_1_0_2', () => {
  it('copies valueChangeDuration to initialDuration', () => {
    const migrated = migrateConfig_1_0_1_TO_1_0_2({
      version: '1.0.1',
      animationConfig: { valueChangeDuration: 250 }
    });
    expect(migrated.animationConfig).toEqual({ valueChangeDuration: 250, initialDuration: 250 });
  });

  it('omits animationConfig entirely when absent', () => {
    const migrated = migrateConfig_1_0_1_TO_1_0_2({ version: '1.0.1' });
    expect(migrated).not.toHaveProperty('animationConfig');
  });
});

describe('migrateConfig_1_0_2_TO_1_0_3', () => {
  it('renames focusedTickMarks on the group axis', () => {
    const migrated = migrateConfig_1_0_2_TO_1_0_3({
      version: '1.0.2',
      groupAxisConfig: { focusedTickMarks: false, title: 't' }
    });
    expect(migrated.groupAxisConfig).toEqual({ focusTickMarks: false, title: 't' });
  });

  it('renames focusedTickMarks across a series axis array', () => {
    const migrated = migrateConfig_1_0_2_TO_1_0_3({
      version: '1.0.2',
      seriesAxisConfigs: [{ id: 'SA0', focusedTickMarks: true }]
    });
    expect(migrated.seriesAxisConfigs).toEqual([{ id: 'SA0', focusTickMarks: true }]);
  });
});
