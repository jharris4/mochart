import { AUTO, PIE_LABEL_TYPE_PERCENT } from '../core/constants';

export default function getDefaults() {
  return {
    innerRadiusPercent: 0,
    outerRadiusPercent: 1,
    startAngle: 0,
    padAngle: 0,
    cornerRadius: 0,
    showLabels: false,
    labelType: PIE_LABEL_TYPE_PERCENT,
    labelFormat: AUTO,
    labelRadiusPercent: 0.5,
    labelMinAnglePercent: 0.05
  };
}
