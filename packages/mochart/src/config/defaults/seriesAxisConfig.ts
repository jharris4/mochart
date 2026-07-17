import { NONE, TYPE_NUMBER, SCALE_LINEAR } from '../core/constants';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

import getAxisDefaults from './axisConfig';
import type { SeriesAxisConfig } from '../../types/config';

export default function getDefaults(config: Partial<SeriesAxisConfig> = {}, index: number, hasStack: boolean): Partial<SeriesAxisConfig> {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as SeriesAxisConfig, index, hasStack));
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

    type: TYPE_NUMBER,

    useSeriesFocus: true
  };
}

export function getConditionalDefaults(configWithRegularDefaults: SeriesAxisConfig, index: number, hasStack: boolean) {
  return {
    base: conditionalDefault([
      { condition: (config, index) => hasStack, suffix: 'series axis has stacks', default: 0, defaultText: '0' },
      { condition: (config, index) => !hasStack, suffix: 'series axis has no stacks', default: NONE, defaultText: NONE },
      { ...defaultRule, default: NONE }
    ], configWithRegularDefaults, index),
    id: conditionalDefault([
      { condition: (config, index) => true, suffix: 'series axis index', default: 'SA' + index, defaultText: 'SA${index}' },
      { ...defaultRule, default: 'SA' + index }
    ], configWithRegularDefaults, index),
    order: conditionalDefault([
      { condition: (config, index) => true, suffix: 'series axis index', default: index, defaultText: '${index}' },
      { ...defaultRule, default: index }
    ], configWithRegularDefaults, index)
  };
}
