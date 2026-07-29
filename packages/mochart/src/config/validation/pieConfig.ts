import validators from './validators';
import { AUTO, PIE_LABEL_TYPES } from '../core/constants';

export default function getValidators() {
  return {
    innerRadiusPercent: validators.numberMinMax(0, 1),
    outerRadiusPercent: validators.numberMinMax(0, 1),
    startAngle: validators.number(),
    padAngle: validators.numberMin(0),
    cornerRadius: validators.numberMin(0),
    showLabels: validators.boolean(),
    labelType: validators.oneOf(PIE_LABEL_TYPES),
    labelFormat: validators.numberFormat().orEqual(AUTO),
    labelRadiusPercent: validators.numberMinMax(0, 1),
    labelMinAnglePercent: validators.numberMinMax(0, 1)
  };
}
