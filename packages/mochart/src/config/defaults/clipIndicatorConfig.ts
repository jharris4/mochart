import { NONE, AUTO, COLOR_CURRENT } from '../core/constants';
import { resolveDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { DeepPartial, ClipIndicatorConfig } from '../../types/config';

export default function getDefaults(config: DeepPartial<ClipIndicatorConfig> = {}): Partial<ClipIndicatorConfig> {
  return resolveDefaults(getRegularDefaults(), getConditionalDefaults, config);
}

export function getRegularDefaults() {
  return {
    visible: true,
    size: AUTO,
    labelPadding: 2,
    label: 'Clipped',
    textStyle: { strokeColor: NONE, strokeOpacity: 0, strokeWidth: NONE, strokeDashArray: NONE, fillColor: COLOR_CURRENT, fillOpacity: 0.7 },
    hatch: { spacing: 6, lineWidth: 2 },
    front: true
  };
}

export function getConditionalDefaults(configWithRegularDefaults: ClipIndicatorConfig) {
  return {
    // a hatch needs a border and more weight to read; a solid band at the same weight is a slab
    style: conditionalDefault([
      { condition: ({ hatch }) => hatch !== NONE, suffix: 'when hatch is set',
        default: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.4, strokeWidth: 1, strokeDashArray: NONE, fillColor: COLOR_CURRENT, fillOpacity: 0.4 } },
      { condition: ({ hatch }) => hatch === NONE, suffix: 'when hatch is null',
        default: { strokeColor: NONE, strokeOpacity: 0, strokeWidth: NONE, strokeDashArray: NONE, fillColor: COLOR_CURRENT, fillOpacity: 0.15 } },
      { ...defaultRule,
        default: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.4, strokeWidth: 1, strokeDashArray: NONE, fillColor: COLOR_CURRENT, fillOpacity: 0.4 } }
    ], configWithRegularDefaults, undefined)
  };
}
