import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { LinearGradientConfig } from '../../types/config';

export default function getDefaults(config: Partial<LinearGradientConfig> = {}, index: number): Partial<LinearGradientConfig> {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as LinearGradientConfig, index));

  return { ...regularDefaults, ...conditionalDefaults } as Partial<LinearGradientConfig>;
}

export function getRegularDefaults() {
  return {
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
      { condition: (config, index) => true, suffix: 'linear gradient index', default: 'LG' + index, defaultText: 'LG${index}' },
      { ...defaultRule, default: 'LG' + index }
    ], configWithRegularDefaults, index)
  }
}
