import { AUTO, NONE, PIE_LABEL_TYPE_PERCENT, PIE_LABEL_TYPE_VALUE, COLOR_CURRENT } from '../core/constants';
import { deepMerge } from '../core/deepMerge';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

import type { DeepPartial, PieConfig } from '../../types/config';

export default function getDefaults(config: DeepPartial<PieConfig> = {}): Partial<PieConfig> {
  const regularDefaults = getRegularDefaults();
  const configWithRegularDefaults = deepMerge(regularDefaults, config);
  const conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as PieConfig));
  return deepMerge(regularDefaults, conditionalDefaults) as Partial<PieConfig>;
}

export function getRegularDefaults() {
  return {
    innerRadiusFraction: 0,
    outerRadiusFraction: 1,
    startAngle: 0,
    padAngle: 0,
    cornerRadius: 0,
    focusOffsetFraction: 0,
    showLabels: false,
    labelType: PIE_LABEL_TYPE_PERCENT,
    labelValueFormat: AUTO,
    labelPercentFormat: AUTO,
    labelRadiusFraction: 0.5,
    labelMinFraction: 0.05,
    adjustLabelsForSuppression: true,
    tooltipValues: PIE_LABEL_TYPE_VALUE,
    tooltipPercentFormat: AUTO,
    centerLabel: NONE,
    centerLabelTextStyle: { strokeColor: NONE, strokeOpacity: NONE, strokeWidth: NONE, fillColor: COLOR_CURRENT, fillOpacity: NONE },
    showCenterTotal: false,
    centerTotalTextStyle: { strokeColor: NONE, strokeOpacity: NONE, strokeWidth: NONE, fillColor: COLOR_CURRENT, fillOpacity: NONE },
    centerTotalFormat: AUTO,
    adjustCenterTotalForSuppression: true,
    centerOffsetXFraction: 0,
    centerOffsetYFraction: 0
  };
}

export function getConditionalDefaults(configWithRegularDefaults: PieConfig) {
  // A full circle rotated by startAngle, so setting startAngle alone never
  // truncates the pie; an explicit endAngle makes a partial/gauge pie.
  const { startAngle } = configWithRegularDefaults;
  return {
    endAngle: conditionalDefault([
      { condition: () => true, suffix: 'a full circle from startAngle', default: startAngle + 360, defaultText: 'startAngle + 360' },
      { ...defaultRule, default: startAngle + 360 }
    ], configWithRegularDefaults, null)
  };
}
