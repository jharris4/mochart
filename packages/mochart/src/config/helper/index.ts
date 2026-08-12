import { getDefaults } from '../defaults/mochartConfig';
import { default as validateConfig } from '../validation/mochartConfig';
import { default as buildMochartConfig } from '../core/mochartConfig';
import { default as migrateConfig } from '../migration/mochartConfig';
import type { MochartConfig, MochartInputConfig } from '../../types/config';

/**
 * The parameter names the *current* format, but older formats are accepted and migrated: a stored
 * config read from JSON is untyped anyway, so the type only guides what you author.
 */
export function enhanceConfig(config: MochartInputConfig): MochartConfig {
  // a stored config arrives here, so bring it to the current format before anything reads it;
  // migration returns a copy, so the caller's object is untouched
  config = migrateConfig(config as Record<string, unknown>) as MochartInputConfig;
  const configDefaults = getDefaults(config);
  const configValidation = validateConfig(config, configDefaults);
  const mochartConfig = buildMochartConfig(config, configDefaults, configValidation);
  return mochartConfig;
}
