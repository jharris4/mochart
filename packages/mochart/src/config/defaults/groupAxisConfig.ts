import { AUTO, NONE, TYPE_STRING, SCALE_LINEAR, SCALE_ORDINAL, ELLIPSIS } from '../core/constants';
import { deepMerge } from '../core/deepMerge';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

import getAxisDefaults from './axisConfig';
import type { DeepPartial, GroupAxisConfig } from '../../types/config';

export default function getDefaults(config: DeepPartial<GroupAxisConfig> = {}, inverted: boolean, pieMode = false): Partial<GroupAxisConfig> {
  const regularDefaults = getRegularDefaults();
  const configWithRegularDefaults = deepMerge(regularDefaults, config);
  const conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as GroupAxisConfig, inverted, pieMode));

  return deepMerge(regularDefaults, conditionalDefaults) as Partial<GroupAxisConfig>;
}

export function getRegularDefaults() {
  return {
    ...getAxisDefaults(),

    dateUTC: true,

    displayProperty: NONE,

    focusRange: false,
    focusTickMarks: true,

    groupPaddingFraction: { inner: 0.1, outer: 0.1 },
    groupCountPadding: 1,

    minGroupValueExtent: 1,

    scale: SCALE_ORDINAL,

    tickLabelTruncationValue: ELLIPSIS,
    tickLabelTruncationMinLength: 0,
    tickLabelTruncationMaxFraction: 0.2,

    type: TYPE_STRING,

    valueFormat: AUTO,
    valueLabel: NONE,
    valuePrefix: NONE,
    valueSuffix: NONE
  };
}

export function getConditionalDefaults(configWithRegularDefaults: GroupAxisConfig, inverted: boolean, pieMode = false) {
  return {
    visible: conditionalDefault([
      { condition: () => pieMode, suffix: "when chartConfig.type is pie", default: false },
      { condition: () => !pieMode, suffix: "when chartConfig.type is xy", default: true },
      { ...defaultRule, default: true }
    ], configWithRegularDefaults, inverted),
    before: conditionalDefault([
      { condition: (_config, inverted) => inverted === true, suffix: "when plotConfig.inverted is true", default: true },
      { condition: (_config, inverted) => inverted === false, suffix: "when plotConfig.inverted is false", default: false },
      { ...defaultRule, default: false }
    ], configWithRegularDefaults, inverted),
    maxTickCount: conditionalDefault([
      { condition: ({ scale }, _inverted) => scale === SCALE_LINEAR, suffix: "when scale is linear", default: 10 },
      { condition: ({ scale }, _inverted) => scale === SCALE_ORDINAL, suffix: "when scale is ordinal", default: 0 },
      { ...defaultRule, default: 10 }
    ], configWithRegularDefaults, inverted),
    minTickSpacing: conditionalDefault([
      { condition: ({ scale }, _inverted) => scale === SCALE_LINEAR, suffix: "when scale is linear", default: 12 },
      { condition: ({ scale }, _inverted) => scale === SCALE_ORDINAL, suffix: "when scale is ordinal", default: 4 },
      { ...defaultRule, default: 10 }
    ], configWithRegularDefaults, inverted),
    tickLabelTruncationEnabled: conditionalDefault([
      { condition: ({ type }, _inverted) => type === TYPE_STRING, suffix: "when type is string", default: true },
      { condition: ({ type }, _inverted) => type !== TYPE_STRING, suffix: "when type is not string", default: false },
      { ...defaultRule, default: false }
    ], configWithRegularDefaults, inverted)
  };
}
