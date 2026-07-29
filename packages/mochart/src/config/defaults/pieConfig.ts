import { AUTO, NONE, PIE_LABEL_TYPE_PERCENT } from '../core/constants';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

import type { PieConfig } from '../../types/config';

export default function getDefaults(config: Partial<PieConfig> = {}): Partial<PieConfig> {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as PieConfig));
  return { ...regularDefaults, ...conditionalDefaults } as Partial<PieConfig>;
}

export function getRegularDefaults() {
  return {
    innerRadiusPercent: 0,
    outerRadiusPercent: 1,
    startAngle: 0,
    padAngle: 0,
    cornerRadius: 0,
    focusOffsetPercent: 0,
    showLabels: false,
    labelType: PIE_LABEL_TYPE_PERCENT,
    labelFormat: AUTO,
    labelRadiusPercent: 0.5,
    labelMinAnglePercent: 0.05,
    centerLabel: NONE,
    showCenterTotal: false,
    centerTotalFormat: AUTO
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
