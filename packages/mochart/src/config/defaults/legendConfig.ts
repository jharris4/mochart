import { AUTO, NONE, POSITION_BOTTOM, ALIGN_CENTER, ELLIPSIS } from '../core/constants';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';
import type { LegendConfig } from '../../types/config';

export default function getDefaults(config: Partial<LegendConfig> = {}, seriesCount: number): Partial<LegendConfig> {
  const regularDefaults = getRegularDefaults();
  const configWithRegularDefaults = { ...regularDefaults, ...config };
  const conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults as LegendConfig, seriesCount));

  return { ...regularDefaults, ...conditionalDefaults } as Partial<LegendConfig>;
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
    backgroundStyle: { stroke: NONE, strokeOpacity: 0, strokeWidth: NONE, fill: NONE, fillOpacity: 0 },
    itemMargin: { top: 1, right: 1, bottom: 1, left: 1 },
    itemPadding: { top: 1, right: 1, bottom: 1, left: 1 },
    itemBackgroundStyle: { stroke: NONE, strokeOpacity: 0, strokeWidth: NONE, fill: NONE, fillOpacity: 0 },
    showIconColors: true,
    showIconShapes: true,
    showIconPlaceholders: true,
    iconSize: AUTO,
    iconSpacerSize: 4,
    iconBorderSize: 1,
    iconBorderColor: '#999999',
    iconSuppressedColor: 'rgba(255,255,255,0)',
    iconUnsuppressedColor: 'rgba(0,0,0,0.5)',
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
