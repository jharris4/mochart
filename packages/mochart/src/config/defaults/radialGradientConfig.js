import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

export default function getDefaults(config, index) {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults, index));

  return { ...regularDefaults, ...conditionalDefaults };
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

export function getConditionalDefaults(configWithRegularDefaults, index) {
  return {
    id: conditionalDefault([
      { condition: (config, index) => true, suffix: 'radial gradient index', default: 'RG' + index, defaultText: 'RG${index}' },
      { ...defaultRule, default: 'RG' + index }
    ], configWithRegularDefaults, index)
  }
}