import { degreesToRadians } from '../data/PieData';
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

interface UnitBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * The bounding box (in units of the outer radius) of the pie's configured
 * span: the center point, the span's two edge points on the outer circle, and
 * every cardinal extreme (top/right/bottom/left) the span crosses. A full
 * circle yields [-1, 1] on both axes.
 */
function getSpanUnitBounds(startAngle: number, endAngle: number): UnitBounds {
  const from = Math.min(startAngle, endAngle);
  const to = Math.max(startAngle, endAngle);
  if (to - from >= 360) {
    return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
  }
  // angle 0 is up, clockwise: (sin, -cos) in SVG coordinates
  const points: [number, number][] = [[0, 0]];
  for (const angle of [from, to]) {
    const radians = degreesToRadians(angle);
    points.push([Math.sin(radians), -Math.cos(radians)]);
  }
  for (let cardinal = Math.ceil(from / 90) * 90; cardinal <= to; cardinal += 90) {
    const radians = degreesToRadians(cardinal);
    points.push([Math.sin(radians), -Math.cos(radians)]);
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
}

/**
 * Fits the pie's configured span into the series rect: the span's bounding
 * box (a full square for a full circle, the top half for a -90..90 gauge) is
 * scaled to fill the rect and centered, so partial pies use the space their
 * missing slices would waste. The span comes from the config — never the
 * current slice angles — so the layout holds still while values (or the
 * initial sweep) animate.
 */
export function getRadialLayoutInfo(seriesLayoutInfo: LayoutInfo, pieConfig: PieConfig): RadialLayoutInfo {
  const { width, height } = seriesLayoutInfo;
  const bounds = getSpanUnitBounds(pieConfig.startAngle, pieConfig.endAngle);
  const unitWidth = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const unitHeight = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const maxRadius = Math.max(Math.min(width / unitWidth, height / unitHeight), 0);
  const outerRadius = maxRadius * pieConfig.outerRadiusFraction;
  const innerRadius = outerRadius * pieConfig.innerRadiusFraction;
  return {
    cx: width / 2 - outerRadius * (bounds.minX + bounds.maxX) / 2,
    cy: height / 2 - outerRadius * (bounds.minY + bounds.maxY) / 2,
    innerRadius,
    outerRadius
  };
}
