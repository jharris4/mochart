import { NONE } from '../core/constants';

import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

export default function getDefaults(config, index, soleSeriesAxisId) {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults, index, soleSeriesAxisId));

  return { ...regularDefaults, ...conditionalDefaults };
}

export function getRegularDefaults() {
  return {
    outerCapSize: 5,
    outerCapType: NONE,
    outerCapExpand: true,
  };
}

export function getConditionalDefaults(configWithRegularDefaults, index, soleSeriesAxisId) {
  return {
    id: conditionalDefault([
      { condition: (config, index) => true, suffix: 'series stack index', default: 'SS' + index, defaultText: 'SS${index}' },
      { ...defaultRule, default: 'SS' + index }
    ], configWithRegularDefaults, index),
    axis: conditionalDefault([
      { condition: (config, index) => true, suffix: 'series axis', default: soleSeriesAxisId === null ? void 0 : soleSeriesAxisId, defaultText: 'first axis id' },
      { ...defaultRule, default: soleSeriesAxisId === null ? void 0 : soleSeriesAxisId }
    ], configWithRegularDefaults, index),
  }
}