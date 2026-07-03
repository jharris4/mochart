import { NONE, POSITION_BOTTOM, ALIGN_CENTER, ELLIPSIS } from '../core/constants';
import { getActualDefaults, conditionalDefault, defaultRule } from './conditionalDefault';

export default function getDefaults(config, seriesCount) {
  let regularDefaults = getRegularDefaults();
  let configWithRegularDefaults = { ...regularDefaults, ...config };
  let conditionalDefaults = getActualDefaults(getConditionalDefaults(configWithRegularDefaults, seriesCount));

  return { ...regularDefaults, ...conditionalDefaults };
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
    iconSize: 14,
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

export function getConditionalDefaults(configWithRegularDefaults, seriesCount) {
  return {
    visible: conditionalDefault([
      { condition: (config, seriesCount) => seriesCount > 1, suffix: "when seriesConfigs.length is > 1", default: true },
      { condition: (config, seriesCount) => seriesCount <= 1, suffix: "when seriesConfigs.length is <= 1", default: false },
      { ...defaultRule, default: false }
    ], configWithRegularDefaults, seriesCount)
  };
}