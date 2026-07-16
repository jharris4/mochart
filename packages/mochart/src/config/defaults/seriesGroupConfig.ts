import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

export default function getDefaults(config, index) {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults, index));

  return { ...regularDefaults, ...conditionalDefaults };
}

export function getRegularDefaults() {
  return {};
}

export function getConditionalDefaults(configWithRegularDefaults, index) {
  return {
    id: conditionalDefault([
      { condition: (config, index) => true, suffix: 'series group index', default: 'SG' + index, defaultText: 'SG${index}' },
      { ...defaultRule, default: 'SG' + index }
    ], configWithRegularDefaults, index)
  }
}