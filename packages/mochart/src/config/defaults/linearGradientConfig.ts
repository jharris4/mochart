import { deepMerge } from '../core/deepMerge';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { DeepPartial, LinearGradientConfig } from '../../types/config';

export default function getDefaults(config: DeepPartial<LinearGradientConfig> = {}, index: number): Partial<LinearGradientConfig> {
  const regularDefaults = getRegularDefaults();
  const configWithRegularDefaults = deepMerge(regularDefaults, config);
  const conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as LinearGradientConfig, index));

  return deepMerge(regularDefaults, conditionalDefaults) as Partial<LinearGradientConfig>;
}

export function getRegularDefaults() {
  return {
    ignore: false,
    x1: 0.0,
    x2: 1.0,
    y1: 0.0,
    y2: 1.0,
    rotation: 0
  };
};

export function getConditionalDefaults(configWithRegularDefaults: LinearGradientConfig, index: number) {
  return {
    id: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'linear gradient index', default: 'LG' + index, defaultText: 'LG${index}' },
      { ...defaultRule, default: 'LG' + index }
    ], configWithRegularDefaults, index)
  }
}
