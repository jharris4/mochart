import { getDefaults } from '../defaults/mochartConfig';
import { default as validateConfig } from '../validation/mochartConfig';
import { default as buildMochartConfig } from '../core/mochartConfig';
import type { MochartConfig, MochartInputConfig } from '../../types/config';

export function enhanceConfig(config: MochartInputConfig): MochartConfig {
  const configDefaults = getDefaults(config);
  const configValidation = validateConfig(config, configDefaults);
  const mochartConfig = buildMochartConfig(config, configDefaults, configValidation);
  return mochartConfig;
}
