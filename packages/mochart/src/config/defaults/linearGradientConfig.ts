import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

export default function getDefaults(config, index) {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults, index));

  return { ...regularDefaults, ...conditionalDefaults };
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

export function getConditionalDefaults(configWithRegularDefaults, index) {
  return {
    id: conditionalDefault([
      { condition: (config, index) => true, suffix: 'linear gradient index', default: 'LG' + index, defaultText: 'LG${index}' },
      { ...defaultRule, default: 'LG' + index }
    ], configWithRegularDefaults, index)
  }
}