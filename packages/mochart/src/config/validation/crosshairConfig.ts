import validators from './validators';

import { NONE } from '../core/constants';

export default function getValidators() {
  return {
    visible: validators.boolean(),
    applyFocus: validators.boolean(),
    showCategory: validators.boolean(),
    showSeries: validators.boolean(),
    categoryLineStyle: validators.strokeStyle(),
    seriesLineStyle: validators.strokeStyle(),
    lineDashArray: validators.dashArray().orEqual(NONE),
    showBehindTooltip: validators.boolean()
  };
}