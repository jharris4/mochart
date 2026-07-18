import { enhanceConfig } from '../../src';
import { ArrayOfObjectsDataProvider } from '../../src/data/DataProvider';
import type { MochartConfig, MochartInputConfig } from '../../src';

const VERSION = '1.0.0';

/**
 * Builds a fully-defaulted, validated MochartConfig from a partial input.
 * enhanceConfig is the same entry point the public API uses, so fixtures stay
 * in sync with real config defaults rather than being hand-assembled. Input is
 * intentionally loose — these fixtures feed runtime code that accepts untrusted
 * config, so the static config type is not enforced here.
 */
export function makeConfig(input: Record<string, unknown>): MochartConfig {
  return enhanceConfig({ version: VERSION, ...input } as MochartInputConfig);
}

/** A minimal valid config: one ordinal string group axis. */
export function ordinalConfig(groupAxisOverrides: Record<string, unknown> = {}): MochartConfig {
  return makeConfig({
    groupAxisConfig: { property: 'month', type: 'string', scale: 'ordinal', ...groupAxisOverrides }
  });
}

export { ArrayOfObjectsDataProvider };
