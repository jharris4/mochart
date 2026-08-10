import { NONE, AUTO, COLOR_CURRENT } from '../core/constants';

export default function getDefaults() {
  return {
    inverted: false,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    clipOverflow: { top: 0, right: 0, bottom: 0, left: 0 },

    showClipIndicator: true,
    clipIndicatorSize: AUTO,
    clipIndicatorPadding: 2,
    clipIndicatorStyle: { strokeColor: NONE, strokeOpacity: 0, strokeWidth: NONE, strokeDashArray: NONE, fillColor: COLOR_CURRENT, fillOpacity: 0.15 },
    clipIndicatorFront: true,
    backgroundStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0, strokeWidth: NONE, strokeDashArray: NONE, fillColor: NONE, fillOpacity: 0 }
  };
}