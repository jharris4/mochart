import { getDefaults } from '../defaults/mochartConfig';
import { default as validateConfig } from '../validation/mochartConfig';
import { default as buildMochartConfig } from '../core/mochartConfig';
import { default as migrateConfig } from '../migration/mochartConfig';
import type { MochartConfig, MochartInputConfig } from '../../types/config';

/** The parameter type names the current format; older formats are accepted and migrated. */
export function enhanceConfig(config: MochartInputConfig): MochartConfig {
  // migrate a stored config to the current format first; migration returns a copy, so the caller's object is untouched
  config = migrateConfig(config as Record<string, unknown>) as MochartInputConfig;
  const configDefaults = getDefaults(config);
  const configValidation = validateConfig(config, configDefaults);
  const mochartConfig = buildMochartConfig(config, configDefaults, configValidation);
  return mochartConfig;
}
