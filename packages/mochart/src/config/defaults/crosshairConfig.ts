import { COLOR_CURRENT } from '../core/constants';

export default function getDefaults() {
  return {
    visible: true,
    applyFocus: true,
    showGroup: true,
    showSeries: true,
    lineColor: COLOR_CURRENT,
    lineOpacity: 0.3,
    lineWidth:  3,
    lineDashArray: '10, 5',
    showBehindTooltip: false
  };
}
