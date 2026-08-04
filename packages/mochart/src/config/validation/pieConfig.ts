import validators from './validators';
import { AUTO, NONE, PIE_LABEL_TYPES, PIE_TOOLTIP_LABEL_TYPES } from '../core/constants';

export default function getValidators() {
  return {
    innerRadiusFraction: validators.numberMinMax(0, 1),
    outerRadiusFraction: validators.numberMinMax(0, 1),
    startAngle: validators.number(),
    endAngle: validators.number(),
    padAngle: validators.numberMin(0),
    cornerRadius: validators.numberMin(0),
    focusOffsetFraction: validators.numberMinMax(0, 1),
    showLabels: validators.boolean(),
    labelType: validators.oneOf(PIE_LABEL_TYPES),
    labelValueFormat: validators.numberFormat().orEqual(AUTO),
    labelPercentFormat: validators.numberFormat().orEqual(AUTO),
    labelRadiusFraction: validators.numberMinMax(0, 1),
    labelMinFraction: validators.numberMinMax(0, 1),
    adjustLabelsForFiltering: validators.boolean(),
    tooltipValues: validators.oneOf(PIE_TOOLTIP_LABEL_TYPES),
    tooltipPercentFormat: validators.numberFormat().orEqual(AUTO),
    centerLabel: validators.string().orEqual(NONE),
    centerLabelTextStyle: validators.style(),
    showCenterTotal: validators.boolean(),
    centerTotalTextStyle: validators.style(),
    centerTotalFormat: validators.numberFormat().orEqual(AUTO),
    adjustCenterTotalForFiltering: validators.boolean(),
    centerOffsetXFraction: validators.numberMinMax(-1, 1),
    centerOffsetYFraction: validators.numberMinMax(-1, 1)
  };
}
