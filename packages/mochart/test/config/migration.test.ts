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

  it('stamps a versionless config as the current format', () => {
    // this is the branch enhanceConfig relies on: no version means "written for the format in
    // use now", so later releases never run migration steps against it
    expect(migrateConfig({ foo: 1 })).toEqual({ version: CONFIG_VERSION, foo: 1 });
  });

  it('returns a copy rather than editing the caller\'s object', () => {
    const config: Record<string, unknown> = { foo: 1 };
    const migrated = migrateConfig(config);
    expect(migrated).not.toBe(config);
    expect('version' in config).toBe(false);
  });

  it('passes a non-object through untouched', () => {
    expect(migrateConfig(null as unknown as Record<string, unknown>)).toBeNull();
  });
});
