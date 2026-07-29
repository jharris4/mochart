import type { PieConfig } from '../types/config';
import type { LayoutInfo } from '../types/layout';

export interface RadialLayoutInfo {
  /** The circle center x, relative to the series layout origin. */
  cx: number;
  /** The circle center y, relative to the series layout origin. */
  cy: number;
  innerRadius: number;
  outerRadius: number;
}

/** Centers the pie in the series rect and sizes the radii from its shorter side. */
export function getRadialLayoutInfo(seriesLayoutInfo: LayoutInfo, pieConfig: PieConfig): RadialLayoutInfo {
  const { width, height } = seriesLayoutInfo;
  const maxRadius = Math.max(Math.min(width, height) / 2, 0);
  const outerRadius = maxRadius * pieConfig.outerRadiusPercent;
  const innerRadius = outerRadius * pieConfig.innerRadiusPercent;
  return {
    cx: width / 2,
    cy: height / 2,
    innerRadius,
    outerRadius
  };
}
