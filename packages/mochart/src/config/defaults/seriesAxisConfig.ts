import { NONE, TYPE_NUMBER, SCALE_LINEAR } from '../core/constants';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

import getAxisDefaults from './axisConfig';
import type { SeriesAxisConfig } from '../../types/config';

export default function getDefaults(config: Partial<SeriesAxisConfig> = {}, index: number, hasStack: boolean, pieMode = false): Partial<SeriesAxisConfig> {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as SeriesAxisConfig, index, hasStack, pieMode));
  return { ...regularDefaults, ...conditionalDefaults } as Partial<SeriesAxisConfig>;
}

export function getRegularDefaults() {
  return {
    ...getAxisDefaults(),

    adjustForSuppression: false,
    adjustTickLabelSizeForSuppression: false,

    alwaysVisible: true,

    baseLine: true,
    baseLineFront: false,
    baseLineWidth: 1,
    baseLineDashArray: NONE,
    baseLineColor: '#000000',
    baseLineFocusedColor: '#000000',
    baseLineDefocusedColor: '#000000',
    baseLineOpacity: 1,
    baseLineFocusedOpacity: 1,
    baseLineDefocusedOpacity: 0.5,

    focusOnMouseOver: true,
    focusOnClick: false,

    maxMarginPercent: 0.05,
    minMarginPercent: 0.05,

    scale: SCALE_LINEAR,

    ticks: NONE,

    type: TYPE_NUMBER,

    useSeriesFocus: true
  };
}

export function getConditionalDefaults(configWithRegularDefaults: SeriesAxisConfig, index: number, hasStack: boolean, pieMode = false) {
  return {
    visible: conditionalDefault([
      { condition: () => pieMode, suffix: "when chartConfig.type is pie", default: false },
      { condition: () => !pieMode, suffix: "when chartConfig.type is xy", default: true },
      { ...defaultRule, default: true }
    ], configWithRegularDefaults, index),
    base: conditionalDefault([
      // pie slices collapse to nothing when suppressed, so their values must
      // animate to 0 — a domain-min base would strand the shrink partway
      { condition: () => pieMode, suffix: 'when chartConfig.type is pie', default: 0, defaultText: '0' },
      { condition: (_config, _index) => hasStack, suffix: 'series axis has stacks', default: 0, defaultText: '0' },
      { condition: (_config, _index) => !hasStack, suffix: 'series axis has no stacks', default: NONE, defaultText: NONE },
      { ...defaultRule, default: NONE }
    ], configWithRegularDefaults, index),
    id: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series axis index', default: 'SA' + index, defaultText: 'SA${index}' },
      { ...defaultRule, default: 'SA' + index }
    ], configWithRegularDefaults, index),
    order: conditionalDefault([
      { condition: (_config, _index) => true, suffix: 'series axis index', default: index, defaultText: '${index}' },
      { ...defaultRule, default: index }
    ], configWithRegularDefaults, index)
  };
}
