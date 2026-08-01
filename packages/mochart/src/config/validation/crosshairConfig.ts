import validators from './validators';

import { NONE } from '../core/constants';

export default function getValidators() {
  return {
    visible: validators.boolean(),
    applyFocus: validators.boolean(),
    showGroup: validators.boolean(),
    showSeries: validators.boolean(),
    lineColor: validators.svgColor(),
    lineOpacity: validators.opacity(),
    lineWidth: validators.numberMin(0),
    lineDashArray: validators.dashArray().orEqual(NONE),
    showBehindTooltip: validators.boolean()
  };
}