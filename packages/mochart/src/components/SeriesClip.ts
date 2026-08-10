import { Renderer, svgEl } from '../render';

import { NONE } from '../config/core/constants';
import type { EnhancedMochartConfig } from '../types/enhanced';
import type { LayoutInfo } from '../types/layout';

interface SeriesClipProps {
  mochartConfig: EnhancedMochartConfig;
  seriesLayoutInfo: LayoutInfo;
  seriesClipPathUniqueId: string;
}

/**
 * Confines the series to the plot. An explicit axis `min`/`max` is a hard bound, so a value past
 * it would otherwise paint over the axes and the title.
 *
 * The rect is inflated by `getSeriesClipAllowance` so a mark sitting exactly *on* a bound is not
 * halved: margins are only applied to an `auto` end, so with an explicit bound (and with a domain
 * that meets its base) the data sits flush against the plot edge.
 */
export default class SeriesClip extends Renderer<SeriesClipProps> {
  root = svgEl('clipPath');
  rect = svgEl('rect');

  create() {
    this.root.append(this.rect);
    return this.root.node;
  }

  sync() {
    const { mochartConfig, seriesLayoutInfo, seriesClipPathUniqueId } = this.props;
    const allowance = getSeriesClipAllowance(mochartConfig);
    this.root.set({ id: seriesClipPathUniqueId });
    this.rect.set({
      x: seriesLayoutInfo.x - allowance,
      y: seriesLayoutInfo.y - allowance,
      width: Math.max(0, seriesLayoutInfo.width + allowance * 2),
      height: Math.max(0, seriesLayoutInfo.height + allowance * 2)
    });
  }
}

/**
 * How far past the plot the clip reaches, derived rather than configured: the largest configured
 * `markerSize`, which bounds every marker's half-extent because d3 sizes a symbol by area
 * (`markerSize * markerSize`) and `markerSize` is the top of the data-scaled range. 0 when the
 * chart draws no markers, so a bar chart clips exactly at the bound.
 */
export function getSeriesClipAllowance(mochartConfig: EnhancedMochartConfig): number {
  let allowance = 0;
  for (const seriesConfig of mochartConfig.series) {
    if (seriesConfig.markerShape !== NONE) {
      allowance = Math.max(allowance, seriesConfig.markerSize);
    }
  }
  return allowance;
}
