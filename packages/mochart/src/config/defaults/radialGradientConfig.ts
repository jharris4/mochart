import { deepMerge } from '../core/deepMerge';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { DeepPartial, RadialGradientConfig } from '../../types/config';

export default function getDefaults(config: DeepPartial<RadialGradientConfig> = {}, index: number): Partial<RadialGradientConfig> {
  const regularDefaults = getRegularDefaults();
  const configWithRegularDefaults = deepMerge(regularDefaults, config);
  const conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as RadialGradientConfig, index));

  return deepMerge(regularDefaults, conditionalDefaults) as Partial<RadialGradientConfig>;
}

export function getRegularDefaults() {
  return {
    cx: 0.5,
    cy: 0.5,
    fx: 0.5,
    fy: 0.5,
    r: 0.5,
    rotation: 0
  };
};

export function getConditionalDefaults(configWithRegularDefaults: RadialGradientConfig, index: number) {
  return {
    id: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'radial gradient index', default: 'RG' + index, defaultText: 'RG${index}' },
      { ...defaultRule, default: 'RG' + index }
    ], configWithRegularDefaults, index)
  }
}
