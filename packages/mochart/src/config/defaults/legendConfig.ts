import { AUTO, NONE, POSITION_BOTTOM, ALIGN_CENTER, ELLIPSIS, COLOR_CURRENT } from '../core/constants';
import { deepMerge } from '../core/deepMerge';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { DeepPartial, LegendConfig } from '../../types/config';

export default function getDefaults(config: DeepPartial<LegendConfig> = {}, seriesCount: number): Partial<LegendConfig> {
  const regularDefaults = getRegularDefaults();
  const configWithRegularDefaults = deepMerge(regularDefaults, config);
  const conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as LegendConfig, seriesCount));

  return deepMerge(regularDefaults, conditionalDefaults) as Partial<LegendConfig>;
}

export function getRegularDefaults() {
  return {
    position: POSITION_BOTTOM,
    truncationEnabled: true,
    truncationValue: ELLIPSIS,
    alignedToAxes: true,
    align: ALIGN_CENTER,
    margin: { top: 5, right: 0, bottom: 0, left: 0 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    backgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, fillColor: NONE, fillOpacity: 0 },
    itemMargin: { top: 1, right: 1, bottom: 1, left: 1 },
    itemPadding: { top: 1, right: 1, bottom: 1, left: 1 },
    itemBackgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, fillColor: NONE, fillOpacity: 0 },
    // 'none' rather than null: stroke="none" firewalls a host-css stroke inheriting onto the text.
    itemTextStyle: { strokeColor: 'none', strokeOpacity: NONE, strokeWidth: 0, fillColor: COLOR_CURRENT, fillOpacity: NONE },
    showIconColors: true,
    showIconShapes: true,
    showIconPlaceholders: true,
    iconSize: AUTO,
    iconSpacerSize: 4,
    iconBorderSize: 1,
    // The other two stay literal: they carry their own alpha, which 'currentColor' cannot.
    iconBorderColor: COLOR_CURRENT,
    iconBorderOpacity: 0.65,
    iconFilteredColor: 'rgba(255,255,255,0)',
    iconUnfilteredColor: 'rgba(0,0,0,0.5)',
    showFilteringOnLabels: false,
    focusOnMouseOver: true,
    focusOnClick: false,
    filterOnClick: true
  };
}

export function getConditionalDefaults(configWithRegularDefaults: LegendConfig, seriesCount: number) {
  return {
    visible: conditionalDefault([
      { condition: (_config, seriesCount) => seriesCount > 1, suffix: "when seriesConfigs.length is > 1", default: true },
      { condition: (_config, seriesCount) => seriesCount <= 1, suffix: "when seriesConfigs.length is <= 1", default: false },
      { ...defaultRule, default: false }
    ], configWithRegularDefaults, seriesCount)
  };
}
