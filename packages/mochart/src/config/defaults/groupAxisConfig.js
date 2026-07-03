import { AUTO, NONE, TYPE_STRING, SCALE_LINEAR, SCALE_ORDINAL, ELLIPSIS } from '../core/constants';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

import getAxisDefaults from './axisConfig';

export default function getDefaults(config, inverted) {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults, inverted));

  return { ...regularDefaults, ...conditionalDefaults };
}

export function getRegularDefaults() {
  return {
    ...getAxisDefaults(),

    dateUTC: true,

    displayProperty: NONE,

    focusRange: false,
    focusTickMarks: true,

    groupPadding: { inner: 0.1, outer: 0.1 },
    groupCountPadding: 1,

    minGroupValueExtent: 1,

    scale: SCALE_ORDINAL,

    tickLabelTruncationValue: ELLIPSIS,
    tickLabelTruncationMinLength: 0,
    tickLabelTruncationMaxPercent: 0.2,

    type: TYPE_STRING,

    valueFormat: AUTO,
    valueLabel: NONE,
    valuePrefix: NONE,
    valueSuffix: NONE
  };
}

export function getConditionalDefaults(configWithRegularDefaults, inverted) {
  return {
    before: conditionalDefault([
      { condition: (config, inverted) => inverted === true, suffix: "when plotConfig.inverted is true", default: true },
      { condition: (config, inverted) => inverted === false, suffix: "when plotConfig.inverted is false", default: false },
      { ...defaultRule, default: false }
    ], configWithRegularDefaults, inverted),
    maxTickCount: conditionalDefault([
      { condition: ({ scale }, inverted) => scale === SCALE_LINEAR, suffix: "when scale is linear", default: 10 },
      { condition: ({ scale }, inverted) => scale === SCALE_ORDINAL, suffix: "when scale is ordinal", default: 0 },
      { ...defaultRule, default: 10 }
    ], configWithRegularDefaults, inverted),
    minTickSpacing: conditionalDefault([
      { condition: ({ scale }, inverted) => scale === SCALE_LINEAR, suffix: "when scale is linear", default: 12 },
      { condition: ({ scale }, inverted) => scale === SCALE_ORDINAL, suffix: "when scale is ordinal", default: 4 },
      { ...defaultRule, default: 10 }
    ], configWithRegularDefaults, inverted),
    tickLabelTruncationEnabled: conditionalDefault([
      { condition: ({ type }, inverted) => type === TYPE_STRING, suffix: "when type is string", default: true },
      { condition: ({ type }, inverted) => type !== TYPE_STRING, suffix: "when type is not string", default: false },
      { ...defaultRule, default: false }
    ], configWithRegularDefaults, inverted)
  };
}