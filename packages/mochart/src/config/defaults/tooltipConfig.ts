import { NONE } from '../core/constants';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

import type { TooltipConfig } from '../../types/config';

export default function getDefaults(config: Partial<TooltipConfig> = {}, pieMode = false): Partial<TooltipConfig> {
  const regularDefaults = getRegularDefaults();
  const configWithRegularDefaults = { ...regularDefaults, ...config };
  const conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as TooltipConfig, pieMode));
  return { ...regularDefaults, ...conditionalDefaults } as Partial<TooltipConfig>;
}

export function getRegularDefaults() {
  return {
    visible: true,
    applyFocus: true,
    mouseOver: false,
    closeOnClick: true,
    filterOnSeriesClick: false,
    focusOnGroupClick: false,
    focusOnSeriesClick: false,
    focusOnGroupMouseOver: false,
    focusOnSeriesMouseOver: false,
    showControls: false,
    keepInside: false,
    minWidth: 120,
    padding: 2,
    linePadding: 3,
    alignValues: true,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(0,0,0,0.3)',
    borderWidth: 2,
    borderRadius: 4,
    dropShadowColor: 'rgba(0,0,0,0.3)',
    dropShadowOffsetX: 0,
    dropShadowOffsetY: 5,
    dropShadowBlurRadius: 10,
    showIconColors: true,
    showIconShapes: true,
    showIconPlaceholders: true,
    iconSize: 14,
    iconSpacerSize: 4,
    iconBorderSize: 1,
    iconBorderColor: '#999999',
    iconSuppressedColor: 'rgba(255,255,255,0)',
    iconUnsuppressedColor: 'rgba(0,0,0,0.5)',
    adjustForSuppression: true,
    adjustSizeForSuppression: false,
    hideSuppressed: false,
    showMissingValues: true,
    suppressedValueText: NONE,
    suppressedValueCharacter: '-',
    missingValueText: 'N/A',
    rangeValueText: ' - '
  };
}

export function getConditionalDefaults(configWithRegularDefaults: TooltipConfig, pieMode = false) {
  return {
    snapToGroup: conditionalDefault([
      { condition: () => pieMode, suffix: "when chartConfig.type is pie", default: false },
      { condition: () => !pieMode, suffix: "when chartConfig.type is xy", default: true },
      { ...defaultRule, default: true }
    ], configWithRegularDefaults, pieMode),
    showGroup: conditionalDefault([
      { condition: () => pieMode, suffix: "when chartConfig.type is pie", default: false },
      { condition: () => !pieMode, suffix: "when chartConfig.type is xy", default: true },
      { ...defaultRule, default: true }
    ], configWithRegularDefaults, pieMode)
  };
}
