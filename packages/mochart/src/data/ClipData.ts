import { getCategoryDomainForValues } from './DomainData';
import { calculateValueAxisDomain } from './SeriesData';
import { AUTO, SCALE_ORDINAL } from '../config/core/constants';
import type { ChartData, ClippedEdges, DomainValue, NullableDomain } from '../types/data';
import type { EnhancedMochartConfig } from '../types/enhanced';

export const noClippedEdges: ClippedEdges = { top: false, right: false, bottom: false, left: false };

export function hasClippedEdge(clippedEdges: ClippedEdges): boolean {
  return clippedEdges.top || clippedEdges.right || clippedEdges.bottom || clippedEdges.left;
}

/**
 * Which plot edges have data hidden behind them, for the clip indicator.
 *
 * Compares what is *drawn* against what is *rendered*: the filtered series (a legend-filtered
 * series is hidden by the filter, not by the clip) against the axis domain the scale was built
 * from. `plot.clipOverflow` is deliberately not accounted for — it is opt-in, and honouring it
 * would couple this to layout for a case that already accepts a band/clip-edge mismatch.
 *
 * Runs per frame off the current chart data, so during an animation an edge reports clipped only
 * while an interpolated value is actually outside. Interpolation is monotonic per value, so an
 * edge changes state at most once per animation.
 */
export function getClippedEdges(mochartConfig: EnhancedMochartConfig, chartData: ChartData): ClippedEdges {
  const clippedEdges = { ...noClippedEdges };

  for (const valueAxisConfig of mochartConfig.valueAxes) {
    const renderedDomain = valueAxisConfig.adjustForFiltering
      ? chartData.seriesData.filtered.axisDomains[valueAxisConfig.id]
      : chartData.seriesData.raw.axisDomains[valueAxisConfig.id];
    // the drawn extent, recomputed rather than read: with both bounds explicit the axis domain
    // never calls its calculator, so no pre-bound extent is stored anywhere
    const drawnDomain = calculateValueAxisDomain(valueAxisConfig, chartData.seriesData.filtered.domains);
    setClippedEdges(clippedEdges, mochartConfig, valueAxisConfig, drawnDomain, renderedDomain, false);
  }

  const { categoryAxis: categoryAxisConfig } = mochartConfig;
  // an ordinal category axis validates min/max to "auto", so it can never clip
  if (categoryAxisConfig.scale !== SCALE_ORDINAL) {
    const drawnDomain = getCategoryDomainForValues(chartData.categoryData.values.parsed as readonly DomainValue[]);
    setClippedEdges(clippedEdges, mochartConfig, categoryAxisConfig, toNumericDomain(drawnDomain),
      toNumericDomain(chartData.categoryData.axisDomain), true);
  }

  return clippedEdges;
}

function setClippedEdges(clippedEdges: ClippedEdges, mochartConfig: EnhancedMochartConfig,
  axisConfig: { min: unknown; max: unknown; reversed: boolean }, drawnDomain: NullableDomain,
  renderedDomain: NullableDomain, isCategoryAxis: boolean): void {
  if (drawnDomain[0] === null || renderedDomain[0] === null || renderedDomain[1] === null) {
    return;
  }
  // only an explicit bound can clip: an auto end is computed from the data it would be hiding
  if (axisConfig.min !== AUTO && drawnDomain[0] < renderedDomain[0]) {
    clippedEdges[getClippedEdge(mochartConfig, axisConfig.reversed, isCategoryAxis, false)] = true;
  }
  if (axisConfig.max !== AUTO && drawnDomain[1]! > renderedDomain[1]) {
    clippedEdges[getClippedEdge(mochartConfig, axisConfig.reversed, isCategoryAxis, true)] = true;
  }
}

/**
 * Which screen edge an exceeded axis end lands on. `reversed` swaps the ends and `plot.inverted`
 * swaps each axis's orientation, and the two compose.
 *
 * Note the vertical cases differ by axis: a vertical *value* axis puts its maximum at the top,
 * while a vertical *category* axis runs top-to-bottom (that is what `plot.inverted` means), so its
 * maximum is at the bottom. Measured, not assumed. Both horizontal cases put the maximum right.
 */
function getClippedEdge(mochartConfig: EnhancedMochartConfig, reversed: boolean, isCategoryAxis: boolean,
  isMaxEnd: boolean): keyof ClippedEdges {
  const horizontal = isCategoryAxis ? !mochartConfig.plot.inverted : mochartConfig.plot.inverted;
  const atHighEnd = isMaxEnd !== reversed;
  if (horizontal) {
    return atHighEnd ? 'right' : 'left';
  }
  if (isCategoryAxis) {
    return atHighEnd ? 'bottom' : 'top';
  }
  return atHighEnd ? 'top' : 'bottom';
}

function toNumericDomain(domain: NullableDomain<DomainValue>): NullableDomain {
  return [numericBound(domain[0]), numericBound(domain[1])];
}

function numericBound(value: DomainValue | null): number | null {
  return value === null ? null : value instanceof Date ? value.getTime() : value;
}
