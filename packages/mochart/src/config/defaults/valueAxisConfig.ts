import { NONE, TYPE_NUMBER, SCALE_LINEAR, COLOR_CURRENT, COLOR_SAME } from '../core/constants';
import { deepMerge } from '../core/deepMerge';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

import getAxisDefaults from './axisConfig';
import type { DeepPartial, ValueAxisConfig } from '../../types/config';

export default function getDefaults(config: DeepPartial<ValueAxisConfig> = {}, index: number, hasStack: boolean, pieMode = false): Partial<ValueAxisConfig> {
  const regularDefaults = getRegularDefaults();
  const configWithRegularDefaults = deepMerge(regularDefaults, config);
  const conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as ValueAxisConfig, index, hasStack, pieMode));
  return deepMerge(regularDefaults, conditionalDefaults) as Partial<ValueAxisConfig>;
}

export function getRegularDefaults() {
  return {
    ...getAxisDefaults(),

    adjustForFiltering: false,
    adjustTickLabelSizeForFiltering: false,

    visibleWhenAllFiltered: true,

    baseLine: true,
    baseLineFront: false,
    baseLineWidth: 1,
    baseLineDashArray: NONE,
    baseLineStyle: {
      normal: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.65 },
      focused: { strokeColor: COLOR_SAME, strokeOpacity: 0.65 },
      defocused: { strokeColor: COLOR_SAME, strokeOpacity: 0.325 }
    },

    focusOnMouseOver: true,
    focusOnClick: false,

    maxMarginFraction: 0.05,
    minMarginFraction: 0.05,

    scale: SCALE_LINEAR,

    ticks: NONE,

    type: TYPE_NUMBER,

    useSeriesFocus: true
  };
}

export function getConditionalDefaults(configWithRegularDefaults: ValueAxisConfig, index: number, hasStack: boolean, pieMode = false) {
  return {
    visible: conditionalDefault([
      { condition: () => pieMode, suffix: "when chartConfig.type is pie", default: false },
      { condition: () => !pieMode, suffix: "when chartConfig.type is xy", default: true },
      { ...defaultRule, default: true }
    ], configWithRegularDefaults, index),
    base: conditionalDefault([
      // pie slices collapse to nothing when filtered, so their values must
      // animate to 0 — a domain-min base would strand the shrink partway
      { condition: () => pieMode, suffix: 'when chartConfig.type is pie', default: 0, defaultText: '0' },
      { condition: (_config, _index) => hasStack, suffix: 'series axis has stacks', default: 0, defaultText: '0' },
      { condition: (_config, _index) => !hasStack, suffix: 'series axis has no stacks', default: NONE, defaultText: NONE },
      { ...defaultRule, default: NONE }
    ], configWithRegularDefaults, index),
    id: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'value axis index', default: 'VA' + index, defaultText: 'VA${index}' },
      { ...defaultRule, default: 'VA' + index }
    ], configWithRegularDefaults, index),
    order: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series axis index', default: index, defaultText: '${index}' },
      { ...defaultRule, default: index }
    ], configWithRegularDefaults, index)
  };
}
