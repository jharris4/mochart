import { COLOR_CURRENT } from '../core/constants';

export default function getDefaults() {
  return {
    visible: true,
    applyFocus: true,
    categoryLine: {
      visible: true,
      style: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.3, strokeWidth: 3, strokeDashArray: '10, 5' }
    },
    seriesLine: {
      visible: true,
      style: { strokeColor: COLOR_CURRENT, strokeOpacity: 0.3, strokeWidth: 3, strokeDashArray: '10, 5' }
    },
    showBehindTooltip: false
  };
}
