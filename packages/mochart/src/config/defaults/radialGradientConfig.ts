import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { RadialGradientConfig } from '../../types/config';

export default function getDefaults(config: Partial<RadialGradientConfig> = {}, index: number): Partial<RadialGradientConfig> {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as RadialGradientConfig, index));

  return { ...regularDefaults, ...conditionalDefaults } as Partial<RadialGradientConfig>;
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
