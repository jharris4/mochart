import { NONE } from '../core/constants';
import { deepMerge } from '../core/deepMerge';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import { getRegularDefaults as getSeriesIconRegularDefaults } from './seriesIconConfig';

import type { DeepPartial, TooltipConfig } from '../../types/config';

export default function getDefaults(config: DeepPartial<TooltipConfig> = {}, pieMode = false): Partial<TooltipConfig> {
  const regularDefaults = getRegularDefaults();
  const configWithRegularDefaults = deepMerge(regularDefaults, config);
  const conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as TooltipConfig, pieMode));
  return deepMerge(regularDefaults, conditionalDefaults) as Partial<TooltipConfig>;
}

export function getRegularDefaults() {
  return {
    visible: true,
    applyFocus: true,
    followPointer: false,
    closeOnClick: true,
    filterSeriesOnClick: false,
    focusCategoryOnClick: false,
    focusSeriesOnClick: false,
    focusCategoryOnMouseOver: false,
    focusSeriesOnMouseOver: false,
    showControls: false,
    filterModeText: 'Filter',
    focusModeText: 'Focus',
    keepInside: false,
    padding: { top: 2, right: 2, bottom: 2, left: 2 },
    linePadding: 3,
    rightAlignValues: true,
    // Html, not svg: a null opacity leaves the color's own alpha alone, a named one is composited into it (utils/style cssStyleColor).
    backgroundStyle: { strokeColor: 'rgba(0,0,0,0.3)', strokeOpacity: NONE, strokeWidth: 2, fillColor: 'rgba(255,255,255,0.9)', fillOpacity: NONE },
    borderRadius: 4,
    dropShadowColor: 'rgba(0,0,0,0.3)',
    dropShadowOffsetX: 0,
    dropShadowOffsetY: 5,
    dropShadowBlurRadius: 10,
    // The series icons are svg even inside the html tooltip, so they take the legend icon defaults.
    ...getSeriesIconRegularDefaults(),
    showFilteringOnLabels: false,
    adjustForFiltering: true,
    adjustSizeForFiltering: false,
    hideFiltered: false,
    showMissingValues: true,
    filteredValueText: NONE,
    filteredValueCharacter: '-',
    missingValueText: 'N/A',
    rangeValueSeparator: ' - '
  };
}

export function getConditionalDefaults(configWithRegularDefaults: TooltipConfig, pieMode = false) {
  return {
    snapToCategory: conditionalDefault([
      { condition: () => pieMode, suffix: "when chart.type is pie", default: false },
      { condition: () => !pieMode, suffix: "when chart.type is xy", default: true },
      { ...defaultRule, default: true }
    ], configWithRegularDefaults, pieMode),
    showCategory: conditionalDefault([
      { condition: () => pieMode, suffix: "when chart.type is pie", default: false },
      { condition: () => !pieMode, suffix: "when chart.type is xy", default: true },
      { ...defaultRule, default: true }
    ], configWithRegularDefaults, pieMode)
  };
}
