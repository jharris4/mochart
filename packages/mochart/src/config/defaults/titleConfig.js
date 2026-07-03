import { NONE, POSITION_TOP, ALIGN_CENTER, VERTICAL_ALIGN_MIDDLE, ELLIPSIS } from '../core/constants';

export default function getDefaults() {
  return {
    title: NONE,
    position: POSITION_TOP,
    titlePrefix: NONE,
    titleSuffix: NONE,
    link: NONE,
    linkDisabled: false,
    truncationEnabled: true,
    truncationValue: ELLIPSIS,
    alignedToAxes: true,
    align: ALIGN_CENTER,
    verticalAlign: VERTICAL_ALIGN_MIDDLE,
    verticalExpand: false,
    margin: { top: 0, right: 0, bottom: 5, left: 0 },
    padding: { top: 0, right: 0, bottom: 5, left: 0 },
    textMargin: { top: 0, right: 0, bottom: 0, left: 0 },
    textPadding: { top: 0, right: 0, bottom: 0, left: 0 },
    prefixMargin: { top: 0, right: 5, bottom: 0, left: 0 },
    prefixPadding: { top: 0, right: 5, bottom: 0, left: 0 },
    suffixMargin: { top: 0, right: 0, bottom: 0, left: 5 },
    suffixPadding: { top: 0, right: 0, bottom: 0, left: 5 },
    backgroundStyle: { stroke: NONE, strokeOpacity: 0, strokeWidth: NONE, fill: NONE, fillOpacity: 0 },
    titleBackgroundStyle: { stroke: NONE, strokeOpacity: 0, strokeWidth: NONE, fill: NONE, fillOpacity: 0 },
    titleTextStyle: { stroke: NONE, strokeOpacity: NONE, strokeWidth: NONE, fill: NONE, fillOpacity: NONE },
    prefixBackgroundStyle: { stroke: NONE, strokeOpacity: 0, strokeWidth: NONE, fill: NONE, fillOpacity: 0 },
    prefixTextStyle: { stroke: NONE, strokeOpacity: NONE, strokeWidth: NONE, fill: NONE, fillOpacity: NONE },
    suffixBackgroundStyle: { stroke: NONE, strokeOpacity: 0, strokeWidth: NONE, fill: NONE, fillOpacity: 0 },
    suffixTextStyle: { stroke: NONE, strokeOpacity: NONE, strokeWidth: NONE, fill: NONE, fillOpacity: NONE }
  };
}