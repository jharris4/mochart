import type { PieConfig, SeriesConfig } from '../types/config';
import type { SeriesValueObject } from '../types/data';

export interface PieSliceAngles {
  /** Radians, clockwise from the top (d3 arc convention). */
  startAngle: number;
  endAngle: number;
  /** The slice's fraction of the summed (filtered) values. */
  fraction: number;
  /** The slice's clamped value. */
  value: number;
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Computes each slice's angles from the current (possibly mid-tween) filtered
 * values. Slices follow the series config order — never the focus draw order —
 * so focusing a slice cannot move it. Suppressed series (null plain values)
 * and non-positive values contribute nothing; a non-positive total yields an
 * empty map (no slices). Recomputing per sync from tweened values is what
 * animates the angles: adjacent slice edges share a normalized total, so they
 * can never separate mid-tween.
 */
export function getPieSliceAngles(seriesConfigs: SeriesConfig[], filteredValues: Record<string, SeriesValueObject>, pieConfig: PieConfig, groupIndex = 0): Record<string, PieSliceAngles> {
  let total = 0;
  const values = seriesConfigs.map(seriesConfig => {
    const valueObject = filteredValues[seriesConfig.id];
    const plain = valueObject !== undefined ? valueObject.plain : null;
    const value = plain !== null ? plain[groupIndex] : undefined;
    const clamped = typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
    total += clamped;
    return clamped;
  });

  const angles: Record<string, PieSliceAngles> = {};
  if (total <= 0) {
    return angles;
  }
  const startOffset = degreesToRadians(pieConfig.startAngle);
  // The slices divide the configured span (a full circle by default; e.g.
  // -90..90 makes a half/gauge pie). A negative span runs counterclockwise.
  const span = degreesToRadians(pieConfig.endAngle - pieConfig.startAngle);
  let cumulative = 0;
  seriesConfigs.forEach((seriesConfig, i) => {
    const value = values[i];
    const fraction = value / total;
    const startAngle = startOffset + cumulative * span;
    cumulative += fraction;
    angles[seriesConfig.id] = {
      startAngle,
      endAngle: startOffset + cumulative * span,
      fraction,
      value
    };
  });
  return angles;
}

/**
 * Scales every slice's angles toward the configured start angle for the
 * initial sweep-in animation: at `percentage` 0 all slices collapse onto the
 * starting edge, at 1 they are back at their computed angles. Fractions and
 * values are preserved (they drive labels and the center total).
 */
export function sweepPieSliceAngles(angles: Record<string, PieSliceAngles>, pieConfig: PieConfig, percentage: number): Record<string, PieSliceAngles> {
  if (percentage >= 1) {
    return angles;
  }
  const clamped = Math.max(percentage, 0);
  const startOffset = degreesToRadians(pieConfig.startAngle);
  const swept: Record<string, PieSliceAngles> = {};
  for (const id of Object.keys(angles)) {
    const sliceAngles = angles[id];
    swept[id] = {
      startAngle: startOffset + (sliceAngles.startAngle - startOffset) * clamped,
      endAngle: startOffset + (sliceAngles.endAngle - startOffset) * clamped,
      fraction: sliceAngles.fraction,
      value: sliceAngles.value
    };
  }
  return swept;
}
