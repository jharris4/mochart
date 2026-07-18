import { describe, it, expect } from 'vitest';
import migrateConfig from '../../src/config/migration/mochartConfig';
import { CONFIG_VERSION } from '../../src/config/core/constants';

describe('migrateConfig', () => {
  it('leaves a current-version config untouched', () => {
    const config = { version: CONFIG_VERSION, foo: 1 };
    expect(migrateConfig(config)).toEqual(config);
  });

  it('leaves an unknown version untouched', () => {
    const config = { version: '9.9.9', foo: 1 };
    expect(migrateConfig(config)).toEqual(config);
  });
});
