import { NONE, POSITION_TOP, ALIGN_CENTER, VERTICAL_ALIGN_MIDDLE, ELLIPSIS, COLOR_CURRENT } from '../core/constants';

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
    // 'none' rather than null on the text styles: stroke="none" firewalls a host-css stroke inheriting onto the text.
    backgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, fillColor: NONE, fillOpacity: 0 },
    titleBackgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, fillColor: NONE, fillOpacity: 0 },
    titleTextStyle: { strokeColor: 'none', strokeOpacity: NONE, strokeWidth: 0, fillColor: COLOR_CURRENT, fillOpacity: NONE },
    prefixBackgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, fillColor: NONE, fillOpacity: 0 },
    prefixTextStyle: { strokeColor: 'none', strokeOpacity: NONE, strokeWidth: 0, fillColor: COLOR_CURRENT, fillOpacity: NONE },
    suffixBackgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, fillColor: NONE, fillOpacity: 0 },
    suffixTextStyle: { strokeColor: 'none', strokeOpacity: NONE, strokeWidth: 0, fillColor: COLOR_CURRENT, fillOpacity: NONE }
  };
}