import { COLOR_CURRENT } from '../core/constants';

export default function getDefaults() {
  return {
    visible: true,
    applyFocus: true,
    showCategory: true,
    showSeries: true,
    categoryLineStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.3, strokeWidth: 3, strokeDashArray: '10, 5' },
    seriesLineStyle: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.3, strokeWidth: 3, strokeDashArray: '10, 5' },
    showBehindTooltip: false
  };
}
